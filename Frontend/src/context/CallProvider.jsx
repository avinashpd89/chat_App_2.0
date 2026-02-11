import React, {
  createContext,
  useState,
  useRef,
  useEffect,
  useContext,
} from "react";
import { useSocketContext } from "./SocketContext";
import Peer from "simple-peer";
import { useAuth } from "./Authprovider";

import toast from "react-hot-toast";
import RingingSound from "../assets/Ringing.mp3";

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState(null);
  const [call, setCall] = useState({});
  const [isCalling, setIsCalling] = useState(false);
  const [isCallRejected, setIsCallRejected] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // Group call state
  const [isGroupCall, setIsGroupCall] = useState(false);
  const [groupCallRoom, setGroupCallRoom] = useState(null);
  const [peers, setPeers] = useState([]); // Array of { peerId, stream, name, userId }

  // Auth info for caller name
  const [authUser] = useAuth();
  const [targetUser, setTargetUser] = useState(null);

  const { socket } = useSocketContext();
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const audioRef = useRef();

  // Refs for checking state inside socket listeners (fixing stale closures)
  const streamRef = useRef(null);
  const peersRef = useRef({}); // Map of socketId -> Peer Object

  useEffect(() => {
    audioRef.current = new Audio(RingingSound);
    audioRef.current.loop = true;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    if (call.isReceivingCall && !callAccepted && !isCallRejected) {
      audioRef.current.play().catch((error) => {
        console.log("Audio play failed:", error);
      });
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [call.isReceivingCall, callAccepted, isCallRejected]);

  // Main Socket Listeners - Defined once to avoid re-binding issues
  useEffect(() => {
    if (!socket) return;

    const onCallUser = ({ from, name: callerName, signal, callType }) => {
      console.log(
        "Client received incoming call from:",
        callerName,
        from,
        "Type:",
        callType,
      );
      setCall({
        isReceivingCall: true,
        from,
        name: callerName,
        signal,
        callType,
      });
      setIsCallRejected(false);
      setCallAccepted(false);
      setCallEnded(false);
      setTargetUser(null);
    };

    const onCallAccepted = (signal) => {
      console.log("Call accepted signal received from peer");
      setCallAccepted(true);
      if (connectionRef.current) {
        console.log("Signaling peer with acceptance data");
        connectionRef.current.signal(signal);
      }
    };

    const onCallRejected = () => {
      console.log("Call was rejected by receiver");
      setIsCallRejected(true);
      toast.error("Call was rejected");
      setTimeout(() => {
        leaveCall();
      }, 2000);
    };

    const onCallEndedEvent = () => {
      console.log("Call ended event received from server");
      handleCallEnded();
    };

    // GROUP CALL LISTENERS
    const onGroupCallInvitation = ({
      roomId,
      callType,
      callerName,
      callerId,
      participants,
    }) => {
      console.log(
        `Received group call invitation from ${callerName} for room ${roomId}`,
      );
      setCall({
        isReceivingCall: true,
        isGroupCall: true,
        roomId,
        callType,
        name: callerName,
        from: callerId,
        participants,
      });
      setIsCallRejected(false);
      setCallAccepted(false);
      setCallEnded(false);
    };

    const onExistingParticipants = ({ participants }) => {
      console.log("Received existing participants:", participants);
      // Create peer connections to all existing participants
      participants.forEach((participant) => {
        createPeerConnection(
          participant.socketId,
          participant.userId,
          participant.name,
          true, // initiator
        );
      });
    };

    const onUserJoinedCall = ({ socketId, userId, name }) => {
      console.log(`User ${name} joined the call`);
      createPeerConnection(socketId, userId, name, false);
    };

    const onPeerSignal = ({ signal, callerId, callerName, socketId }) => {
      // console.log(`Received signal from peer ${callerName} (${socketId})`);
      const peer = peersRef.current[socketId];
      if (peer) {
        peer.signal(signal);
      } else {
        console.log(
          "Peer not found for signal, creating non-initiator peer",
          socketId,
        );
        createPeerConnection(socketId, callerId, callerName, false);
        // Then signal after a brief tick to ensure peer is created
        setTimeout(() => {
          if (peersRef.current[socketId])
            peersRef.current[socketId].signal(signal);
        }, 0);
      }
    };

    const onUserLeftCall = ({ socketId, userId }) => {
      console.log(`User left the call: ${socketId}`);
      // Remove peer connection
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].destroy();
        delete peersRef.current[socketId];
      }
      setPeers((prev) => prev.filter((p) => p.peerId !== socketId));
    };

    socket.on("callUser", onCallUser);
    socket.on("callAccepted", onCallAccepted);
    socket.on("callRejected", onCallRejected);
    socket.on("callEnded", onCallEndedEvent);
    socket.on("group-call-invitation", onGroupCallInvitation);
    socket.on("existing-participants", onExistingParticipants);
    socket.on("user-joined-call", onUserJoinedCall);
    socket.on("peer-signal", onPeerSignal);
    socket.on("user-left-call", onUserLeftCall);

    return () => {
      socket.off("callUser", onCallUser);
      socket.off("callAccepted", onCallAccepted);
      socket.off("callRejected", onCallRejected);
      socket.off("callEnded", onCallEndedEvent);
      socket.off("group-call-invitation", onGroupCallInvitation);
      socket.off("existing-participants", onExistingParticipants);
      socket.off("user-joined-call", onUserJoinedCall);
      socket.off("peer-signal", onPeerSignal);
      socket.off("user-left-call", onUserLeftCall);
    };
  }, [socket]);

  // Helper to create peer connection using REF for stream
  const createPeerConnection = (socketId, userId, name, initiator) => {
    if (!streamRef.current) {
      console.warn("No local stream available for peer connection to", name);
      return;
    }

    if (peersRef.current[socketId]) {
      console.log(`Peer connection to ${name} (${socketId}) already exists.`);
      return;
    }

    console.log(`Creating peer connection to ${name}, initiator: ${initiator}`);

    const peer = new Peer({
      initiator,
      trickle: false,
      stream: streamRef.current, // USE REF HERE
      config: iceConfig,
    });

    peer.on("signal", (signal) => {
      socket.emit("signal-to-peer", {
        targetSocketId: socketId,
        signal,
        callerId: authUser?.user?._id,
        callerName: authUser?.user?.name || "Unknown",
      });
    });

    peer.on("stream", (remoteStream) => {
      console.log(`Received stream from ${name}`);
      setPeers((prev) => {
        if (prev.some((p) => p.peerId === socketId)) {
          return prev.map((p) =>
            p.peerId === socketId ? { ...p, stream: remoteStream } : p,
          );
        }
        return [
          ...prev,
          { peerId: socketId, userId, name, stream: remoteStream },
        ];
      });
    });

    peer.on("connect", () => {
      console.log(`Peer connected: ${name}`);
    });

    peer.on("error", (err) => {
      console.error(`Peer error with ${name}:`, err);
    });

    peersRef.current[socketId] = peer;
  };

  const handleCallEnded = () => {
    console.log("Call ended handler triggered");
    setCallEnded(true);
    setIsCalling(false);
    setCallAccepted(false);
    setCall({});
    setIsCallRejected(false);
    setRemoteStream(null);
    setTargetUser(null);
    setIsGroupCall(false);
    setGroupCallRoom(null);
    setPeers([]);

    // Destroy all peer connections
    Object.values(peersRef.current).forEach((peer) => {
      if (peer) peer.destroy();
    });
    peersRef.current = {};

    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  };

  // Effect to safely attach remote stream when video element is ready
  useEffect(() => {
    if (remoteStream && userVideo.current) {
      userVideo.current.srcObject = remoteStream;
    }
  }, [remoteStream, callAccepted, callEnded]);

  // Effect to safely attach local stream when video element is ready
  useEffect(() => {
    if (stream && myVideo.current) {
      myVideo.current.srcObject = stream;
    }
  }, [stream, callAccepted, isCalling]);

  const iceConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  const startLocalStream = async (video = true) => {
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: true,
      });
      setStream(currentStream);
      streamRef.current = currentStream; // UPDATE REF

      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }
      return currentStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast.error("Could not access camera/microphone");
    }
  };

  const callUser = async (
    id,
    name,
    profilepic,
    video = true,
    members = null,
  ) => {
    // If members array is provided, this is a group call
    if (members && members.length > 0) {
      await startGroupCall(id, name, members, video);
      return;
    }

    // Regular 1-to-1 call
    console.log(
      "Initiating call to:",
      id,
      "Name:",
      name,
      "Type:",
      video ? "video" : "audio",
    );
    setIsCalling(true);
    setTargetUser(id);
    setCall({ ...call, name, profilepic, callType: video ? "video" : "audio" });
    const currentStream = await startLocalStream(video);
    if (!currentStream) {
      setIsCalling(false);
      return;
    }

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: currentStream,
      config: iceConfig,
    });

    peer.on("signal", (data) => {
      console.log("Emitting callUser signal to server");
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: socket.id,
        name: authUser?.user?.name || "Unknown",
        callType: video ? "video" : "audio",
      });
    });

    peer.on("stream", (remoteStream) => {
      console.log("Received remote stream (initiator side)", remoteStream);
      setRemoteStream(remoteStream);
    });

    peer.on("connect", () => {
      console.log("PEER CONNECTED (initiator)");
    });

    peer.on("error", (err) => {
      console.error("Peer error (initiator):", err);
    });

    connectionRef.current = peer;
  };

  const startGroupCall = async (groupId, groupName, members, video = true) => {
    console.log(
      `Starting group call for ${groupName}, type: ${video ? "video" : "audio"}`,
    );
    setIsCalling(true);
    setIsGroupCall(true);
    setGroupCallRoom(groupId);
    setCall({
      name: groupName,
      callType: video ? "video" : "audio",
      isGroupCall: true,
      roomId: groupId,
    });

    const currentStream = await startLocalStream(video);
    if (!currentStream) {
      setIsCalling(false);
      setIsGroupCall(false);
      return;
    }

    // Emit start-group-call event
    socket.emit("start-group-call", {
      roomId: groupId,
      userId: authUser?.user?._id,
      name: authUser?.user?.name || "Unknown",
      callType: video ? "video" : "audio",
      members: members.map((m) => m._id),
    });

    setCallAccepted(true); // For the initiator, call is "accepted" immediately
  };

  const joinGroupCall = async (roomId, callType) => {
    console.log(`Joining group call room ${roomId}`);
    setIsGroupCall(true);
    setGroupCallRoom(roomId);

    const isVideo = callType === "video";
    const currentStream = await startLocalStream(isVideo);
    if (!currentStream) {
      return;
    }

    setCallAccepted(true);

    // Emit join-group-call event
    socket.emit("join-group-call", {
      roomId,
      userId: authUser?.user?._id,
      name: authUser?.user?.name || "Unknown",
    });
  };

  const answerCall = async () => {
    if (call.isGroupCall) {
      // Join group call
      await joinGroupCall(call.roomId, call.callType);
      return;
    }

    // Regular 1-to-1 call
    const isVideo = call.callType === "video";
    console.log(
      "Answering call from:",
      call.from,
      "Type:",
      call.callType,
      "isVideo:",
      isVideo,
    );
    const currentStream = await startLocalStream(isVideo);
    setCallAccepted(true);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: currentStream,
      config: iceConfig,
    });

    peer.on("signal", (data) => {
      console.log("Emitting answerCall signal to server");
      socket.emit("answerCall", { signal: data, to: call.from });
    });

    peer.on("stream", (remoteStream) => {
      console.log("Received remote stream (receiver side)", remoteStream);
      setRemoteStream(remoteStream);
    });

    peer.on("connect", () => {
      console.log("PEER CONNECTED (receiver)");
    });

    peer.on("error", (err) => {
      console.error("Peer error (receiver):", err);
    });

    peer.signal(call.signal);
    connectionRef.current = peer;
  };

  const rejectCall = () => {
    if (call.from) {
      socket.emit("rejectCall", { to: call.from });
    }
    setCallEnded(true);
    setCall({});
    setIsCalling(false);
    setCallAccepted(false);
  };

  const leaveCall = () => {
    if (isGroupCall && groupCallRoom) {
      // Leave group call
      socket.emit("leave-group-call", {
        roomId: groupCallRoom,
        userId: authUser?.user?._id,
      });
    } else {
      // Leave 1-to-1 call
      const endCallTarget = call.from || targetUser;
      if (endCallTarget) {
        socket.emit("endCall", { to: endCallTarget });
      }
    }

    handleCallEnded();
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <CallContext.Provider
      value={{
        call,
        callAccepted,
        myVideo,
        userVideo,
        stream,
        callEnded,
        isCalling,
        callUser,
        leaveCall,
        answerCall,
        rejectCall,
        isCallRejected,
        toggleMic,
        toggleCamera,
        isMuted,
        isCameraOff,
        // Group call additions
        isGroupCall,
        peers,
        startGroupCall,
      }}>
      {children}
    </CallContext.Provider>
  );
};
