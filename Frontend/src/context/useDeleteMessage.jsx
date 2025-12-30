import React, { useState } from "react";
import axios from "axios";
import useConversation from "../zustand/useConversation";
import toast from "react-hot-toast";
import { useAuth } from "./Authprovider.jsx";

const useDeleteMessage = () => {
  const [authUser] = useAuth();
  const [loading, setLoading] = useState(false);
  const { message, setMessage, selectedConversation } = useConversation();

  const deleteMessage = async (messageId, type = "me") => {
    setLoading(true);
    try {
      await axios.delete(
        `/api/message/deleteMessage/${messageId}?type=${type}`
      );

      const targetId = selectedConversation?._id?.toString();

      if (type === "everyone") {
        const updatedMessages = message.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                message: "[Message deleted]",
                isDeletedForEveryone: true,
              }
            : msg
        );
        setMessage(updatedMessages);

        // Update sidebar if this was the last message
        if (
          targetId &&
          updatedMessages[updatedMessages.length - 1]?._id === messageId
        ) {
          const time = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          useConversation
            .getState()
            .updateLastMessage(targetId, "[Message deleted]", time);
        }
      } else {
        const filteredMessages = message.filter((msg) => msg._id !== messageId);
        setMessage(filteredMessages);

        // Update sidebar if the last visible message was removed
        if (targetId) {
          if (filteredMessages.length === 0) {
            useConversation.getState().clearLastMessage(targetId);
          } else if (message[message.length - 1]?._id === messageId) {
            const newLast = filteredMessages[filteredMessages.length - 1];
            const time = new Date(newLast.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const previewText =
              newLast.messageType === "text"
                ? newLast.message
                : `[${newLast.messageType}]`;
            useConversation
              .getState()
              .updateLastMessage(targetId, previewText, time);
          }
        }
      }

      toast.success(
        type === "everyone" ? "Message deleted for everyone" : "Message deleted"
      );
    } catch (error) {
      console.log("Error deleting message", error);
      toast.error("Failed to delete message");
    } finally {
      setLoading(false);
    }
  };

  return { loading, deleteMessage };
};

export default useDeleteMessage;
