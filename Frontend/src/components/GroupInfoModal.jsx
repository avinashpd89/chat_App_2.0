import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import useConversation from "../zustand/useConversation.js";
import { useAuth } from "../context/Authprovider.jsx";
import { FaCamera } from "react-icons/fa";
import { IoPersonAdd } from "react-icons/io5";

const GroupInfoModal = ({ onClose, group }) => {
  const [authUser] = useAuth();
  const { setGroups, groups, setSelectedConversation } = useConversation();
  const isAdmin = group.groupAdmin === authUser.user._id;

  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(group.groupName);
  const [groupProfilePic, setGroupProfilePic] = useState(group.groupProfilePic);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Add Member State
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [availableContacts, setAvailableContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Profile View State - now holds the URL or null
  const [viewProfilePhoto, setViewProfilePhoto] = useState(null);

  useEffect(() => {
    if (isAddingMember) {
      const fetchAvailableContacts = async () => {
        try {
          const res = await axios.get("/api/user/allusers");
          // Filter out users already in the group
          const existingMemberIds = new Set(group.members.map((m) => m._id));
          const filtered = res.data.filter(
            (user) => !existingMemberIds.has(user._id)
          );
          setAvailableContacts(filtered);
        } catch (error) {
          console.error("Error fetching contacts", error);
        }
      };
      fetchAvailableContacts();
    }
  }, [isAddingMember, group.members]);

  const handleImageChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupProfilePic(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return toast.error("Group name cannot be empty");

    setLoading(true);
    try {
      const res = await axios.put(`/api/message/update-group/${group._id}`, {
        groupName,
        groupProfilePic,
      });

      const updatedGroup = res.data;
      updateLocalGroup(updatedGroup);

      toast.success("Group updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating group", error);
      toast.error(error.response?.data?.error || "Failed to update group");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (userId) => {
    setAddLoading(true);
    try {
      const res = await axios.put(`/api/message/add-member/${group._id}`, {
        userId,
      });
      const updatedGroup = res.data;
      updateLocalGroup(updatedGroup);
      toast.success("Member added successfully");
      setIsAddingMember(false);
    } catch (error) {
      console.error("Error adding member", error);
      toast.error(error.response?.data?.error || "Failed to add member");
    } finally {
      setAddLoading(false);
    }
  };

  const updateLocalGroup = (updatedGroup) => {
    const updatedGroups = groups.map((g) =>
      g._id === updatedGroup._id ? updatedGroup : g
    );
    setGroups(updatedGroups);
    setSelectedConversation(updatedGroup);
  };

  const filteredContacts = availableContacts.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-primary p-4 text-primary-content flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold">
            {isAddingMember ? "Add Member" : "Group Info"}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost text-white">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isAddingMember ? (
            <div className="flex flex-col gap-4 h-full">
              <button
                onClick={() => setIsAddingMember(false)}
                className="btn btn-ghost btn-sm self-start -ml-2 mb-2">
                ← Back
              </button>

              <input
                type="text"
                placeholder="Search contacts..."
                className="input input-bordered w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="flex-1 overflow-y-auto min-h-[200px]">
                {filteredContacts.length === 0 ? (
                  <p className="text-center opacity-50 p-4">
                    No contacts found
                  </p>
                ) : (
                  filteredContacts.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-2 hover:bg-base-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="avatar">
                          <div className="w-10 rounded-full">
                            <img
                              src={
                                user.profilepic ||
                                "https://avatar.iran.liara.run/public/boy"
                              }
                              alt={user.name}
                            />
                          </div>
                        </div>
                        <span>{user.name}</span>
                      </div>
                      <button
                        onClick={() => handleAddMember(user._id)}
                        disabled={addLoading}
                        className="btn btn-sm btn-primary">
                        {addLoading ? "Adding..." : "Add"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {/* Group Icon */}
              <div className="avatar placeholder relative group/avatar">
                <div
                  className={`bg-neutral text-neutral-content rounded-full w-24 overflow-hidden ${
                    isEditing
                      ? "cursor-pointer ring-4 ring-primary"
                      : "cursor-pointer"
                  }`}
                  onClick={() => {
                    if (isEditing) {
                      fileInputRef.current.click();
                    } else {
                      // View group profile
                      setViewProfilePhoto(
                        groupProfilePic || "PLACEHOLDER_GROUP"
                      );
                    }
                  }}>
                  {groupProfilePic ? (
                    <img src={groupProfilePic} alt="Group" />
                  ) : (
                    <span className="text-3xl font-bold">
                      {groupName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Edit Overlay */}
                {isEditing && (
                  <div
                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => fileInputRef.current.click()}>
                    <FaCamera className="text-white text-2xl" />
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {isEditing ? (
                <p className="text-xs text-center opacity-50 -mt-2">
                  Click photo to change
                </p>
              ) : (
                <p className="text-xs text-center opacity-50 -mt-2">
                  Click photo to view
                </p>
              )}

              {!isEditing ? (
                <>
                  <h3 className="text-2xl font-bold text-base-content text-center">
                    {group.groupName}
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-sm opacity-60">
                      {group.members.length} Members
                    </p>
                  </div>

                  {/* Members List */}
                  <div className="w-full max-h-40 overflow-y-auto bg-base-200 rounded-box p-2 mt-2">
                    <div className="flex items-center justify-between px-2 mb-2">
                      <h4 className="text-xs font-bold opacity-50">
                        MEMBERS
                      </h4>
                      {group.members.length < 50 && (
                        <button
                          onClick={() => setIsAddingMember(true)}
                          className="btn btn-xs btn-primary text-white"
                          title="Add Member">
                          <IoPersonAdd className="text-sm" />
                          Add
                        </button>
                      )}
                    </div>
                    {group.members.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center gap-3 p-2 hover:bg-base-300 rounded-lg cursor-default">
                        <div
                          className="avatar cursor-pointer hover:ring-2 hover:ring-primary rounded-full transition-all"
                          onClick={() =>
                            setViewProfilePhoto(
                              member.profilepic ||
                                "https://avatar.iran.liara.run/public/boy"
                            )
                          }>
                          <div className="w-8 rounded-full">
                            <img
                              src={
                                member.profilepic ||
                                "https://avatar.iran.liara.run/public/boy"
                              }
                              alt={member.name}
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-sm">
                                {member.name}
                                {member._id === authUser.user._id && " (You)"}
                              </div>
                              <div className="text-xs opacity-60 truncate">
                                {member.email}
                              </div>
                            </div>
                            {group.groupAdmin === member._id && (
                              <span className="badge badge-xs badge-primary shrink-0">
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn btn-primary w-full mt-4">
                      Edit Group Info
                    </button>
                  )}
                </>
              ) : (
                <form
                  onSubmit={handleUpdate}
                  className="w-full flex flex-col gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Group Name</span>
                    </label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="input input-bordered w-full"
                      placeholder="Enter group name"
                      maxLength={50}
                      required
                    />
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="btn flex-1"
                      disabled={loading}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex-1"
                      disabled={loading}>
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Profile View */}
      {viewProfilePhoto && (
        <div
          className="fixed inset-0 z-[60] bg-black bg-opacity-90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setViewProfilePhoto(null)}>
          <div className="relative max-w-2xl w-full max-h-[90vh] flex items-center justify-center">
            {viewProfilePhoto !== "PLACEHOLDER_GROUP" ? (
              <img
                src={viewProfilePhoto}
                alt="Profile"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <div className="w-64 h-64 rounded-full bg-neutral text-neutral-content flex items-center justify-center text-8xl font-bold">
                {groupName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupInfoModal;
