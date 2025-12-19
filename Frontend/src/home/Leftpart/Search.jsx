import React, { useState } from "react";
import { IoSearch, IoPersonAdd } from "react-icons/io5";
import useGetAllUsers from "../../context/userGetAllUsers.jsx";
import useConversation from "../../zustand/useConversation.js";
import toast from "react-hot-toast";
import axios from "axios";

function Search() {
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false); // Toggle between Search and Add
  const [addEmail, setAddEmail] = useState("");
  const [allUsers] = useGetAllUsers();
  const { setSelectedConversation, users, setUsers } = useConversation();

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
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-base-content">
            {isAdding ? "Add Contact" : "Search"}
          </h2>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="text-primary hover:text-primary-focus p-2 rounded-full hover:bg-base-200 transition-colors"
            title={isAdding ? "Back to Search" : "Add New Contact"}>
            {isAdding ? (
              <IoSearch className="text-2xl" />
            ) : (
              <IoPersonAdd className="text-2xl" />
            )}
          </button>
        </div>

        {isAdding ? (
          <form onSubmit={handleAddContact}>
            <div className="flex space-x-3">
              <label className="border-[1px] border-base-content/20 bg-base-100 rounded-lg p-3 flex items-center gap-2 w-[80%]">
                <input
                  type="email"
                  className="grow outline-none bg-transparent text-base-content placeholder-base-content/60"
                  placeholder="Enter email to add"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                />
              </label>
              <button type="submit">
                <IoPersonAdd className="text-5xl p-2 hover:bg-base-200 rounded-full duration-300 text-green-500" />
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSearch}>
            <div className="flex space-x-3">
              <label className="border-[1px] border-base-content/20 bg-base-100 rounded-lg p-3 flex items-center gap-2 w-[80%]">
                <input
                  type="text"
                  className="grow outline-none bg-transparent text-base-content placeholder-base-content/60"
                  placeholder="Search contacts"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <button type="submit">
                <IoSearch className="text-5xl p-2 hover:bg-base-200 rounded-full duration-300 text-base-content" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Search;
