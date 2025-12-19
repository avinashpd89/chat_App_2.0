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

  useEffect(() => {
    if (socket) {
      socket.on("callUser", ({ from, name: callerName, signal }) => {
        console.log("Client received incoming call from:", callerName);
        setCall({ isReceivingCall: true, from, name: callerName, signal });
      });

      socket.on("callRejected", () => {
        console.log("Call was rejected by receiver");
        setIsCallRejected(true);
        toast.error("Call was rejected");
        setTimeout(() => {
          leaveCall();
        }, 2000);
      });

      socket.on("callEnded", () => {
        console.log("Call ended by other user");
        setCallEnded(true);
        setIsCalling(false);
        setCallAccepted(false);
        setCall({});
        if (connectionRef.current) {
          connectionRef.current.destroy();
        }
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          setStream(null);
        }
        window.location.reload();
      });
    }
  }, [socket]);

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
    setTargetUser(id); // Store who we are calling
    const currentStream = await startLocalStream(video);
    if (!currentStream) {
      setIsCalling(false);
      return;
    }

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: currentStream,
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
      console.log("Received remote stream");
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
      }
    });

    socket.on("callAccepted", (signal) => {
      console.log("Call accepted signal received");
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = async () => {
    const currentStream = await startLocalStream(true); // Default answer with video for now, or check call type?
    setCallAccepted(true);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: currentStream,
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: call.from });
    });

    peer.on("stream", (remoteStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
      }
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
    // window.location.reload();
    // Better to reset state manully or leaveCall:
    setIsCalling(false);
    setCallAccepted(false);
  };

  const leaveCall = () => {
    // Notify the other user
    // call.from contains the socket ID if we received the call.
    // targetUser contains the User ID if we initiated the call.
    const endCallTarget = call.from || targetUser;

    if (endCallTarget) {
      socket.emit("endCall", { to: endCallTarget });
    }

    setCallEnded(true);
    setIsCalling(false);
    setCallAccepted(false);
    setCall({});

    if (connectionRef.current) {
      connectionRef.current.destroy();
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    // Reloading page is often the easiest reset for simple-peer state in simple apps,
    // but we'll try to reset state gracefully.
    window.location.reload();
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
      }}>
      {children}
    </CallContext.Provider>
  );
};
