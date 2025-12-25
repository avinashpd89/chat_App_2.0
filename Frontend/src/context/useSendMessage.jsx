import React, { useState } from "react";
import useConversation from "../zustand/useConversation.js";
import axios from "axios";
import { useAuth } from "./Authprovider.jsx";

import { SignalManager } from "../utils/SignalManager.js";

function useSendMessage() {
  const [loading, setLoading] = useState(false);
  const { message, setMessage, selectedConversation } = useConversation();
  const [authUser] = useAuth();

  const sendMessages = async (newMessage, messageType = "text") => {
    // renamed arg to avoid confusion with state 'message'
    if (!newMessage || !selectedConversation?._id || !authUser?.user?._id) {
      console.log("Message, selected conversation, or auth user is missing");
      return;
    }

    setLoading(true);
    try {
      const encryptedPayload = await SignalManager.encryptMessage(
        selectedConversation?._id,
        newMessage,
        authUser?.user?._id,
        async (userId) => {
          const res = await axios.get(`/api/user/keys/fetch/${userId}`);
          return res.data;
        }
      );

      const res = await axios.post(
        `/api/message/send/${selectedConversation._id}`,
        { message: encryptedPayload, messageType }
      );

      // We process the response to display it immediately.
      // Since we just encrypted it, we know the plaintext is `newMessage`.
      // But for consistency (and if server modified it?), we could decrypt?
      // Actually, standard pattern is to append the *plaintext* version to local state for UI responsiveness,
      // or decypt the return. Let's just use the original message for local display to avoid re-decryption overhead/issues.

      const decryptedResMessage = {
        ...res.data.newMessage,
        message: newMessage, // Use original plaintext for local display
      };

      setMessage([...message, decryptedResMessage]);
      setLoading(false);
    } catch (error) {
      console.log("Error in send messages", error);
      setLoading(false);
    }
  };

  return { loading, sendMessages };
}

export default useSendMessage;
