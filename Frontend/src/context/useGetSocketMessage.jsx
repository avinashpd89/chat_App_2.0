import React, { useEffect } from "react";
import { useSocketContext } from "./SocketContext.jsx";
import useConversation from "../zustand/useConversation.js";
import sound from "../assets/sound.mp3";
import axios from "axios";
import Cookies from "js-cookie";

import { decryptMessage } from "../utils/encryption.js";

function useGetSocketMessage() {
  const { socket } = useSocketContext();
  const { message, setMessage, users, setUsers } = useConversation();

  useEffect(() => {
    socket.on("newMessage", async (newMessage) => {
      const notification = new Audio(sound);
      notification.play();

      const decryptedMsg = {
        ...newMessage,
        message: decryptMessage(newMessage.message),
      };
      setMessage([...message, decryptedMsg]);

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
  }, [socket, message, setMessage, users, setUsers]);
}

export default useGetSocketMessage;
