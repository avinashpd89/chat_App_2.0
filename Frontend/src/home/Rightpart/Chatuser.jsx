import React, { useState, useRef, useEffect } from "react";
import { IoVideocam, IoCall, IoArrowBack } from "react-icons/io5";

import useConversation from "../../zustand/useConversation.js";
import { useSocketContext } from "../../context/SocketContext.jsx";
import { CiMenuFries } from "react-icons/ci";
import { BsThreeDotsVertical } from "react-icons/bs";
import Avatar from "../../assets/avatar.jpg";
import useConversationManagement from "../../context/useConversationManagement.jsx";
import { useCall } from "../../context/CallProvider.jsx";
import axios from "axios";
import toast from "react-hot-toast";
import ConfirmationModal from "../../components/ConfirmationModal";
import GroupInfoModal from "../../components/GroupInfoModal";
import { useAuth } from "../../context/Authprovider.jsx";

function Chatuser() {
  const {
    selectedConversation,
    setSelectedConversation,
    users,
    setUsers,
    setGroups,
  } = useConversation();
  const { onlineUsers } = useSocketContext();
  const [authUser] = useAuth();
  const { deleteChat, clearChat, removeContact } = useConversationManagement();
  const { callUser } = useCall();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");

  const [activeModal, setActiveModal] = useState(null); // 'clear' or 'delete' or null
  const [isProfileViewOpen, setIsProfileViewOpen] = useState(false); // State for profile view
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  const handleRename = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await axios.put(`/api/user/update/${selectedConversation._id}`, {
        name: newName,
      });
      setUsers(
        users.map((u) =>
          u._id === selectedConversation._id ? { ...u, name: newName } : u,
        ),
      );
      setSelectedConversation({ ...selectedConversation, name: newName });
      setIsEditing(false);
      toast.success("Name updated");
    } catch (error) {
      console.error(error);
      toast.error("Error updating name");
    }
  };

  const handleConfirmAction = () => {
    if (activeModal === "clear") {
      clearChat();
      toast.success("Chat cleared");
    } else if (activeModal === "delete") {
      deleteChat();
      toast.success("Chat deleted");
    } else if (activeModal === "removeContact") {
      removeContact();
      toast.success("Contact removed");
    } else if (activeModal === "deleteGroup") {
      // Delete Group Logic
      axios
        .delete(`/api/message/delete-group/${selectedConversation._id}`)
        .then(() => {
          toast.success("Group deleted successfully");
          setSelectedConversation(null);
        })
        .catch((err) => {
          console.error(err);
          toast.error(err.response?.data?.error || "Failed to delete group");
        });
    } else if (activeModal === "leaveGroup") {
      axios
        .put(`/api/message/leave-group/${selectedConversation._id}`)
        .then(() => {
          toast.success("Left group successfully");
          // Use functional update for groups to remove the left group
          setGroups((prevGroups) =>
            prevGroups.filter((g) => g._id !== selectedConversation._id),
          );
          setSelectedConversation(null);
        })
        .catch((err) => {
          console.error(err);
          toast.error(err.response?.data?.error || "Failed to leave group");
        });
    }
    setActiveModal(null);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [menuOpen]);

  // Profile View Overlay Component
  const ProfileViewOverlay = () => {
    if (!isProfileViewOpen) return null;

    return (
      <div
        className="fixed inset-0 z-[100] bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center cursor-pointer"
        onClick={() => setIsProfileViewOpen(false)}>
        <div className="relative max-w-lg w-full p-4">
          <img
            src={selectedConversation.profilepic || Avatar}
            alt="User Profile"
            className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => {
              // Optional: Stop propagation if we wanted clicking image NOT to close.
              // But requirements say "click anywhere... hide", so we let it bubble.
            }}
          />
        </div>
      </div>
    );
  };

  const getOnlineUsersStatus = (userId) => {
    if (selectedConversation.isGroup) {
      return `${selectedConversation.members?.length || 0} members`;
    }
    return onlineUsers && onlineUsers.includes(userId) ? "Online" : "Offline";
  };

  const displayName = selectedConversation.isGroup
    ? selectedConversation.groupName
    : selectedConversation.name;
  const displayPic = selectedConversation.isGroup
    ? selectedConversation.groupProfilePic
    : selectedConversation.profilepic;

  return (
    <div className="relative z-50">
      <div className="flex items-center justify-between h-16 bg-base-100 px-5 duration-300 border-b border-base-300/20">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSelectedConversation(null)}
            className="md:hidden text-base-content mr-2">
            <IoArrowBack className="text-2xl" />
          </button>
          <div
            className={`avatar ${
              !selectedConversation.isGroup &&
              onlineUsers &&
              onlineUsers.includes(selectedConversation._id)
                ? "online"
                : ""
            }`}>
            <div
              className="w-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 cursor-pointer transition-transform hover:scale-105"
              onClick={() => {
                if (selectedConversation.isGroup) {
                  setIsGroupInfoOpen(true);
                } else {
                  setIsProfileViewOpen(true);
                }
              }}>
              <img
                src={displayPic || Avatar}
                alt="Avatar"
                className="object-cover rounded-full"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <form
                  onSubmit={handleRename}
                  className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-gray-700 text-white px-2 py-1 rounded-md text-sm outline-none w-24 md:w-auto"
                    autoFocus
                  />
                  <button type="submit" className="text-green-500 text-sm">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-red-500 text-sm">
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <h1 className="text-lg md:text-xl font-normal text-base-content">
                    {displayName}
                  </h1>
                </>
              )}
            </div>
            <span className="text-sm text-gray-400 hidden md:block">
              {getOnlineUsersStatus(selectedConversation._id)}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {!selectedConversation.isGroup && (
            <>
              <button
                onClick={() =>
                  callUser(
                    selectedConversation._id,
                    selectedConversation.name,
                    selectedConversation.profilepic,
                    true,
                  )
                }
                className="p-2 hover:bg-gray-700/10 rounded-full duration-200">
                <IoVideocam className="text-2xl text-base-content" />
              </button>
              <button
                onClick={() =>
                  callUser(
                    selectedConversation._id,
                    selectedConversation.name,
                    selectedConversation.profilepic,
                    false,
                  )
                }
                className="p-2 hover:bg-gray-700/10 rounded-full duration-200">
                <IoCall className="text-2xl text-base-content" />
              </button>
            </>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-gray-700/10 rounded-full duration-200">
              <BsThreeDotsVertical className="text-xl text-base-content" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 p-1">
                {!selectedConversation.isGroup && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setNewName(selectedConversation.name);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-800 rounded-md text-white transition-colors">
                    Edit Name
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveModal("clear");
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-800 rounded-md text-white transition-colors">
                  Clear chat
                </button>
                <button
                  onClick={() => {
                    setActiveModal("delete");
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-800 rounded-md text-red-500 transition-colors">
                  Delete chat
                </button>
                {!selectedConversation.isGroup && (
                  <button
                    onClick={() => {
                      setActiveModal("removeContact");
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-800 rounded-md text-red-500 transition-colors">
                    Remove Contact
                  </button>
                )}
                {selectedConversation.isGroup && (
                  <button
                    onClick={() => {
                      setActiveModal("leaveGroup");
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-800 rounded-md text-red-500 transition-colors border-t border-gray-700">
                    Leave Group
                  </button>
                )}
                {selectedConversation.isGroup &&
                  selectedConversation.groupAdmin === authUser.user._id && (
                    <button
                      onClick={() => {
                        setActiveModal("deleteGroup");
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-800 rounded-md text-red-600 font-bold transition-colors border-t border-gray-700">
                      Delete Group
                    </button>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        onConfirm={handleConfirmAction}
        confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
        title={
          activeModal === "clear"
            ? "Clear this chat?"
            : activeModal === "delete"
              ? "Delete this chat?"
              : activeModal === "removeContact"
                ? "Remove Contact?"
                : activeModal === "leaveGroup"
                  ? "Leave Group?"
                  : "Delete Group?"
        }
        message={
          activeModal === "clear"
            ? "This chat will be empty but will remain in your chat list."
            : activeModal === "delete"
              ? "This chat will be deleted from your chat list."
              : activeModal === "removeContact"
                ? "Are you sure you want to remove this contact?"
                : activeModal === "leaveGroup"
                  ? "Are you sure you want to leave this group? You will no longer receive messages from this group."
                  : "Are you sure you want to PERMANENTLY delete this group? This action cannot be undone."
        }
        confirmText={
          activeModal === "clear"
            ? "Clear chat"
            : activeModal === "delete"
              ? "Delete chat"
              : activeModal === "removeContact"
                ? "Remove"
                : activeModal === "leaveGroup"
                  ? "Leave Group"
                  : "Delete Group"
        }
      />

      <ProfileViewOverlay />
      {isGroupInfoOpen && selectedConversation.isGroup && (
        <GroupInfoModal
          group={selectedConversation}
          onClose={() => setIsGroupInfoOpen(false)}
        />
      )}

      {selectedConversation.isContact === false && (
        <div className="absolute top-16 inset-x-4 mt-2 bg-gray-800 border border-yellow-500 rounded-lg p-4 shadow-2xl z-[100] flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in-down">
          <div>
            <h3 className="text-yellow-500 font-bold text-lg">
              ⚠️ Safety Warning
            </h3>
            <p className="text-gray-300 text-sm">
              You do not have this user in your contacts. Do you want to
              continue chatting or block them?
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                try {
                  await axios.post("/api/user/remove-contact", {
                    contactId: selectedConversation._id,
                  }); // Reuse remove/add logic OR just add if we want to confirm
                  // Actually, "Continue" means ADD them.
                  const res = await axios.post("/api/user/add", {
                    email: selectedConversation.email,
                  });
                  toast.success("User added to contacts");
                  // Update locally
                  setUsers(
                    users.map((u) =>
                      u._id === selectedConversation._id
                        ? { ...u, isContact: true }
                        : u,
                    ),
                  );
                  setSelectedConversation({
                    ...selectedConversation,
                    isContact: true,
                  });
                } catch (e) {
                  toast.error("Error adding user");
                }
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors">
              Continue
            </button>
            <button
              onClick={async () => {
                if (!window.confirm("Block this user? They will be removed."))
                  return;
                try {
                  await axios.post("/api/user/block", {
                    blockId: selectedConversation._id,
                  });
                  toast.success("User blocked");
                  setUsers(
                    users.filter((u) => u._id !== selectedConversation._id),
                  );
                  setSelectedConversation(null);
                } catch (e) {
                  toast.error("Error blocking user");
                }
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors">
              Block
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chatuser;
