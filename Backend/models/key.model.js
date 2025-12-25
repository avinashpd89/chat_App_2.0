import mongoose from "mongoose";

const keySchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    identityKey: {
        type: String, // Base64 or Hex
        required: true
    },
    registrationId: {
        type: Number,
        required: true
    },
    signedPreKey: {
        keyId: { type: Number, required: true },
        publicKey: { type: String, required: true },
        signature: { type: String, required: true }
    },
    // Array of OTP keys. We might just store a subset or all. 
    // In a real app, we delete them as they are used.
    oneTimePreKeys: [
        {
            keyId: { type: Number, required: true },
            publicKey: { type: String, required: true }
        }
    ]
}, { timestamps: true });

const Key = mongoose.model("Key", keySchema);

export default Key;
