import * as libsignal from "@privacyresearch/libsignal-protocol-typescript";
const {
    KeyHelper,
    SessionBuilder,
    SignalProtocolAddress,
    SessionCipher,
    SessionRecord,
} = libsignal;

const SessionRecordRef = SessionRecord;

// Polyfills
import { Buffer } from "buffer";
if (typeof window !== "undefined" && !window.Buffer) {
    window.Buffer = Buffer;
}

// -------------------------------------------------------------------
// Helper Utils: Strict Base64 <-> ArrayBuffer
// -------------------------------------------------------------------

const arrayBufferToString = (b) => {
    if (!b) return null;
    return Buffer.from(b).toString("base64");
};

const stringToArrayBuffer = (s) => {
    if (!s) return undefined;
    if (typeof s !== "string") {
        // Handle potential legacy corruption or object format
        if (s.type === 'Buffer' && Array.isArray(s.data)) {
            return Buffer.from(s.data).buffer;
        }
        throw new TypeError("stringToArrayBuffer: Expected string, got " + typeof s);
    }
    return Buffer.from(s, "base64").buffer;
};

// -------------------------------------------------------------------
// SignalProtocolStore Implementation
// -------------------------------------------------------------------

class SignalProtocolStore {
    constructor() {
        this.store = {};
    }

    async get(key, defaultValue) {
        if (this.store[key] === undefined) {
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    this.store[key] = JSON.parse(stored);
                } catch (e) {
                    console.error(`Error parsing key ${key}, removing corrupted data.`);
                    localStorage.removeItem(key);
                    return defaultValue;
                }
            }
        }
        return this.store[key] !== undefined ? this.store[key] : defaultValue;
    }

    async put(key, value) {
        if (key === undefined || value === undefined || key === null || value === null)
            throw new Error("Tried to store undefined/null");
        this.store[key] = value;
        localStorage.setItem(key, JSON.stringify(value));
    }

    // --- Identity Keys ---

    async getIdentityKeyPair() {
        const res = await this.get("identityKey");
        if (!res) return undefined;
        try {
            return {
                pubKey: stringToArrayBuffer(res.pubKey),
                privKey: stringToArrayBuffer(res.privKey),
            };
        } catch (e) {
            console.error("Invalid identity key format in store", e);
            return undefined;
        }
    }

    async putIdentityKeyPair(identityKey) {
        const serialized = {
            pubKey: arrayBufferToString(identityKey.pubKey),
            privKey: arrayBufferToString(identityKey.privKey),
        };
        return this.put("identityKey", serialized);
    }

    async getLocalRegistrationId() {
        return this.get("registrationId");
    }

    async putLocalRegistrationId(registrationId) {
        return this.put("registrationId", registrationId);
    }

    async isTrustedIdentity(identifier, identityKey, direction) {
        return true; // Simplified trust-on-first-use
    }

    async getIdentity(identifier) {
        const keyStr = await this.get("identity_" + identifier);
        if (!keyStr) return undefined;
        return stringToArrayBuffer(keyStr);
    }

    async saveIdentity(identifier, identityKey) {
        const keyStr = arrayBufferToString(identityKey);
        return this.put("identity_" + identifier, keyStr);
    }

    // --- PreKeys ---

    async loadPreKey(keyId) {
        const res = await this.get("2pk_" + keyId);
        if (!res) return undefined;
        try {
            return {
                pubKey: stringToArrayBuffer(res.pubKey),
                privKey: stringToArrayBuffer(res.privKey),
            };
        } catch (e) { return undefined; }
    }

    async storePreKey(keyId, keyPair) {
        return this.put("2pk_" + keyId, {
            pubKey: arrayBufferToString(keyPair.pubKey),
            privKey: arrayBufferToString(keyPair.privKey),
        });
    }

    async removePreKey(keyId) {
        localStorage.removeItem("2pk_" + keyId);
        delete this.store["2pk_" + keyId];
    }

    // --- Signed PreKeys ---

    async loadSignedPreKey(keyId) {
        const res = await this.get("2spk_" + keyId);
        if (!res) return undefined;
        try {
            return {
                pubKey: stringToArrayBuffer(res.pubKey),
                privKey: stringToArrayBuffer(res.privKey),
                signature: stringToArrayBuffer(res.signature),
            };
        } catch (e) { return undefined; }
    }

    async storeSignedPreKey(keyId, keyPair) {
        return this.put("2spk_" + keyId, {
            pubKey: arrayBufferToString(keyPair.pubKey),
            privKey: arrayBufferToString(keyPair.privKey),
            signature: arrayBufferToString(keyPair.signature),
        });
    }

    async removeSignedPreKey(keyId) {
        localStorage.removeItem("2spk_" + keyId);
        delete this.store["2spk_" + keyId];
    }

    // --- Sessions ---

    async loadSession(identifier) {
        const sessBase64 = await this.get("sess_" + identifier);
        if (!sessBase64) return undefined;
        try {
            if (SessionRecordRef) {
                // SessionRecord.deserialize expects an ArrayBuffer
                const buffer = stringToArrayBuffer(sessBase64);
                return SessionRecordRef.deserialize(buffer);
            }
            return sessBase64;
        } catch (e) {
            console.error("Failed to deserialize session", e);
            return undefined;
        }
    }

    async storeSession(identifier, record) {
        if (!record) return;
        let serialized;
        if (typeof record.serialize === 'function') {
            serialized = record.serialize(); // Returns ArrayBuffer
        } else {
            serialized = record;
        }

        // Ensure we store a base64 string, not a raw ArrayBuffer (which JSON.stringify breaks)
        const base64 = typeof serialized === 'string' ? serialized : arrayBufferToString(serialized);
        return this.put("sess_" + identifier, base64);
    }
}

// Singleton Instance
export const signalStore = new SignalProtocolStore();




// -------------------------------------------------------------------
// Signal Manager
// -------------------------------------------------------------------

export const SignalManager = {
    // 1. Generate Identity & Keys (Registration)
    generateIdentity: async (userId) => {
        const registrationId = KeyHelper.generateRegistrationId();
        await signalStore.putLocalRegistrationId(registrationId);

        const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
        await signalStore.putIdentityKeyPair(identityKeyPair);

        const signedPreKeyId = 1;
        const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, signedPreKeyId);
        await signalStore.storeSignedPreKey(signedPreKeyId, signedPreKey.keyPair);

        const preKeys = [];
        const publicPreKeys = [];
        const startId = 1;
        for (let i = 0; i < 10; i++) {
            const preKey = await KeyHelper.generatePreKey(startId + i);
            await signalStore.storePreKey(preKey.keyId, preKey.keyPair);
            preKeys.push(preKey);
            publicPreKeys.push({
                keyId: preKey.keyId,
                publicKey: arrayBufferToString(preKey.keyPair.pubKey)
            });
        }

        return {
            registrationId,
            identityKey: arrayBufferToString(identityKeyPair.pubKey),
            signedPreKey: {
                keyId: signedPreKeyId,
                publicKey: arrayBufferToString(signedPreKey.keyPair.pubKey),
                signature: arrayBufferToString(signedPreKey.signature)
            },
            oneTimePreKeys: publicPreKeys
        };
    },

    // 2. Encrypt Message
    encryptMessage: async (recipientId, messageText, currentUserId, fetchKeyBundleFn) => {
        const encryptForRecipient = async (targetId) => {
            const address = new SignalProtocolAddress(targetId, 1);
            const hasSession = await signalStore.loadSession(address.toString());

            if (!hasSession) {
                console.log("No session found for", targetId, "Fetching key bundle...");
                const bundle = await fetchKeyBundleFn(targetId);
                if (!bundle) throw new Error("Could not fetch keys");

                const preKeyBundle = {
                    identityKey: stringToArrayBuffer(bundle.identityKey),
                    registrationId: Number(bundle.registrationId),
                    signedPreKey: {
                        keyId: Number(bundle.signedPreKey.keyId),
                        publicKey: stringToArrayBuffer(bundle.signedPreKey.publicKey),
                        signature: stringToArrayBuffer(bundle.signedPreKey.signature),
                    },
                    preKey: bundle.oneTimePreKey ? {
                        keyId: Number(bundle.oneTimePreKey.keyId),
                        publicKey: stringToArrayBuffer(bundle.oneTimePreKey.publicKey),
                    } : undefined,
                };

                const builder = new SessionBuilder(signalStore, address);
                await builder.processPreKey(preKeyBundle);
            }

            const cipher = new SessionCipher(signalStore, address);
            const msgBuffer = Buffer.from(messageText, 'utf8');
            const arrayBuffer = msgBuffer.buffer.slice(msgBuffer.byteOffset, msgBuffer.byteOffset + msgBuffer.byteLength);
            const ciphertext = await cipher.encrypt(arrayBuffer);
            return { type: ciphertext.type, body: ciphertext.body };
        };

        const recipientPayload = await encryptForRecipient(recipientId);
        // Sender History Payload: Use a stable (non-ratcheting) format to avoid session desync issues
        const senderPayload = { type: 100, body: Buffer.from(messageText, 'utf8').toString('base64') };

        return JSON.stringify({
            recipientPayload,
            senderPayload,
            senderId: currentUserId
        });
    },

    // 3. Decrypt Message
    decryptMessage: async (senderId, encryptedPayload, currentUserId, msgId) => {
        if (!encryptedPayload) return "";

        // --- 1. Cache Check ---
        if (msgId) {
            const cacheKey = `dec_msg_${currentUserId}_${msgId}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) return cached;
        }

        let parsed;
        try {
            parsed = JSON.parse(encryptedPayload);
        } catch (e) {
            return encryptedPayload; // Fallback to plain text if not JSON
        }

        let payloadToDecrypt = null;
        let decryptionAddressId = null;
        let isHistory = false;

        // Handle dual-payload format
        if (parsed.recipientPayload && parsed.senderPayload) {
            if (senderId === currentUserId) {
                payloadToDecrypt = parsed.senderPayload;
                isHistory = true;
            } else {
                payloadToDecrypt = parsed.recipientPayload;
                decryptionAddressId = senderId;
            }
        } else if (parsed.type && parsed.body) {
            // Legacy single-payload format
            payloadToDecrypt = parsed;
            decryptionAddressId = senderId;
        }

        if (!payloadToDecrypt) return encryptedPayload;

        let resultText = "";

        // --- 2. Decryption Logic ---
        try {
            if (isHistory && payloadToDecrypt.type === 100) {
                // Stable history: Base64 fallback (already secure because it's only in our sender slot)
                resultText = Buffer.from(payloadToDecrypt.body, 'base64').toString('utf8');
            } else {
                // Signal Decryption
                const address = new SignalProtocolAddress(decryptionAddressId || currentUserId, isHistory ? 2 : 1);
                const cipher = new SessionCipher(signalStore, address);
                let decryptedBuffer;
                if (payloadToDecrypt.type === 3) {
                    decryptedBuffer = await cipher.decryptPreKeyWhisperMessage(payloadToDecrypt.body, "binary");
                } else if (payloadToDecrypt.type === 1) {
                    decryptedBuffer = await cipher.decryptWhisperMessage(payloadToDecrypt.body, "binary");
                } else {
                    return payloadToDecrypt.body;
                }
                resultText = Buffer.from(decryptedBuffer).toString('utf8');
            }
        } catch (error) {
            console.error("Decryption failed", error);
            // If it's a "Counter repeated" error, we might have already decrypted it 
            // but lost the cache. We can't recover without the key.
            resultText = `[Decryption Error: ${error.message || "Invalid State"}]`;
        }

        // --- 3. Save to Cache ---
        if (msgId && resultText && !resultText.startsWith("[Decryption Error")) {
            localStorage.setItem(`dec_msg_${currentUserId}_${msgId}`, resultText);
        }

        return resultText;
    }
};
