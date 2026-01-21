import { useState, useRef, useEffect } from "react";
import useDeleteMessage from "../../context/useDeleteMessage";
import { MdDelete } from "react-icons/md";
import { HiDocumentText } from "react-icons/hi";
import useConversation from "../../zustand/useConversation.js";
import Avatar from "../../assets/avatar.jpg";

function Message({ message }) {
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const deleteMenuRef = useRef(null);
  const authUser = JSON.parse(localStorage.getItem("ChatApp"));
  const { selectedConversation } = useConversation();
  const itsMe = message.senderId === authUser.user._id;
  const chatName = itsMe ? "chat-end" : "chat-start";
  const chatColor = itsMe
    ? "bg-blue-500 text-white"
    : "bg-base-100 text-base-content border border-base-300";
  const { deleteMessage, loading: isDeleting } = useDeleteMessage();

  // Find sender info if it's a group chat and not me
  const isGroup = selectedConversation?.isGroup;
  let senderInfo = null;

  if (isGroup && !itsMe) {
    senderInfo = selectedConversation.members.find(
      (member) => member._id.toString() === message.senderId.toString(),
    );
  }

  const createdAt = new Date(message.createdAt);
  const formattedTime = createdAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Close delete menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        deleteMenuRef.current &&
        !deleteMenuRef.current.contains(event.target)
      ) {
        setShowDeleteOptions(false);
      }
    };
    if (showDeleteOptions) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDeleteOptions]);

  const renderMessageContent = (text, isMe) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        const href = part.startsWith("www.") ? `http://${part}` : part;
        const linkColor = isMe
          ? "text-white underline font-medium"
          : "text-blue-500 hover:underline";
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkColor}
            onClick={(e) => e.stopPropagation()}>
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const parseDocument = (msg) => {
    if (msg.startsWith("filename:")) {
      const parts = msg.split("|");
      const name = parts[0].replace("filename:", "");
      const data = parts.slice(1).join("|");
      return { name, data };
    }
    return { name: "Document", data: msg };
  };

  const isDeleted = message.isDeletedForEveryone;

  // Generate a consistent color for the user name based on their ID
  const getUserColor = (userId) => {
    const colors = [
      "text-red-500",
      "text-green-500",
      "text-yellow-500",
      "text-purple-500",
      "text-pink-500",
      "text-indigo-500",
      "text-teal-500",
      "text-orange-500",
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div>
      <div className="p-4 group">
        <div className={`chat ${chatName} min-w-0 relative`}>
          {/* Profile Picture for Group Messages (Incoming) */}
          {isGroup && !itsMe && (
            <div className="chat-image avatar">
              <div className="w-10 rounded-full">
                <img alt="Profile" src={senderInfo?.profilepic || Avatar} />
              </div>
            </div>
          )}

          {/* Group Header: Sender Name */}
          {isGroup && !itsMe && (
            <div className="chat-header mb-1 text-xs font-bold">
              <span
                className={senderInfo?._id ? getUserColor(senderInfo._id) : ""}>
                {senderInfo?.name || "Unknown"}
              </span>
            </div>
          )}

          <div
            className={`chat-bubble ${chatColor} break-words max-w-[90%] md:max-w-[70%] relative z-10 ${
              message.messageType === "image" ||
              message.messageType === "video" ||
              message.messageType === "document" ||
              message.message.startsWith("data:image") ||
              message.message.startsWith("data:video")
                ? "p-0 overflow-hidden"
                : "p-3"
            }`}>
            {isDeleted ? (
              <div className="flex items-center gap-2 p-3">
                <MdDelete className="opacity-50" />
                <span className="opacity-50 italic text-sm">
                  [Message deleted]
                </span>
              </div>
            ) : message.messageType === "image" &&
              message.message?.startsWith("data:image") ? (
              <img
                src={message.message}
                alt="sent image"
                className="max-w-full rounded-lg"
              />
            ) : message.messageType === "video" &&
              message.message?.startsWith("data:video") ? (
              <video
                src={message.message}
                controls
                className="max-w-full rounded-lg"
              />
            ) : message.messageType === "document" ? (
              (() => {
                const doc = parseDocument(message.message);
                return (
                  <div className="p-3 flex items-center gap-3 bg-base-300/20 hover:bg-base-300/40 transition-colors">
                    <div className="p-2 bg-primary/20 rounded-lg text-primary">
                      <HiDocumentText size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate mb-1">
                        {doc.name}
                      </p>
                      <a
                        href={doc.data}
                        download={doc.name}
                        className="text-[10px] uppercase font-bold tracking-wider text-primary hover:underline cursor-pointer"
                        onClick={(e) => e.stopPropagation()}>
                        Download
                      </a>
                    </div>
                  </div>
                );
              })()
            ) : message.messageType === "text" ? (
              renderMessageContent(message.message, itsMe)
            ) : (
              // Fallback for failed decryptions or invalid data
              <div className="p-3 italic text-sm opacity-70">
                {message.message || "[Empty Message]"}
              </div>
            )}
          </div>
          <div className="chat-footer flex items-center gap-2 mt-1">
            <span className="text-[10px] opacity-50">{formattedTime}</span>
            <button
              onClick={() => setShowDeleteOptions(true)}
              className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded-full"
              title="Delete message">
              <MdDelete size={16} />
            </button>

            {showDeleteOptions && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div
                  className="bg-base-300 w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 text-center border-b border-white/5">
                    <h3 className="font-bold text-lg mb-1">Delete Message?</h3>
                    <p className="text-sm opacity-60">
                      This action cannot be undone.
                    </p>
                  </div>
                  <div className="p-2 flex flex-col gap-1">
                    {itsMe && !isDeleted && (
                      <button
                        onClick={() => {
                          deleteMessage(message._id, "everyone");
                          setShowDeleteOptions(false);
                        }}
                        className="w-full py-3.5 px-4 text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors rounded-2xl flex items-center justify-center gap-2"
                        disabled={isDeleting}>
                        Delete for everyone
                      </button>
                    )}
                    <button
                      onClick={() => {
                        deleteMessage(message._id, "me");
                        setShowDeleteOptions(false);
                      }}
                      className="w-full py-3.5 px-4 text-sm font-bold hover:bg-white/5 transition-colors rounded-2xl"
                      disabled={isDeleting}>
                      Delete for me
                    </button>
                    <div className="h-[1px] bg-white/5 my-1" />
                    <button
                      onClick={() => setShowDeleteOptions(false)}
                      className="w-full py-3.5 px-4 text-sm font-bold opacity-50 hover:opacity-100 hover:bg-white/5 transition-all rounded-2xl"
                      disabled={isDeleting}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Message;
