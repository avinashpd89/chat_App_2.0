// encryption.js
// Using Web Crypto API for ECDH and AES-GCM

// 1. Generate ECDH Key Pair (P-256)
export const generateKeyPair = async () => {
    try {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-256",
            },
            true, // extractable
            ["deriveKey", "deriveBits"]
        );

        const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
        const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

        return {
            publicKey: JSON.stringify(publicKeyJwk),
            privateKey: JSON.stringify(privateKeyJwk)
        };
    } catch (error) {
        console.error("Error generating keys:", error);
        throw error;
    }
};

// 2. Derive Shared Secret (AES-GCM Key) from my Private Key and their Public Key
export const deriveSharedSecret = async (myPrivateKeyJwkStr, theirPublicKeyJwkStr) => {
    try {
        if (!myPrivateKeyJwkStr || !theirPublicKeyJwkStr) {
            console.error("Missing keys for derivation");
            return null;
        }

        const myPrivateKey = await window.crypto.subtle.importKey(
            "jwk",
            JSON.parse(myPrivateKeyJwkStr),
            { name: "ECDH", namedCurve: "P-256" },
            false,
            ["deriveKey", "deriveBits"]
        );

        const theirPublicKey = await window.crypto.subtle.importKey(
            "jwk",
            JSON.parse(theirPublicKeyJwkStr),
            { name: "ECDH", namedCurve: "P-256" },
            false,
            []
        );

        const derivedKey = await window.crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: theirPublicKey,
            },
            myPrivateKey,
            {
                name: "AES-GCM",
                length: 256,
            },
            true, // extractable
            ["encrypt", "decrypt"]
        );

        return derivedKey;
    } catch (error) {
        console.error("Error deriving shared secret:", error);
        return null;
    }
};

// 3. Encrypt Message (AES-GCM)
export const encryptMessage = async (message, sharedKey) => {
    try {
        if (!message || !sharedKey) {
            console.warn("Missing message or sharedKey for encryption");
            return message;
        }
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(message);

        // IV must be unique for every encryption. 12 bytes is standard for GCM.
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            sharedKey,
            encodedData
        );

        // Combine IV + Encrypted Data -> Base64 String
        const encryptedArray = new Uint8Array(encryptedBuffer);
        const combined = new Uint8Array(iv.length + encryptedArray.length);
        combined.set(iv);
        combined.set(encryptedArray, iv.length);

        return btoa(String.fromCharCode(...combined));
    } catch (error) {
        console.error("Encryption failed:", error);
        return "";
    }
};

// 4. Decrypt Message (AES-GCM)
export const decryptMessage = async (encryptedMessage, sharedKey) => {
    try {
        if (!encryptedMessage || !sharedKey) return encryptedMessage;

        // Check if message is possibly legacy (not base64 or too short) or just plain text
        // But assuming we want strict E2EE.

        let combined;
        try {
            const combinedString = atob(encryptedMessage);
            combined = new Uint8Array(combinedString.length);
            for (let i = 0; i < combinedString.length; i++) {
                combined[i] = combinedString.charCodeAt(i);
            }
        } catch (e) {
            // Not base64, assume plain text from old system or failed
            return encryptedMessage;
        }

        if (combined.length < 13) return encryptedMessage; // Too short for IV + tag

        // Extract IV (first 12 bytes)
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            sharedKey,
            data
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (error) {
        // console.error("Decryption failed:", error);
        // Silent fail: it might be an unencrypted message or different key. 
        // Return original text if decryption fails.
        return encryptedMessage;
    }
};
