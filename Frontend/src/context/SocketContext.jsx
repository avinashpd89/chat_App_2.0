import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./Authprovider";
import useConversation from "../zustand/useConversation.js";
import io from "socket.io-client";
const socketContext = createContext();

// it is a hook
export const useSocketContext = () => {
  return useContext(socketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [authUser] = useAuth();
  const {
    users,
    setUsers,
    groups,
    setGroups,
    selectedConversation,
    setSelectedConversation,
  } = useConversation();

  useEffect(() => {
    if (authUser) {
      const socket = io("http://localhost:4000", {
        query: {
          userId: authUser.user._id,
        },
      });
      setSocket(socket);

      socket.on("getOnlineUsers", (users) => {
        setOnlineUsers(users);
      });

      // Listen for user profile updates
      socket.on("userUpdated", (updatedUser) => {
        console.log("Socket: User updated", updatedUser);
        // Update the user in the users list
        setUsers((prevUsers) =>
          prevUsers.map((u) => (u._id === updatedUser._id ? updatedUser : u)),
        );
        // If this is the selected conversation, update it too
        const { selectedConversation, setSelectedConversation } =
          useConversation.getState();
        if (selectedConversation?._id === updatedUser._id) {
          setSelectedConversation({ ...selectedConversation, ...updatedUser });
        }
      });

      // Listen for new group creation
      socket.on("newGroup", (newGroup) => {
        console.log("Socket: New group received", newGroup);
        setGroups((prevGroups) => [...prevGroups, newGroup]);
      });

      // Listen for group updates
      socket.on("groupUpdated", (updatedGroup) => {
        console.log("Socket: Group updated", updatedGroup);
        // Update the group in the groups array
        setGroups((prevGroups) =>
          prevGroups.map((g) =>
            g._id === updatedGroup._id ? updatedGroup : g,
          ),
        );
        // If this is the selected conversation, update it too
        // We use getState to avoid stale closure on selectedConversation
        const { selectedConversation, setSelectedConversation } =
          useConversation.getState();
        if (selectedConversation?._id === updatedGroup._id) {
          setSelectedConversation(updatedGroup);
        }
      });

      // Listen for group deletion
      socket.on("groupDeleted", (deletedGroupId) => {
        console.log("Socket: Group deleted", deletedGroupId);

        setGroups((prevGroups) =>
          prevGroups.filter((g) => g._id !== deletedGroupId),
        );

        // If this is the selected conversation, verify it matches and deselect
        const { selectedConversation, setSelectedConversation } =
          useConversation.getState();
        if (selectedConversation?._id === deletedGroupId) {
          setSelectedConversation(null); // Return to home/empty state
          // Optionally show a toast that the group was deleted
        }
      });

      return () => socket.close();
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [authUser]);
  return (
    <socketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </socketContext.Provider>
  );
};
