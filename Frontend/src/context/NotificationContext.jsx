import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import useConversation from "../zustand/useConversation";

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [unreadCounts, setUnreadCounts] = useState(() => {
    const saved = localStorage.getItem("chat_unread_counts");
    return saved ? JSON.parse(saved) : {};
  });
  const [notifications, setNotifications] = useState([]);
  const { selectedConversation } = useConversation();

  // Persist unread counts
  useEffect(() => {
    localStorage.setItem("chat_unread_counts", JSON.stringify(unreadCounts));
  }, [unreadCounts]);

  // Target clearing count when a conversation is opened
  useEffect(() => {
    if (selectedConversation?._id) {
      const id = selectedConversation._id.toString();
      console.log("NotificationContext: Clearing unread count for", id);
      setUnreadCounts((prev) => {
        if (prev[id]) {
          return { ...prev, [id]: 0 };
        }
        return prev;
      });
    }
  }, [selectedConversation?._id]);

  const incrementUnreadCount = useCallback((userId) => {
    if (!userId) return;
    const id = userId.toString();
    console.log("NotificationContext: Incrementing count for", id);
    setUnreadCounts((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  }, []);

  const addToast = useCallback((senderName, messageText, senderId) => {
    const id = Date.now();
    setNotifications((prev) => [
      ...prev,
      { id, senderName, messageText, senderId },
    ]);

    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCounts,
        incrementUnreadCount,
        notifications,
        addToast,
        removeToast,
      }}>
      {children}
    </NotificationContext.Provider>
  );
};
