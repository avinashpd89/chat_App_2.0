import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    ConfirmPassword: {
        type: String,
    },
    profilepic: {
        type: String,
        default: "",
    },
    publicKey: {
        type: String,
        required: true
    },
    contacts: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            nickname: {
                type: String,
                required: true
            }
        }
    ],
    blockedUsers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]
}, { timestamps: true })

const User = mongoose.model("User", userSchema);

export default User