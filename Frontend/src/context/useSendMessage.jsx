import React, { useState } from "react";
import useConversation from "../zustand/useConversation.js";
import axios from "axios";

import { encryptMessage, decryptMessage } from "../utils/encryption.js";

function useSendMessage() {
  const [loading, setLoading] = useState(false);
  const { message, setMessage, selectedConversation } = useConversation();

  const sendMessages = async (newMessage, messageType = "text") => {
    // renamed arg to avoid confusion with state 'message'
    if (!newMessage || !selectedConversation?._id) {
      console.log("Message or selected conversation is missing");
      return;
    }

    setLoading(true);
    try {
      const encryptedText = encryptMessage(newMessage); // Encrypt payload
      const res = await axios.post(
        `/api/message/send/${selectedConversation._id}`,
        { message: encryptedText, messageType }
      );

      // The server returns the saved message (encrypted).
      // We need to store the decrypted version in our local state to show it in UI.
      const decryptedResMessage = {
        ...res.data.newMessage,
        message: decryptMessage(res.data.newMessage.message),
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
