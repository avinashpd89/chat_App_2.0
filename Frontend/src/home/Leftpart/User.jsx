import React from "react";
import useConversation from "../../zustand/useConversation.js";
import { useSocketContext } from "../../context/SocketContext.jsx";
import Avatar from "../../assets/avatar.jpg";
import { useNotifications } from "../../context/NotificationContext";
import NotificationBadge from "../../components/NotificationBadge";
import axios from "axios";
import { useAuth } from "../../context/Authprovider";

function User({ user }) {
  const { selectedConversation, setSelectedConversation } = useConversation();
  const isSelected = selectedConversation?._id === user._id;
  const { socket, onlineUsers } = useSocketContext();
  const { unreadCounts } = useNotifications();
  const [authUser] = useAuth();

  const inOnline = onlineUsers.includes(user._id);
  const unreadCount = unreadCounts[user._id?.toString()] || 0;

  const { lastMessages } = useConversation();
  const lastMsg = lastMessages?.[user._id?.toString()];

  const handleSelectConversation = async (selectedUser) => {
    setSelectedConversation(selectedUser);

    // Mark messages as read on backend
    if (unreadCount > 0 && authUser?.user?._id) {
      try {
        await axios.put(`/api/message/markAsRead/${selectedUser._id}`);
        console.log("Messages marked as read for:", selectedUser._id);
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    }
  };

  return (
    <div
      className={`hover:bg-base-200 duration-300 transition-all ${
        isSelected ? "bg-base-100" : ""
      }`}
      onClick={() => handleSelectConversation(user)}>
      <div className="flex items-center px-6 py-4 cursor-pointer gap-4">
        {/* Avatar Section */}
        <div className={`avatar ${inOnline ? "online" : ""}`}>
          <div className="w-12 rounded-full ring-1 ring-base-content/10 shadow-sm">
            <img
              src={
                user.isGroup
                  ? user.groupProfilePic || Avatar
                  : user.profilepic || Avatar
              }
              alt="User Avatar"
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex justify-between items-baseline">
            <h1 className="font-bold truncate text-base-content text-sm md:text-base leading-tight">
              {user.isGroup ? user.groupName : user.name}
            </h1>
            {lastMsg?.time && (
              <span
                className={`text-[10px] md:text-xs shrink-0 ${
                  unreadCount > 0 ? "text-red-500 font-bold" : "opacity-40"
                }`}>
                {lastMsg.time}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center gap-2">
            <p
              className={`text-xs truncate flex-1 ${
                unreadCount > 0
                  ? "text-base-content font-medium opacity-90"
                  : "opacity-50"
              }`}>
              {lastMsg?.text || ""}
            </p>
            <div className="shrink-0">
              <NotificationBadge count={unreadCount} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default User;
