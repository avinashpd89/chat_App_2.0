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
    isGroupCall,
    peers,
  } = useCall();

  // Only render if there is an active interaction
  if (!call.isReceivingCall && !isCalling) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 text-white">
      {/* Outgoing Call - Ringing */}
      {isCalling && !callAccepted && (
        <div className="text-center flex flex-col items-center">
          <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-2xl border-4 border-primary/20 overflow-hidden">
            {call.profilepic ? (
              <img
                src={call.profilepic}
                alt={call.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-6xl font-bold text-primary">
                {call.name?.charAt(0) || "U"}
              </span>
            )}
          </div>
          <h2 className="text-3xl font-bold mb-2">{call.name}</h2>
          <p className="text-xl mb-8 text-gray-400">
            {isCallRejected
              ? "Call Rejected"
              : isGroupCall
                ? "Starting call..."
                : "Calling..."}
          </p>
          {/* Local Video Preview - Only for Video Calls */}
          {call.callType === "video" && (
            <div className="w-64 h-48 bg-gray-800 rounded-lg overflow-hidden mb-8 shadow-lg">
              <video
                playsInline
                muted
                ref={myVideo}
                autoPlay
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {call.callType === "audio" && (
            <div className="w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-xl ring-4 ring-primary/30">
              <MdMic className="text-6xl text-primary" />
            </div>
          )}
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
          <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-primary/20 overflow-hidden">
            {call.profilepic ? (
              <img
                src={call.profilepic}
                alt={call.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-6xl font-bold text-primary">
                {call.name?.charAt(0) || "U"}
              </span>
            )}
          </div>
          <h2 className="text-3xl mb-2 font-bold">{call.name}</h2>
          <p className="mb-8 text-gray-300">
            Incoming {call.isGroupCall ? "Group " : ""}
            {call.callType === "video" ? "Video" : "Audio"} Call...
          </p>
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

      {/* Active Call - Group or 1-to-1 */}
      {callAccepted && !callEnded && (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
          {isGroupCall ? (
            // GROUP CALL UI - Grid Layout
            <div className="w-full h-full flex flex-col">
              <div
                className="flex-1 grid gap-2 md:gap-4 p-2 md:p-4 auto-rows-fr"
                style={{
                  maxHeight: "calc(100vh - 180px)",
                  gridTemplateColumns:
                    peers.length === 0
                      ? "1fr"
                      : peers.length + 1 === 2
                        ? "repeat(2, 1fr)"
                        : peers.length + 1 === 3
                          ? "repeat(2, 1fr)" // Change to 2 columns for 3 people
                          : peers.length + 1 <= 4
                            ? "repeat(2, 1fr)"
                            : peers.length + 1 <= 6
                              ? "repeat(3, 1fr)"
                              : "repeat(4, 1fr)",
                  gridAutoRows: "minmax(0, 1fr)",
                }}>
                {/* Local Video */}
                <div
                  className="relative bg-gray-900 rounded-lg overflow-hidden shadow-xl border border-gray-700 aspect-video md:aspect-auto md:h-full"
                  style={{ minHeight: "120px" }}>
                  {call.callType === "video" ? (
                    <video
                      playsInline
                      muted
                      ref={myVideo}
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MdMic className="text-5xl text-primary" />
                        </div>
                        <p className="text-white font-semibold">You</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded-full text-sm">
                    You {isMuted && "🔇"} {isCameraOff && "📷"}
                  </div>
                </div>

                {/* Remote Participants */}
                {peers.map((peer, index) => {
                  const isThirdInThree = peers.length + 1 === 3 && index === 1;
                  return (
                    <div
                      key={peer.peerId}
                      className={`relative bg-gray-900 rounded-lg overflow-hidden shadow-xl border border-gray-700 aspect-video md:aspect-auto md:h-full ${isThirdInThree ? "col-span-2 w-1/2 mx-auto" : ""}`}
                      style={{ minHeight: "120px" }}>
                      <video
                        playsInline
                        autoPlay
                        ref={(el) => {
                          if (el && peer.stream) {
                            el.srcObject = peer.stream;
                          }
                        }}
                        className={`w-full h-full object-cover ${call.callType === "audio" ? "hidden" : ""}`}
                      />
                      {call.callType === "audio" && (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <div className="text-center">
                            <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                              <span className="text-4xl font-bold text-primary">
                                {peer.name?.charAt(0) || "U"}
                              </span>
                            </div>
                            <p className="text-white font-semibold">
                              {peer.name}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded-full text-sm">
                        {peer.name}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Controls */}
              <div className="mt-6 flex space-x-6 items-center justify-center pb-4">
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

                {call.callType === "video" && (
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
                )}

                <button
                  onClick={leaveCall}
                  className="btn btn-error text-white rounded-full px-8 h-12 flex items-center gap-2">
                  <MdCallEnd className="text-xl" /> End Call
                </button>
              </div>
            </div>
          ) : (
            // 1-TO-1 CALL UI
            <div className="w-full max-w-6xl h-[85vh] bg-black rounded-lg overflow-hidden flex items-center justify-center shadow-2xl border border-gray-800">
              {/* Remote Stream - Always rendered to ensure sound plays */}
              <video
                playsInline
                ref={userVideo}
                autoPlay
                className={`w-full h-full object-contain ${
                  call.callType === "audio" ? "hidden" : ""
                }`}
              />

              {/* Audio Placeholder UI */}
              {call.callType === "audio" && (
                <div className="flex flex-col items-center">
                  <div className="w-48 h-48 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-primary/20 overflow-hidden">
                    {call.profilepic ? (
                      <img
                        src={call.profilepic}
                        alt={call.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-8xl font-bold text-primary">
                        {call.name?.charAt(0) || "U"}
                      </span>
                    )}
                  </div>
                  <h3 className="text-3xl font-semibold">{call.name}</h3>
                  <p className="text-primary mt-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-ping"></span>
                    In Audio Call...
                  </p>
                </div>
              )}

              {/* Local Video - Picture in Picture (Only for video calls) */}
              {call.callType === "video" && (
                <div className="absolute top-4 right-4 w-64 h-48 bg-gray-900 shadow-xl border-2 border-gray-700 rounded-xl overflow-hidden">
                  <video
                    playsInline
                    muted
                    ref={myVideo}
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Controls for 1-to-1 call */}
          {!isGroupCall && (
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

              {call.callType === "video" && (
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
              )}

              <button
                onClick={leaveCall}
                className="btn btn-error text-white rounded-full px-8 h-12 flex items-center gap-2">
                <MdCallEnd className="text-xl" /> End Call
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CallInterface;
