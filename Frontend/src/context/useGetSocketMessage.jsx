import React, { useEffect } from "react";
import { useSocketContext } from "./SocketContext.jsx";
import useConversation from "../zustand/useConversation.js";
import sound from "../assets/sound.mp3";
import axios from "axios";
import Cookies from "js-cookie";
import { useAuth } from "./Authprovider.jsx";

import { SignalManager } from "../utils/SignalManager.js";

function useGetSocketMessage() {
  const { socket } = useSocketContext();
  const { message, setMessage, users, setUsers, selectedConversation } =
    useConversation();
  const [authUser] = useAuth();

  useEffect(() => {
    socket.on("newMessage", async (newMessage) => {
      const notification = new Audio(sound);
      notification.play();

      const decryptedMsg = {
        ...newMessage,
        message: await SignalManager.decryptMessage(
          newMessage.senderId,
          newMessage.message,
          authUser?.user?._id,
          newMessage._id
        ),
      };

      // Only append if viewing this conversation
      if (selectedConversation?._id === newMessage.senderId) {
        setMessage([...message, decryptedMsg]);
      }

      // Check if sender is in the current list
      const senderExists = users.some(
        (user) => user._id === newMessage.senderId
      );

      if (!senderExists) {
        // It's a stranger! Refresh the list to include them.
        try {
          const token = Cookies.get("jwt");
          const response = await axios.get("/api/user/allusers", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUsers(response.data);
        } catch (error) {
          console.log("Error refreshing users:", error);
        }
      }
    });

    return () => {
      socket.off("newMessage");
    };
  }, [
    socket,
    message,
    setMessage,
    users,
    setUsers,
    selectedConversation?._id,
    authUser?._id,
  ]);
}

export default useGetSocketMessage;
