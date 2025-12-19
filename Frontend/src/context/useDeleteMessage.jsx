import React, { useState } from "react";
import axios from "axios";
import useConversation from "../zustand/useConversation";
import toast from "react-hot-toast";

const useDeleteMessage = () => {
  const [loading, setLoading] = useState(false);
  const { message, setMessage } = useConversation();

  const deleteMessage = async (messageId) => {
    setLoading(true);
    try {
      await axios.delete(`/api/message/deleteMessage/${messageId}`);

      // Update local state by removing the deleted message
      setMessage(message.filter((msg) => msg._id !== messageId));

      toast.success("Message deleted");
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
