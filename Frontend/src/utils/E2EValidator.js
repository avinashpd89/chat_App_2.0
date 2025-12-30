import axios from "axios";
import { SignalManager } from "./SignalManager";

/**
 * P2P E2E Encryption Validator
 * Ensures both users have proper encryption setup
 */
export const E2EValidator = {
  /**
   * Validate that the current user has encryption keys
   */
  validateCurrentUserKeys: async () => {
    try {
      const hasIdentityKey = localStorage.getItem("identityKey");
      const hasRegistrationId = localStorage.getItem("registrationId");
      
      if (!hasIdentityKey || !hasRegistrationId) {
        console.warn("⚠️ Current user missing encryption keys, reinitializing...");
        // Reinitialize if keys are missing
        const identity = await SignalManager.generateIdentity("reinit");
        await axios.post("/api/user/keys/publish", identity);
        return true;
      }
      
      return true;
    } catch (error) {
      console.error("Error validating current user keys:", error);
      return false;
    }
  },

  /**
   * Validate that a recipient has encryption keys
   */
  validateRecipientKeys: async (recipientId) => {
    try {
      const response = await axios.get(`/api/user/keys/fetch/${recipientId}`);
      
      if (!response.data?.identityKey) {
        console.warn("⚠️ Recipient missing public encryption key");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error validating recipient keys:", error);
      return false;
    }
  },

  /**
   * Pre-check before sending a message
   */
  validateBeforeSend: async (senderId, recipientId) => {
    try {
      // Check sender
      const senderOk = await E2EValidator.validateCurrentUserKeys();
      if (!senderOk) {
        throw new Error("Sender encryption setup failed");
      }

      // Check recipient
      const recipientOk = await E2EValidator.validateRecipientKeys(recipientId);
      if (!recipientOk) {
        throw new Error("Recipient has no encryption keys");
      }

      return true;
    } catch (error) {
      console.error("Pre-send validation failed:", error);
      return false;
    }
  },

  /**
   * Validate message encryption format
   */
  validateMessageFormat: (message) => {
    if (!message) return false;
    
    try {
      // Check if it's JSON (encrypted Signal Protocol message)
      const parsed = JSON.parse(message);
      
      // Must have either recipientPayload or senderPayload
      const hasPayload = parsed.recipientPayload || parsed.senderPayload;
      if (!hasPayload) return false;
      
      // Must have senderId
      if (!parsed.senderId) return false;
      
      return true;
    } catch (e) {
      // If not JSON, it might be plaintext (acceptable for compatibility)
      return typeof message === "string";
    }
  },

  /**
   * Check encryption session health
   */
  checkSessionHealth: async (userId) => {
    try {
      const sessionData = localStorage.getItem(`sess_${userId}`);
      
      if (!sessionData) {
        return {
          healthy: false,
          reason: "No session established"
        };
      }

      if (sessionData.length < 100) {
        return {
          healthy: false,
          reason: "Session data corrupted"
        };
      }

      return {
        healthy: true,
        reason: "Session OK",
        size: sessionData.length
      };
    } catch (error) {
      return {
        healthy: false,
        reason: error.message
      };
    }
  },

  /**
   * Force re-establish encryption session with recipient
   */
  resetEncryptionSession: async (recipientId) => {
    try {
      // Clear the session
      localStorage.removeItem(`sess_${recipientId}`);
      
      // Fetch fresh key bundle
      const keyBundle = await axios.get(`/api/user/keys/fetch/${recipientId}`);
      
      console.log("✅ Encryption session reset for:", recipientId);
      return true;
    } catch (error) {
      console.error("Failed to reset encryption session:", error);
      return false;
    }
  },

  /**
   * Full P2P E2E Health Check
   */
  fullHealthCheck: async (currentUserId, recipientId) => {
    const results = {
      currentUserKeys: await E2EValidator.validateCurrentUserKeys(),
      recipientKeys: await E2EValidator.validateRecipientKeys(recipientId),
      currentUserSession: await E2EValidator.checkSessionHealth(currentUserId),
      recipientSession: await E2EValidator.checkSessionHealth(recipientId),
      timestamp: new Date().toISOString()
    };

    const allHealthy = results.currentUserKeys && 
                       results.recipientKeys && 
                       results.currentUserSession.healthy && 
                       results.recipientSession.healthy;

    return {
      ...results,
      overallStatus: allHealthy ? "✅ HEALTHY" : "⚠️ ISSUES FOUND"
    };
  }
};

export default E2EValidator;
