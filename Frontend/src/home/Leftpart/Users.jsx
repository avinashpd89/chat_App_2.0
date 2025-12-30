import React from "react";
import User from "./User";
import userGetAllUsers from "../../context/userGetAllUsers";
import useConversation from "../../zustand/useConversation.js";

function Users() {
  const [allUsers, loading] = userGetAllUsers();
  const { unreadCounts } = useConversation();
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <h1 className="px-8 py-2 text-base-content font-semibold bg-base-200 rounded-md flex items-center justify-between">
        <span>Messages</span>
        {totalUnread > 0 && (
          <span className="bg-red-600 text-white text-[11px] font-bold h-5 px-2 rounded-full flex items-center justify-center animate-pulse shadow-sm">
            {totalUnread}
          </span>
        )}
      </h1>
      <div
        className="py-2 flex-1 overflow-y-auto"
        style={{ maxHeight: "calc(84vh - 10vh)" }}>
        {allUsers.map((user, index) => (
          <User key={index} user={user} />
        ))}
      </div>
    </div>
  );
}

export default Users;
