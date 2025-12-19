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

  // Auth info for caller name
  const [authUser] = useAuth();
  const [targetUser, setTargetUser] = useState(null);

  const { socket } = useSocketContext();
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const audioRef = useRef();

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

  // Stable Socket Listeners
  useEffect(() => {
    if (!socket) return;

    const onCallUser = ({ from, name: callerName, signal }) => {
      console.log("Client received incoming call from:", callerName, from);
      setCall({ isReceivingCall: true, from, name: callerName, signal });
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
      } else {
        console.warn("Connection ref is null when callAccepted received");
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

    socket.on("callUser", onCallUser);
    socket.on("callAccepted", onCallAccepted);
    socket.on("callRejected", onCallRejected);
    socket.on("callEnded", onCallEndedEvent);

    return () => {
      socket.off("callUser", onCallUser);
      socket.off("callAccepted", onCallAccepted);
      socket.off("callRejected", onCallRejected);
      socket.off("callEnded", onCallEndedEvent);
    };
  }, [socket]); // Only depend on socket

  const handleCallEnded = () => {
    console.log("Call ended handler triggered");
    setCallEnded(true);
    setIsCalling(false);
    setCallAccepted(false);
    setCall({});
    setRemoteStream(null);
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Effect to safely attach remote stream when video element is ready
  useEffect(() => {
    if (remoteStream && userVideo.current) {
      console.log("Attaching remote stream to video element");
      userVideo.current.srcObject = remoteStream;
    }
  }, [remoteStream, callAccepted]);

  const iceConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
    ],
  };

  const startLocalStream = async (video = true) => {
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: true,
      });
      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }
      return currentStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert("Could not access camera/microphone");
    }
  };

  const callUser = async (id, video = true) => {
    console.log("Initiating call to:", id);
    setIsCalling(true);
    setTargetUser(id);
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

  const answerCall = async () => {
    console.log("Answering call from:", call.from);
    const currentStream = await startLocalStream(true);
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
    const endCallTarget = call.from || targetUser;

    if (endCallTarget) {
      socket.emit("endCall", { to: endCallTarget });
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
      }}>
      {children}
    </CallContext.Provider>
  );
};
