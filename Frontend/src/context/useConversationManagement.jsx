import { useState } from "react";
import useConversation from "../zustand/useConversation.js";
import axios from "axios";
import toast from "react-hot-toast";

const useConversationManagement = () => {
  const {
    selectedConversation,
    setSelectedConversation,
    setMessage,
    users,
    setUsers,
  } = useConversation();
  const [loading, setLoading] = useState(false);

  const deleteChat = async () => {
    if (!selectedConversation) return;

    setLoading(true);
    try {
      await axios.delete(`/api/message/delete/${selectedConversation._id}`);
      // Success toast handled by UI or suppressed
      setSelectedConversation(null);
      setMessage([]);
    } catch (error) {
      console.log(error);
      toast.error("Failed to delete conversation");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    if (!selectedConversation) return;

    setLoading(true);
    try {
      await axios.post(`/api/message/clear/${selectedConversation._id}`);
      // Success toast handled by UI or suppressed
      setMessage([]);
    } catch (error) {
      console.log(error);
      toast.error("Failed to clear chat");
    } finally {
      setLoading(false);
    }
  };

  const removeContact = async () => {
    if (!selectedConversation) return;
    setLoading(true);
    try {
      await axios.post(`/api/user/remove-contact`, {
        contactId: selectedConversation._id,
      });
      // toast.success("Contact removed");
      // Remove user from global list immediately
      setUsers(users.filter((u) => u._id !== selectedConversation._id));
      setSelectedConversation(null); // Deselect the user
    } catch (error) {
      console.log(error);
      toast.error("Failed to remove contact");
    } finally {
      setLoading(false);
    }
  };

  return { deleteChat, clearChat, removeContact, loading };
};

export default useConversationManagement;
