import CryptoJS from "crypto-js";

// TODO: Use a secure key from environment variables in production
const SECRET_KEY = "secure_chat_app_encryption_key";

export const encryptMessage = (message) => {
    if (!message) return "";
    try {
        return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
    } catch (error) {
        console.error("Encryption failed:", error);
        return message;
    }
};

export const decryptMessage = (encryptedMessage) => {
    if (!encryptedMessage) return "";
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedMessage, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        // If decrypted string is empty, it might be an old unencrypted message or failed decryption
        return decrypted || encryptedMessage;
    } catch (error) {
        // Fallback for old unencrypted messages
        return encryptedMessage;
    }
};
