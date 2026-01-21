import React, { useState } from "react";
import useConversation from "../zustand/useConversation.js";
import axios from "axios";
import { useAuth } from "./Authprovider.jsx";
import sound from "../assets/sound.mp3";

import { SignalManager } from "../utils/SignalManager.js";
import { E2EValidator } from "../utils/E2EValidator.js";

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
      // Pre-validation: Ensure both users have encryption keys
      // Skip for groups because Group ID doesn't have keys (members do)
      let isValid = true;
      if (!selectedConversation.isGroup) {
        isValid = await E2EValidator.validateBeforeSend(
          authUser.user._id,
          selectedConversation._id,
        );
      } else {
        // For groups, validation happens implicitly during fan-out encryption
        isValid = true;
      }

      if (!isValid) {
        console.error("E2E encryption validation failed");
        // Still attempt to send, but log the warning
      }

      const encryptedPayload = await SignalManager.encryptMessage(
        selectedConversation?._id,
        newMessage,
        authUser?.user?._id,
        async (userId) => {
          const res = await axios.get(`/api/user/keys/fetch/${userId}`);
          return res.data;
        },
        selectedConversation.isGroup
          ? selectedConversation.members.map((m) =>
              typeof m === "object" ? m._id : m,
            )
          : null,
      );

      const res = await axios.post(
        `/api/message/send/${selectedConversation._id}`,
        { message: encryptedPayload, messageType },
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

      // Update last message preview for the sidebar
      const { updateLastMessage } = useConversation.getState();
      const messageTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const previewText =
        messageType === "text" ? newMessage : `[${messageType}]`;
      updateLastMessage(
        selectedConversation._id?.toString(),
        previewText,
        messageTime,
      );

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
