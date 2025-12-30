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
          let decryptionErrors = 0;

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
              // console.error("Single message decryption failed", err);
              decryptionErrors++;

              // Try to extract plaintext fallback from the encrypted payload
              let fallbackMessage = "[Decryption Error]";
              try {
                const parsed = JSON.parse(msg.message);
                if (parsed.plaintext) {
                  fallbackMessage = parsed.plaintext;
                } else if (parsed.senderPayload?.body) {
                  fallbackMessage = Buffer.from(
                    parsed.senderPayload.body,
                    "base64"
                  ).toString("utf8");
                }
              } catch (e) {
                // Payload not JSON, use original
                fallbackMessage = msg.message;
              }

              decryptedMessages.push({
                ...msg,
                message: fallbackMessage,
              });
            }
          }

          // Log if there were multiple decryption errors (session corruption likely)
          // if (decryptionErrors > 0) {
          //   console.warn(`${decryptionErrors} messages had decryption errors out of ${res.data.length}`);
          // }

          // Update last message preview for the sidebar
          if (decryptedMessages.length > 0) {
            const { updateLastMessage } = useConversation.getState();
            const lastOne = decryptedMessages[decryptedMessages.length - 1];
            const time = new Date(lastOne.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const preview =
              lastOne.messageType === "text"
                ? lastOne.message
                : `[${lastOne.messageType}]`;
            updateLastMessage(
              selectedConversation._id?.toString(),
              preview,
              time
            );
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
