import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const GroupCreationModal = ({ closeModal, users, onGroupCreated }) => {
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter out any users that might not have an ID (like self) or are already included
  const availableUsers = users.filter((user) => user && user._id);

  const toggleMember = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      if (selectedMembers.length >= 49) {
        // 49 + admin = 50
        toast.error("Maximum 50 members allowed");
        return;
      }
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName) {
      toast.error("Please enter a group name");
      return;
    }
    if (selectedMembers.length < 1) {
      toast.error("Please select at least one member");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("/api/message/create-group", {
        groupName,
        members: selectedMembers,
      });
      toast.success("Group created successfully!");
      if (onGroupCreated) onGroupCreated(response.data);
      closeModal();
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error(error.response?.data?.error || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Create New Group</h2>
          <button
            onClick={closeModal}
            className="text-slate-400 hover:text-white transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Group Name
            </label>
            <input
              type="text"
              placeholder="E.g. Project Avengers"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Members ({selectedMembers.length}/49)
            </label>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {availableUsers.length === 0 ? (
                <p className="text-slate-500 text-center py-4">
                  No contacts found to add
                </p>
              ) : (
                availableUsers.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => toggleMember(user._id)}
                    className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${
                      selectedMembers.includes(user._id)
                        ? "bg-blue-600 border-blue-500"
                        : "bg-slate-900 border-transparent hover:bg-slate-700"
                    } border`}>
                    <div className="avatar">
                      <div className="w-10 rounded-full border border-slate-600">
                        <img
                          src={
                            user.profilepic ||
                            "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
                          }
                          alt={user.name}
                        />
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-slate-100 font-medium">{user.name}</p>
                    </div>
                    {selectedMembers.includes(user._id) && (
                      <div className="bg-white rounded-full p-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-900 border-t border-slate-700 flex space-x-3">
          <button
            onClick={closeModal}
            className="flex-1 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 transition-all font-medium">
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={loading}
            className={`flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}>
            {loading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupCreationModal;
