import React from "react";
import { useNotifications } from "../context/NotificationContext";
import { IoClose } from "react-icons/io5";

const OfflineMessageNotification = () => {
  const { notifications, removeToast } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[1000] flex flex-col gap-3 pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="bg-gray-900 border border-gray-700 text-white p-4 rounded-xl shadow-2xl flex items-center gap-4 min-w-[300px] max-w-[400px] animate-in slide-in-from-right duration-300 pointer-events-auto">
          <div className="flex-1">
            <h4 className="font-bold text-red-500 text-sm">New Message</h4>
            <div className="flex flex-col">
              <span className="font-semibold text-white/90">
                {n.senderName}
              </span>
              <p className="text-gray-400 text-xs truncate max-w-[200px]">
                {n.messageText}
              </p>
            </div>
          </div>
          <button
            onClick={() => removeToast(n.id)}
            className="p-1 hover:bg-gray-800 rounded-full transition-colors">
            <IoClose className="text-xl text-gray-400" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default OfflineMessageNotification;
