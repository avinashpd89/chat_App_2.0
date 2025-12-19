import React from "react";

import useDeleteMessage from "../../context/useDeleteMessage";
import { MdDelete } from "react-icons/md";

function Message({ message }) {
  const authUser = JSON.parse(localStorage.getItem("ChatApp"));
  const itsMe = message.senderId === authUser.user._id;
  const chatName = itsMe ? "chat-end" : "chat-start";
  const chatColor = itsMe
    ? "bg-blue-500 text-white"
    : "bg-base-100 text-base-content border border-base-300";
  const { deleteMessage } = useDeleteMessage();

  const createdAt = new Date(message.createdAt);
  const formattedTime = createdAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

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

  return (
    <div>
      <div className="p-4 group">
        <div className={`chat ${chatName}`}>
          <div className={`chat-bubble ${chatColor} break-words`}>
            {message.messageType === "text" ? (
              renderMessageContent(message.message, itsMe)
            ) : message.messageType === "image" ? (
              <img
                src={message.message}
                alt="sent image"
                className="max-w-xs rounded-lg"
              />
            ) : message.messageType === "video" ? (
              <video
                src={message.message}
                controls
                className="max-w-xs rounded-lg"
              />
            ) : message.message.startsWith("data:image") ? (
              <img
                src={message.message}
                alt="sent image"
                className="max-w-xs rounded-lg"
              />
            ) : message.message.startsWith("data:video") ? (
              <video
                src={message.message}
                controls
                className="max-w-xs rounded-lg"
              />
            ) : (
              message.message
            )}
          </div>
          <div className="chat-footer flex items-center gap-2">
            {formattedTime}
            <button
              onClick={() => deleteMessage(message._id)}
              className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
              title="Delete for me">
              <MdDelete size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Message;
