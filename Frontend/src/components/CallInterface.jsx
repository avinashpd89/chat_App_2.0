import React from "react";
import { useCall } from "../context/CallProvider";
import {
  MdCallEnd,
  MdCall,
  MdMic,
  MdMicOff,
  MdVideocam,
  MdVideocamOff,
} from "react-icons/md";

const CallInterface = () => {
  const {
    call,
    callAccepted,
    myVideo,
    userVideo,
    stream,
    name,
    callEnded,
    leaveCall,
    answerCall,
    isCalling,
    rejectCall,
    isCallRejected,
    toggleMic,
    toggleCamera,
    isMuted,
    isCameraOff,
  } = useCall();

  // Only render if there is an active interaction
  if (!call.isReceivingCall && !isCalling) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black bg-opacity-95 text-white">
      {/* Outgoing Call - Ringing */}
      {isCalling && !callAccepted && (
        <div className="text-center flex flex-col items-center">
          <h2 className="text-2xl mb-6">
            {isCallRejected ? "Call Rejected" : "Calling..."}
          </h2>
          {/* Local Video Preview */}
          <div className="w-64 h-48 bg-gray-800 rounded-lg overflow-hidden mb-8 shadow-lg">
            <video
              playsInline
              muted
              ref={myVideo}
              autoPlay
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={leaveCall}
            className="btn btn-error btn-circle btn-lg text-white">
            <MdCallEnd className="text-3xl" />
          </button>
        </div>
      )}

      {/* Incoming Call Notification */}
      {call.isReceivingCall && !callAccepted && !isCalling && (
        <div className="text-center flex flex-col items-center bg-gray-800 p-10 rounded-2xl shadow-2xl">
          <h2 className="text-3xl mb-2 font-bold">{call.name}</h2>
          <p className="mb-8 text-gray-300">Incoming Video Call...</p>
          <div className="flex space-x-8">
            <button
              onClick={answerCall}
              className="btn btn-success btn-circle btn-lg text-white animate-pulse">
              <MdCall className="text-3xl" />
            </button>
            <button
              onClick={rejectCall}
              className="btn btn-error btn-circle btn-lg text-white">
              <MdCallEnd className="text-3xl" />
            </button>
          </div>
        </div>
      )}

      {/* Active Video Call */}
      {callAccepted && !callEnded && (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-6xl h-[85vh] bg-black rounded-lg overflow-hidden flex items-center justify-center shadow-2xl border border-gray-800">
            {/* Remote Video - Main Screen */}
            <video
              playsInline
              ref={userVideo}
              autoPlay
              className="w-full h-full object-contain"
            />

            {/* Local Video - Picture in Picture */}
            <div className="absolute top-4 right-4 w-64 h-48 bg-gray-900 shadow-xl border-2 border-gray-700 rounded-xl overflow-hidden">
              <video
                playsInline
                muted
                ref={myVideo}
                autoPlay
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="mt-6 flex space-x-6 items-center">
            <button
              onClick={toggleMic}
              className={`btn btn-circle btn-lg ${
                isMuted ? "btn-error" : "btn-neutral"
              }`}>
              {isMuted ? (
                <MdMicOff className="text-2xl" />
              ) : (
                <MdMic className="text-2xl" />
              )}
            </button>

            <button
              onClick={toggleCamera}
              className={`btn btn-circle btn-lg ${
                isCameraOff ? "btn-error" : "btn-neutral"
              }`}>
              {isCameraOff ? (
                <MdVideocamOff className="text-2xl" />
              ) : (
                <MdVideocam className="text-2xl" />
              )}
            </button>

            <button
              onClick={leaveCall}
              className="btn btn-error text-white rounded-full px-8 h-12 flex items-center gap-2">
              <MdCallEnd className="text-xl" /> End Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallInterface;
