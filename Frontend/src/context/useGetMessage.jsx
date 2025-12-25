import React, { useEffect, useState } from "react";
import useConversation from "../zustand/useConversation.js";
import axios from "axios";
import { useAuth } from "./Authprovider.jsx";

import { SignalManager } from "../utils/SignalManager.js";

function useGetMessage() {
  const [loading, setLoading] = useState(false);
  const { message, setMessage, selectedConversation } = useConversation();
  const [authUser] = useAuth();

  useEffect(() => {
    const getMessages = async () => {
      if (
        selectedConversation &&
        selectedConversation._id &&
        authUser?.user?._id
      ) {
        setLoading(true);
        try {
          const res = await axios.get(
            `/api/message/get/${selectedConversation._id}`
          );

          const decryptedMessages = [];
          for (const msg of res.data) {
            try {
              const decryptedContent = await SignalManager.decryptMessage(
                msg.senderId,
                msg.message,
                authUser.user._id,
                msg._id
              );
              decryptedMessages.push({
                ...msg,
                message: decryptedContent,
              });
            } catch (err) {
              console.error("Single message decryption failed", err);
              decryptedMessages.push({
                ...msg,
                message: "[Decryption Error]",
              });
            }
          }

          setMessage(decryptedMessages);
        } catch (error) {
          console.log("Error in getting messages", error);
        } finally {
          setLoading(false);
        }
      } else {
        setMessage([]); // Clear messages if no conversation selected
      }
    };
    getMessages();
  }, [selectedConversation?._id, setMessage, authUser?.user?._id]);
  return { loading, message };
}

export default useGetMessage;
