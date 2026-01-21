import React, { useState, useRef, useEffect } from "react";
import { IoSearch } from "react-icons/io5";
import { HiEllipsisVertical } from "react-icons/hi2";
import useGetAllUsers from "../../context/userGetAllUsers.jsx";
import useConversation from "../../zustand/useConversation.js";
import toast from "react-hot-toast";
import axios from "axios";
import { MdGroupAdd } from "react-icons/md";
import { IoPersonAdd } from "react-icons/io5";
import GroupCreationModal from "../../components/GroupCreationModal.jsx";

function Search({ onFilterChange }) {
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false); // Toggle between Search and Add
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [filterType, setFilterType] = useState("all"); // all, unread, groups
  const menuRef = useRef(null);
  const [allUsers] = useGetAllUsers();
  const { setSelectedConversation, users, setUsers, setGroups, groups } =
    useConversation();

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const handleFilterChange = (type) => {
    setFilterType(type);
    onFilterChange(type);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search) return;
    const conversation = allUsers.find((user) =>
      user.name.toLowerCase().includes(search.toLowerCase())
    );
    if (conversation) {
      setSelectedConversation(conversation);
      setSearch("");
    } else {
      toast.error("User not found");
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!addEmail) return;
    try {
      const response = await axios.post("/api/user/add", { email: addEmail });
      toast.success(response.data.message);
      setAddEmail("");
      setIsAdding(false);
      // Update global user list immediately
      setUsers([...users, response.data.user]);
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Failed to add contact";
      toast.error(errorMsg);
    }
  };

  return (
    <div className="">
      <div className="px-6 py-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-base-content">
            {isAdding ? "Add Contact" : "Chats"}
          </h2>
          <div className="flex items-center gap-2 relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-primary hover:text-primary-focus p-2 rounded-full hover:bg-base-200 transition-colors"
              title="Menu">
              <HiEllipsisVertical className="text-2xl" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 bg-base-100 rounded-lg shadow-lg border border-base-200 z-50 w-48">
                {isAdding ? (
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-base-200 flex items-center gap-2 rounded-lg transition-colors">
                    <IoSearch className="text-lg" />
                    <span>Return to Search</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsAdding(true);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-base-200 flex items-center gap-2 rounded-t-lg transition-colors">
                      <IoPersonAdd className="text-lg" />
                      <span>Add New Contact</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingGroup(true);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-base-200 flex items-center gap-2 rounded-b-lg transition-colors">
                      <MdGroupAdd className="text-lg" />
                      <span>Create New Group</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filter Buttons */}
        {!isAdding && (
          <div className="flex gap-2 mb-4 px-1">
            <button
              onClick={() => handleFilterChange("all")}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                filterType === "all"
                  ? "bg-primary text-primary-content"
                  : "bg-base-200 text-base-content hover:bg-base-300"
              }`}>
              All
            </button>
            <button
              onClick={() => handleFilterChange("unread")}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                filterType === "unread"
                  ? "bg-primary text-primary-content"
                  : "bg-base-200 text-base-content hover:bg-base-300"
              }`}>
              Unread
            </button>
            <button
              onClick={() => handleFilterChange("groups")}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                filterType === "groups"
                  ? "bg-primary text-primary-content"
                  : "bg-base-200 text-base-content hover:bg-base-300"
              }`}>
              Groups
            </button>
          </div>
        )}

        {isCreatingGroup && (
          <GroupCreationModal
            closeModal={() => setIsCreatingGroup(false)}
            users={users}
            onGroupCreated={(newGroup) => {
              setGroups([...groups, newGroup]);
              setSelectedConversation(newGroup);
            }}
          />
        )}

        {isAdding ? (
          <form onSubmit={handleAddContact}>
            <div className="flex items-center gap-2 bg-[#202c33] rounded-full px-4 py-2 border border-gray-700/50 focus-within:border-blue-500/50 transition-all duration-300">
              <IoPersonAdd className="text-gray-400 text-xl" />
              <input
                type="email"
                className="grow bg-transparent outline-none text-gray-200 placeholder-gray-400 font-normal"
                placeholder="Enter email to add"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
              <button
                type="submit"
                className="text-blue-500 font-semibold text-sm hover:text-blue-400 transition-colors">
                ADD
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSearch}>
            <div className="flex items-center gap-3 bg-[#202c33] rounded-full px-4 py-2.5 border border-gray-700/50 focus-within:border-blue-500/50 transition-all duration-300 shadow-sm hover:shadow-md">
              <button type="submit">
                <IoSearch className="text-gray-400 text-xl hover:text-white transition-colors" />
              </button>
              <input
                type="text"
                className="grow bg-transparent outline-none text-gray-200 placeholder-gray-400 font-normal"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Search;
