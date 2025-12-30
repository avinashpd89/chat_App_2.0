import React from "react";

const NotificationBadge = ({ count }) => {
  if (!count || count <= 0) return null;

  return (
    <div className="flex items-center justify-center bg-red-600 text-white text-[10px] font-bold rounded-full h-5 w-5 animate-in zoom-in duration-300 shadow-md border border-red-500/50">
      {count > 99 ? "99+" : count}
    </div>
  );
};

export default NotificationBadge;
