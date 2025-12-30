// Session Recovery Utility
// Use this to manually reset encryption sessions if issues persist

export const SessionRecoveryUtil = {
    // Clear all encryption sessions (full reset)
    clearAllSessions: () => {
        try {
            const keysToDelete = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('sess_') || key.startsWith('dec_msg_') || key.startsWith('2pk_') || key.startsWith('2spk_'))) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => localStorage.removeItem(key));
            console.log("✅ Cleared all encryption sessions:", keysToDelete.length);
            return true;
        } catch (error) {
            console.error("Error clearing sessions:", error);
            return false;
        }
    },

    // Clear sessions for a specific user
    clearSessionForUser: (userId) => {
        try {
            localStorage.removeItem(`sess_${userId}`);
            localStorage.removeItem(`identity_${userId}`);
            
            // Clear all messages cached from this user
            const keysToDelete = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes(`dec_msg_`) && key.includes(userId)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => localStorage.removeItem(key));
            console.log(`✅ Cleared sessions for user ${userId}`);
            return true;
        } catch (error) {
            console.error("Error clearing user session:", error);
            return false;
        }
    },

    // Get encryption session status
    getSessionStatus: () => {
        try {
            const status = {
                totalSessionRecords: 0,
                totalCachedMessages: 0,
                identityKeys: 0,
                preKeys: 0,
                signedPreKeys: 0,
                sessions: []
            };

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;

                if (key.startsWith('sess_')) {
                    status.totalSessionRecords++;
                    const userId = key.replace('sess_', '');
                    status.sessions.push({
                        userId,
                        type: 'session',
                        size: localStorage.getItem(key).length
                    });
                } else if (key.startsWith('dec_msg_')) {
                    status.totalCachedMessages++;
                } else if (key.startsWith('identity_')) {
                    status.identityKeys++;
                } else if (key.startsWith('2pk_')) {
                    status.preKeys++;
                } else if (key.startsWith('2spk_')) {
                    status.signedPreKeys++;
                }
            }

            console.log("📊 Encryption Session Status:", status);
            return status;
        } catch (error) {
            console.error("Error getting session status:", error);
            return null;
        }
    },

    // Validate if a session is healthy
    validateSession: (userId) => {
        try {
            const sessionData = localStorage.getItem(`sess_${userId}`);
            if (!sessionData) {
                return { valid: false, reason: "No session found" };
            }

            if (sessionData.length < 100) {
                return { valid: false, reason: "Session data too small (corrupted?)" };
            }

            try {
                JSON.parse(sessionData);
                return { valid: true, reason: "Session appears healthy", size: sessionData.length };
            } catch (e) {
                return { valid: false, reason: "Session data invalid JSON" };
            }
        } catch (error) {
            return { valid: false, reason: error.message };
        }
    },

    // Force refresh user's key bundle (requires fetchKeyBundleFn)
    refreshKeyBundle: async (userId, fetchKeyBundleFn) => {
        try {
            // Clear the old session
            localStorage.removeItem(`sess_${userId}`);
            delete window.signalStore?.store?.[`sess_${userId}`];

            // Fetch fresh key bundle
            const bundle = await fetchKeyBundleFn(userId);
            console.log(`✅ Refreshed key bundle for user ${userId}`);
            return { success: true, bundle };
        } catch (error) {
            console.error("Error refreshing key bundle:", error);
            return { success: false, error: error.message };
        }
    },

    // Emergency reset - clears all encryption data (use only if nothing works)
    emergencyReset: () => {
        try {
            const confirmReset = window.confirm(
                "⚠️  This will clear ALL encryption data. Messages will need new sessions. Continue?"
            );
            
            if (!confirmReset) return false;

            const keysToDelete = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (
                    key.startsWith('sess_') ||
                    key.startsWith('dec_msg_') ||
                    key.startsWith('2pk_') ||
                    key.startsWith('2spk_') ||
                    key.startsWith('identity_') ||
                    key === 'registrationId' ||
                    key === 'identityKey'
                )) {
                    keysToDelete.push(key);
                }
            }
            
            keysToDelete.forEach(key => localStorage.removeItem(key));
            
            // Clear in-memory store as well
            if (window.signalStore) {
                window.signalStore.store = {};
            }

            console.log("🔄 Emergency encryption reset complete. Total cleared:", keysToDelete.length);
            console.log("⚠️  Page will reload to reinitialize encryption");
            setTimeout(() => window.location.reload(), 1000);
            return true;
        } catch (error) {
            console.error("Error during emergency reset:", error);
            return false;
        }
    }
};

// Export for manual use in browser console
if (typeof window !== 'undefined') {
    window.SessionRecoveryUtil = SessionRecoveryUtil;
}

export default SessionRecoveryUtil;
