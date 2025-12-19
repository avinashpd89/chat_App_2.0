import User from "../models/user.model.js";
import Conversation from "../models/conversation.model.js";
import bcrypt from "bcrypt";
import createTokenAndSaveCookie from "../jwt/generateToken.js";

// SIGN-UP
export const signup = async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;
    try {
        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match" });
        }
        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ error: "User already registered" });
        }
        const hashPassword = await bcrypt.hash(password, 10);
        const newUser = await new User({
            name,
            email,
            password: hashPassword
        });
        await newUser.save();
        if (newUser) {
            createTokenAndSaveCookie(newUser._id, res);
            res.status(201).json({
                message: "User created successfully",
                user: {
                    _id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    profilepic: newUser.profilepic
                }
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// LOGIN
export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Invalid User" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid User" });
        }
        createTokenAndSaveCookie(user._id, res);
        res.status(201).json({
            message: "User logged in successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilepic: user.profilepic
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// LOGOUT
export const logout = async (req, res) => {
    try {
        res.clearCookie("jwt");
        res.status(201).json({ message: "User logged out successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET USERS (Contacts + Strangers)
export const allUsers = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id)
            .populate("contacts.userId", "-password")
            .populate("blockedUsers");

        if (!currentUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // 1. Get Confirm Contacts
        const contactsMap = new Map();
        currentUser.contacts.forEach(contact => {
            if (contact.userId) {
                contactsMap.set(contact.userId._id.toString(), {
                    ...contact.userId.toObject(),
                    name: contact.nickname, // Use nickname
                    isContact: true
                });
            }
        });

        // 2. Find Strangers (Users from conversations who are NOT contacts and NOT blocked)
        const conversations = await Conversation.find({
            members: { $in: [currentUser._id] }
        }).populate("members", "-password");

        const blockedSet = new Set(currentUser.blockedUsers.map(u => u._id.toString()));

        conversations.forEach(conv => {
            conv.members.forEach(member => {
                const memberId = member._id.toString();
                // Skip self, already added contacts, and blocked users
                if (memberId !== currentUser._id.toString() &&
                    !contactsMap.has(memberId) &&
                    !blockedSet.has(memberId)) {

                    contactsMap.set(memberId, {
                        ...member.toObject(),
                        isContact: false // Mark as Stranger
                    });
                }
            });
        });

        const finalUserList = Array.from(contactsMap.values());

        res.status(201).json(finalUserList);
    } catch (error) {
        console.log("Error in allUsers Controller: " + error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// UPDATE USER (SELF)
export const updateUser = async (req, res) => {
    try {
        const { name, profilepic } = req.body;
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (name) user.name = name;
        if (profilepic) user.profilepic = profilepic;
        await user.save();
        res.status(200).json({
            message: "User updated successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilepic: user.profilepic
            }
        });
    } catch (error) {
        console.log("Error in updateUser Controller: " + error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// UPDATE OTHER USER (Local Rename / Nickname)
export const updateOtherUser = async (req, res) => {
    try {
        const { id } = req.params; // ID of the user to rename
        const { name } = req.body; // New nickname
        const currentUser = await User.findById(req.user._id);

        if (!currentUser) {
            return res.status(404).json({ error: "Current user not found" });
        }

        // Check if contact already exists in contacts array
        const contactIndex = currentUser.contacts.findIndex(c => c.userId.toString() === id);

        if (contactIndex > -1) {
            // Update existing nickname
            currentUser.contacts[contactIndex].nickname = name;
        } else {
            // Add new contact with nickname
            currentUser.contacts.push({ userId: id, nickname: name });
        }

        await currentUser.save();
        res.status(200).json({ message: "Nickname updated successfully" });
    } catch (error) {
        console.log("Error in updateOtherUser: " + error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// DELETE USER
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        await User.findByIdAndDelete(id);
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.log("Error in deleteUser: " + error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ADD CONTACT (By Email)
export const addContact = async (req, res) => {
    try {
        const { email } = req.body;
        const currentUser = await User.findById(req.user._id);
        const userToAdd = await User.findOne({ email });

        if (!userToAdd) {
            return res.status(404).json({ error: "User not found with this email" });
        }

        if (userToAdd._id.toString() === currentUser._id.toString()) {
            return res.status(400).json({ error: "You cannot add yourself" });
        }

        const isAlreadyContact = currentUser.contacts.some(c => c.userId.toString() === userToAdd._id.toString());
        if (isAlreadyContact) {
            return res.status(400).json({ error: "User already in contacts" });
        }

        // Remove from blocked list if present
        currentUser.blockedUsers = currentUser.blockedUsers.filter(id => id.toString() !== userToAdd._id.toString());

        currentUser.contacts.push({
            userId: userToAdd._id,
            nickname: userToAdd.name
        });

        await currentUser.save();

        res.status(200).json({
            message: "Contact added successfully",
            user: {
                _id: userToAdd._id,
                name: userToAdd.name,
                email: userToAdd.email,
                profilepic: userToAdd.profilepic,
                isContact: true
            }
        });
    } catch (error) {
        console.log("Error in addContact: " + error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// REMOVE CONTACT
export const removeContact = async (req, res) => {
    try {
        const { contactId } = req.body; // userId of the contact to remove
        const currentUser = await User.findById(req.user._id);

        if (!currentUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // Filter out the contact
        currentUser.contacts = currentUser.contacts.filter(c => c.userId.toString() !== contactId);

        await currentUser.save();
        res.status(200).json({ message: "Contact removed successfully" });
    } catch (error) {
        console.log("Error in removeContact: " + error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// BLOCK USER
export const blockUser = async (req, res) => {
    try {
        const { blockId } = req.body;
        const currentUser = await User.findById(req.user._id);

        if (!currentUser) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!currentUser.blockedUsers.includes(blockId)) {
            currentUser.blockedUsers.push(blockId);
        }

        // Use $pull for atomic removal (safer) or filter like this
        currentUser.contacts = currentUser.contacts.filter(c => c.userId.toString() !== blockId);

        await currentUser.save();
        res.status(200).json({ message: "User blocked successfully" });
    } catch (error) {
        console.log("Error in blockUser: " + error);
        res.status(500).json({ error: "Internal server error" });
    }
};
