import React from "react";
import User from "./User";
import userGetAllUsers from "../../context/userGetAllUsers";
import useConversation from "../../zustand/useConversation.js";
import useGetGroups from "../../context/useGetGroups";
import { useNotifications } from "../../context/NotificationContext";

function Users({ filterType = "all" }) {
  const [allUsers, loading] = userGetAllUsers();
  const [groups, loadingGroups] = useGetGroups();
  const { unreadCounts } = useNotifications();
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  // Combine users and groups for display
  let combinedItems = [...(groups || []), ...(allUsers || [])];

  // Apply filter based on filterType
  if (filterType === "unread") {
    combinedItems = combinedItems.filter((item) => {
      const unreadCount = unreadCounts[item._id?.toString()];
      return unreadCount && unreadCount > 0;
    });
  } else if (filterType === "groups") {
    combinedItems = combinedItems.filter((item) => item.isGroup === true);
  }
  // "all" shows everything, no filtering needed

  // Determine the message to show when no items are found
  const getEmptyMessage = () => {
    switch (filterType) {
      case "unread":
        return "No unread chats";
      case "groups":
        return "No groups";
      default:
        return "No conversations";
    }
  };

  return (
    <div>
      <h1 className="px-8 py-2 text-base-content font-semibold bg-base-200 rounded-md flex items-center justify-between">
        <span>Messages</span>
      </h1>
      <div className="py-2">
        {combinedItems.length > 0 ? (
          combinedItems.map((item, index) => <User key={index} user={item} />)
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <p className="text-gray-400 text-lg mb-4">{getEmptyMessage()}</p>
            {filterType !== "all" && (
              <button
                onClick={() => {
                  // This will trigger the filter change in parent
                  window.dispatchEvent(
                    new CustomEvent("changeFilter", { detail: "all" }),
                  );
                }}
                className="text-primary hover:text-primary-focus font-semibold">
                View all chats
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Users;
