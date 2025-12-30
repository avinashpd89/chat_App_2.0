import { getReceiverSocketId, io } from "../SocketIO/server.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.models.js";

export const sendMessage = async (req, res) => {
    try {
        const { message, messageType } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let conversation = await Conversation.findOne({
            members: { $all: [senderId, receiverId] }
        });

        // If no conversation exists, create a new one
        if (!conversation) {
            conversation = new Conversation({
                members: [senderId, receiverId],
                message: []
            });
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            message,
            messageType: messageType || 'text'
        });

        await newMessage.save();

        // Ensure messages array is initialized
        if (!conversation.message) {
            conversation.message = [];
        }

        conversation.message.push(newMessage._id);
        await conversation.save();
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage)
        }
        res.status(201).json({
            message: "Message sent successfully",
            newMessage
        });

    } catch (error) {
        console.log("Error in sendMessage", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


export const getMessage = async (req, res) => {
    try {
        const { id: chatUser } = req.params;
        const senderId = req.user._id;
        let conversation = await Conversation.findOne({
            members: { $all: [senderId, chatUser] },
        }).populate("message");
        if (!conversation) {
            return res.status(201).json([])
        }

        // Filter out messages deleted only by the current user ("Delete for me")
        const messages = conversation.message.filter(
            (msg) => !msg.deletedBy.includes(senderId)
        );

        res.status(201).json(messages);
    } catch (error) {
        console.log("Error in getMessage", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const deleteChat = async (req, res) => {
    try {
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        const conversation = await Conversation.findOne({
            members: { $all: [senderId, receiverId] }
        });

        if (!conversation) {
            return res.status(200).json({ message: "Conversation not found" });
        }

        // Soft delete messages (add senderId to deletedBy array)
        await Message.updateMany(
            { _id: { $in: conversation.message } },
            { $addToSet: { deletedBy: senderId } }
        );

        // We do NOT delete the conversation document itself anymore, 
        // as the other user still needs it. 
        // If both users delete it, we could technically clean it up, but for "Delete for me", keeping it is safer.

        // Optionally, we could remove the conversation from the sidebar if we had a "hiddenConversation" logic,
        // but for now, we just clear the messages view.

        res.status(200).json({ message: "Conversation deleted successfully" });

    } catch (error) {
        console.log("Error in deleteChat", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const clearChat = async (req, res) => {
    try {
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        const conversation = await Conversation.findOne({
            members: { $all: [senderId, receiverId] }
        });

        if (!conversation) {
            return res.status(200).json({ message: "Conversation not found" });
        }

        // Soft delete messages
        await Message.updateMany(
            { _id: { $in: conversation.message } },
            { $addToSet: { deletedBy: senderId } }
        );

        // We do NOT empty conversation.message array effectively for the other user.
        // conversation.message = []; // REMOVED hard clear

        res.status(200).json({ message: "Chat cleared successfully" });

    } catch (error) {
        console.log("Error in clearChat", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const deleteMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const { type } = req.query; // 'me' or 'everyone'
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }

        if (type === 'everyone') {
            // Check if requester is sender
            if (message.senderId.toString() !== userId.toString()) {
                return res.status(403).json({ error: "Unauthorized to delete for everyone" });
            }
            message.isDeletedForEveryone = true;
            message.message = "[Message deleted]";
            await message.save();

            // Emit socket event to the receiver
            const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("messageDeleted", { messageId: message._id });
            }
        } else {
            // Delete for me
            await Message.findByIdAndUpdate(
                messageId,
                { $addToSet: { deletedBy: userId } }
            );
        }

        res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
        console.log("Error in deleteMessage", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

