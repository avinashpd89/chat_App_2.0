import React, { useEffect } from "react";
import { useSocketContext } from "./SocketContext.jsx";
import useConversation from "../zustand/useConversation.js";
import sound from "../assets/sound.mp3";
import axios from "axios";
import Cookies from "js-cookie";
import { useAuth } from "./Authprovider.jsx";

import { SignalManager } from "../utils/SignalManager.js";

import { useNotifications } from "./NotificationContext";

function useGetSocketMessage() {
  const { socket } = useSocketContext();
  const { message, setMessage, users, setUsers, selectedConversation } =
    useConversation();
  const [authUser] = useAuth();
  const { incrementUnreadCount, addToast } = useNotifications();

  useEffect(() => {
    if (!socket) return;

    socket.on("newMessage", async (newMessage) => {
      console.log("Socket: New message received", newMessage);

      // Validate that this message is actually for us (extra safety)
      const currentAuthId = authUser?.user?._id?.toString();

      // Removed incorrect receiverId check that was blocking group messages
      // The server ensures delivery to correct sockets.
      // Sound will be played later if chat is open

      let decryptedMessage = "";
      try {
        decryptedMessage = await SignalManager.decryptMessage(
          newMessage.senderId,
          newMessage.message,
          authUser?.user?._id,
          newMessage._id,
        );
      } catch (decryptError) {
        console.error("Socket message decryption error:", decryptError);
        decryptedMessage = "[Message could not be decrypted]";
      }

      const decryptedMsg = {
        ...newMessage,
        message: decryptedMessage,
      };

      // Get LATEST state from store to avoid stale closure issues
      const { selectedConversation: currentSelection, users: currentUsers } =
        useConversation.getState();

      const senderId = newMessage.senderId?.toString();
      const currentSelectionId = currentSelection?._id?.toString();
      const authUserId = authUser?.user?._id?.toString();
      const isGroupMsg = newMessage.receiverId !== authUserId;
      const conversationId = isGroupMsg ? newMessage.receiverId : senderId;

      console.log("Socket: Logic check", {
        senderId,
        currentSelectionId,
        authUserId,
        receiverId: newMessage.receiverId,
        isGroupMsg,
        conversationId,
      });

      // Update last message metadata for sidebar
      const { updateLastMessage, groups } = useConversation.getState();
      const messageTime = new Date(
        newMessage.createdAt || Date.now(),
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const previewText =
        newMessage.messageType === "text"
          ? decryptedMessage
          : `[${newMessage.messageType}]`;

      updateLastMessage(conversationId, previewText, messageTime);

      // Play notification sound for all messages from other users
      if (senderId !== authUserId) {
        const notification = new Audio(sound);
        const playPromise = notification.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error("Socket: Audio playback failed:", error);
          });
        }
      }

      // Only append if viewing this conversation
      // For 1-on-1: currentSelectionId === senderId
      // For Group: currentSelectionId === newMessage.receiverId (the group ID)
      const isChatOpen = currentSelectionId === conversationId;

      console.log("Is chat open?", {
        isChatOpen,
        currentSelectionId,
        conversationId,
        willPlaySound: isChatOpen && senderId !== authUserId,
      });

      if (isChatOpen) {
        console.log("Socket: Appending to current conversation");
        setMessage((prev) => [...prev, decryptedMsg]);
      } else if (senderId !== authUserId) {
        // Trigger notification for background messages
        console.log(
          "Socket: Triggering unread/toast for background chat",
          conversationId,
        );
        incrementUnreadCount(conversationId);

        // Find sender name for the toast
        const sender = currentUsers.find((u) => u._id?.toString() === senderId);
        let title = sender ? sender.name : "New Message";

        if (isGroupMsg) {
          const group = groups.find((g) => g._id === conversationId);
          const groupName = group ? group.groupName : "Group";
          title = `${groupName} (${title})`;
        }

        addToast(title, previewText, conversationId);
      }

      // Check if sender is in the current list
      const senderExists = currentUsers.some(
        (user) => user._id?.toString() === senderId,
      );

      if (!senderExists && !isGroupMsg) {
        console.log("Socket: Sender not in list, refreshing users");
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

    socket.on("messageDeleted", ({ messageId }) => {
      console.log("Socket: Message deleted for everyone", messageId);

      const { updateLastMessage, message: currentMessages } =
        useConversation.getState();

      // Update the message in the current list
      setMessage((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                message: "[Message deleted]",
                isDeletedForEveryone: true,
              }
            : msg,
        ),
      );

      // If it was the last message, update the sidebar preview
      const lastMsg = currentMessages[currentMessages.length - 1];
      if (lastMsg?._id === messageId) {
        const senderId = lastMsg.senderId?.toString();
        const time = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        updateLastMessage(senderId, "[Message deleted]", time);
      }
    });

    return () => {
      socket.off("newMessage");
      socket.off("messageDeleted");
    };
  }, [
    socket,
    setMessage,
    setUsers,
    incrementUnreadCount,
    addToast,
    authUser?.user?._id,
  ]);
}

export default useGetSocketMessage;
