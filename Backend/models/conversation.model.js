import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "./message.models.js";

const conversationSchema = new mongoose.Schema({
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: User
        }
    ],

    message: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: Message,
            default: []
        }
    ],

    isGroup: {
        type: Boolean,
        default: false
    },

    groupName: {
        type: String,
        default: ""
    },

    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User
    },

    groupProfilePic: {
        type: String,
        default: ""
    }

}, { timestamps: true })

const Conversation = mongoose.model("conversation", conversationSchema);

export default Conversation;