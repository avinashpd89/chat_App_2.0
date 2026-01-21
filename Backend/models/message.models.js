import mongoose from "mongoose";


const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'video', 'document'],
        default: 'text'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    deletedBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    isDeletedForEveryone: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

const Message = mongoose.model("message", messageSchema);

export default Message;