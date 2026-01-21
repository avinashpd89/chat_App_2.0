import { getReceiverSocketId, io } from "../SocketIO/server.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.models.js";
import User from "../models/user.model.js";

export const createGroup = async (req, res) => {
    try {
        const { groupName, members, groupProfilePic } = req.body;
        const groupAdmin = req.user._id;

        if (!groupName || !members || !Array.isArray(members)) {
            return res.status(400).json({ error: "Group name and members are required" });
        }

        // Add admin to members if not already included
        const allMembers = Array.from(new Set([...members, groupAdmin.toString()]));

        // Enforce 50 member limit
        if (allMembers.length > 50) {
            return res.status(400).json({ error: "Maximum 50 members allowed in a group" });
        }

        if (allMembers.length < 2) {
            return res.status(400).json({ error: "Group must have at least one other member" });
        }

        const newGroup = new Conversation({
            isGroup: true,
            groupName,
            groupAdmin,
            groupProfilePic: groupProfilePic || "",
            members: allMembers,
            message: []
        });

        await newGroup.save();

        // Populate members before sending
        await newGroup.populate("members", "-password");

        // Notify all online members about the new group
        allMembers.forEach(memberId => {
            const socketId = getReceiverSocketId(memberId);
            if (socketId) {
                io.to(socketId).emit("newGroup", newGroup);
            }
        });

        res.status(201).json(newGroup);
    } catch (error) {
        console.log("Error in createGroup", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { message, messageType } = req.body;
        const { id: targetId } = req.params;
        const senderId = req.user._id;

        let conversation;
        let isGroupMsg = false;

        // Check if targetId is an existing group conversation
        conversation = await Conversation.findOne({ _id: targetId, isGroup: true });

        if (conversation) {
            isGroupMsg = true;
        } else {
            // Logic for 1-to-1 chat
            conversation = await Conversation.findOne({
                isGroup: false,
                members: { $all: [senderId, targetId] }
            });

            // If no conversation exists, create a new one
            if (!conversation) {
                conversation = new Conversation({
                    members: [senderId, targetId],
                    message: []
                });
            }
        }

        // receiverId in Message for groups will be the Conversation ID
        const receiverId = isGroupMsg ? targetId : targetId;

        const newMessage = new Message({
            senderId,
            receiverId,
            message,
            messageType: messageType || 'text'
        });

        await newMessage.save();

        if (!conversation.message) {
            conversation.message = [];
        }

        conversation.message.push(newMessage._id);
        await conversation.save();

        if (isGroupMsg) {
            // Broadcast to all group members except sender
            conversation.members.forEach(memberId => {
                if (memberId.toString() !== senderId.toString()) {
                    const socketId = getReceiverSocketId(memberId.toString());
                    if (socketId) {
                        io.to(socketId).emit("newMessage", newMessage);
                    }
                }
            });
        } else {
            // Standard 1-to-1 emit
            const receiverSocketId = getReceiverSocketId(targetId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("newMessage", newMessage);
            }
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
        const { id: targetId } = req.params;
        const senderId = req.user._id;

        let conversation;

        // Try to find if targetId is a group ID
        conversation = await Conversation.findOne({ _id: targetId, isGroup: true }).populate("message");

        if (!conversation) {
            // Fallback to 1-to-1 search
            conversation = await Conversation.findOne({
                isGroup: false,
                members: { $all: [senderId, targetId] },
            }).populate("message");
        }

        if (!conversation) {
            return res.status(201).json([]);
        }

        // Filter out messages deleted only by the current user
        const messages = conversation.message.filter(
            (msg) => !msg.deletedBy.includes(senderId)
        );

        res.status(201).json(messages);
    } catch (error) {
        console.log("Error in getMessage", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteChat = async (req, res) => {
    try {
        const { id: targetId } = req.params;
        const senderId = req.user._id;

        // Try to find if targetId is a group ID
        let conversation = await Conversation.findOne({ _id: targetId, isGroup: true, members: senderId });

        if (!conversation) {
            // Fallback to 1-to-1 search
            conversation = await Conversation.findOne({
                isGroup: false,
                members: { $all: [senderId, targetId] }
            });
        }

        if (!conversation) {
            return res.status(200).json({ message: "Conversation not found" });
        }

        // Soft delete messages (add senderId to deletedBy array)
        await Message.updateMany(
            { _id: { $in: conversation.message } },
            { $addToSet: { deletedBy: senderId } }
        );

        res.status(200).json({ message: "Conversation deleted successfully" });

    } catch (error) {
        console.log("Error in deleteChat", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const clearChat = async (req, res) => {
    try {
        const { id: targetId } = req.params;
        const senderId = req.user._id;

        // Try to find if targetId is a group ID
        let conversation = await Conversation.findOne({ _id: targetId, isGroup: true, members: senderId });

        if (!conversation) {
            // Fallback to 1-to-1 search
            conversation = await Conversation.findOne({
                isGroup: false,
                members: { $all: [senderId, targetId] }
            });
        }

        if (!conversation) {
            return res.status(200).json({ message: "Conversation not found" });
        }

        // Soft delete messages
        await Message.updateMany(
            { _id: { $in: conversation.message } },
            { $addToSet: { deletedBy: senderId } }
        );

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

            // Find the conversation to check if it's a group
            const conversation = await Conversation.findOne({ message: messageId });

            if (conversation && conversation.isGroup) {
                // Broadcast to all group members except sender
                conversation.members.forEach(memberId => {
                    if (memberId.toString() !== userId.toString()) {
                        const socketId = getReceiverSocketId(memberId.toString());
                        if (socketId) {
                            io.to(socketId).emit("messageDeleted", { messageId: message._id });
                        }
                    }
                });
            } else {
                // Standard 1-to-1 emit
                const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("messageDeleted", { messageId: message._id });
                }
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

export const updateGroup = async (req, res) => {
    try {
        const { id: conversationId } = req.params;
        const { groupName, groupProfilePic } = req.body;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ error: "Group not found" });
        }

        if (!conversation.isGroup) {
            return res.status(400).json({ error: "This is not a group conversation" });
        }

        // Check if current user is admin
        if (conversation.groupAdmin.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Only the group admin can update group details" });
        }

        // Update fields if provided
        if (groupName) conversation.groupName = groupName;
        // Check if groupProfilePic is strictly provided 
        if (groupProfilePic !== undefined) conversation.groupProfilePic = groupProfilePic;

        await conversation.save();

        // Repopulate members for the socket event
        await conversation.populate("members", "-password");

        // Notify all members about the update via Socket.IO
        conversation.members.forEach(member => {
            const memberId = member._id.toString();
            const socketId = getReceiverSocketId(memberId);
            if (socketId) {
                // Emit specific event for group update
                io.to(socketId).emit("groupUpdated", conversation);
            }
        });

        res.status(200).json(conversation);
    } catch (error) {
        console.log("Error in updateGroup", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const addMemberToGroup = async (req, res) => {
    try {
        const { id: conversationId } = req.params;
        const { userId: newMemberId } = req.body;
        const currentUserId = req.user._id;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ error: "Group not found" });
        }

        if (!conversation.isGroup) {
            return res.status(400).json({ error: "This is not a group conversation" });
        }

        // Check if current user is a member of the group
        if (!conversation.members.includes(currentUserId)) {
            return res.status(403).json({ error: "You are not a member of this group" });
        }

        // Check limit
        if (conversation.members.length >= 50) {
            return res.status(400).json({ error: "Group limit reached (50 members)" });
        }

        // Check if user already exists
        if (conversation.members.includes(newMemberId)) {
            return res.status(400).json({ error: "User is already in the group" });
        }

        // Add member
        conversation.members.push(newMemberId);
        await conversation.save();

        // Populate for response and socket
        await conversation.populate("members", "-password");

        // Notify existing members (Group Updated)
        conversation.members.forEach(member => {
            const mId = member._id.toString();
            // User just added needs "newGroup" event potentially, or we just rely on groupUpdated if we fix frontend.
            // But standard pattern: 
            // - Existing members need to see new member count -> groupUpdated
            // - New member needs to see the group in their list -> newGroup (or groupUpdated if upsert)

            const socketId = getReceiverSocketId(mId);
            if (socketId) {
                if (mId === newMemberId) {
                    // This is the new guy. Emit 'newGroup' so it pops in their list.
                    io.to(socketId).emit("newGroup", conversation);
                } else {
                    io.to(socketId).emit("groupUpdated", conversation);
                }
            }
        });


        res.status(200).json(conversation);

    } catch (error) {
        console.log("Error in addMemberToGroup", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const leaveGroup = async (req, res) => {
    try {
        const { id: conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ error: "Group not found" });
        }

        if (!conversation.isGroup) {
            return res.status(400).json({ error: "This is not a group conversation" });
        }

        // Check if user is actually in the group
        if (!conversation.members.includes(userId)) {
            return res.status(400).json({ error: "You are not a member of this group" });
        }

        // Remove user from members
        conversation.members = conversation.members.filter(
            member => member.toString() !== userId.toString()
        );

        // If no members left, delete the group
        if (conversation.members.length === 0) {
            await Conversation.findByIdAndDelete(conversationId);
            // Optionally delete messages here too
            return res.status(200).json({ message: "Group deleted as last member left", deleted: true, _id: conversationId });
        }

        // If admin left, assign new admin (next member in list)
        if (conversation.groupAdmin.toString() === userId.toString()) {
            conversation.groupAdmin = conversation.members[0];
        }

        await conversation.save();

        // Populate members to get fresh list for socket events
        await conversation.populate("members", "-password");

        // Notify remaining members
        conversation.members.forEach(member => {
            const socketId = getReceiverSocketId(member._id.toString());
            if (socketId) {
                io.to(socketId).emit("groupUpdated", conversation);
            }
        });

        res.status(200).json({ message: "Left group successfully", _id: conversationId });

    } catch (error) {
        console.log("Error in leaveGroup", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteGroup = async (req, res) => {
    try {
        const { id: conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ error: "Group not found" });
        }

        if (!conversation.isGroup) {
            return res.status(400).json({ error: "This is not a group conversation" });
        }

        // Check if current user is admin
        if (conversation.groupAdmin.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Only the group admin can delete the group" });
        }

        // Delete the conversation
        await Conversation.findByIdAndDelete(conversationId);

        // Notify all members
        conversation.members.forEach(member => {
            const socketId = getReceiverSocketId(member.toString());
            if (socketId) {
                io.to(socketId).emit("groupDeleted", conversationId);
            }
        });

        res.status(200).json({ message: "Group deleted successfully", _id: conversationId });

    } catch (error) {
        console.log("Error in deleteGroup", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { id: conversationId } = req.params;
        const userId = req.user._id;

        // Find all unread messages for this conversation where current user is the receiver
        const result = await Message.updateMany(
            {
                receiverId: userId,
                $or: [
                    { receiverId: conversationId },
                    { senderId: conversationId }
                ],
                isRead: false
            },
            { $set: { isRead: true } }
        );

        // Alternative: Mark messages in a specific conversation as read
        const conversation = await Conversation.findById(conversationId);
        
        if (conversation) {
            const messageIds = conversation.message;
            
            // Update all messages in this conversation to isRead: true for the current user
            await Message.updateMany(
                {
                    _id: { $in: messageIds },
                    receiverId: userId,
                    isRead: false
                },
                { $set: { isRead: true } }
            );
        }

        res.status(200).json({ message: "Messages marked as read" });

    } catch (error) {
        console.log("Error in markAsRead", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

