import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";

export const AuthContext = createContext();

// Utility to clean up corrupted encryption sessions
const cleanupCorruptedSessions = () => {
  try {
    // Clear old corrupted signal sessions that may be causing Bad MAC errors
    const keysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Clear BOTH corrupted sessions and the decryption cache to free up space
      if (key && (key.startsWith("sess_") || key.startsWith("dec_msg_"))) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => localStorage.removeItem(key));
    // console.log("Storage clean! Removed", keysToDelete.length, "items.");
  } catch (error) {
    console.error("Error cleaning up sessions:", error);
  }
};

export const Authprovider = ({ children }) => {
  const initialUserState =
    Cookies.get("jwt") || localStorage.getItem("ChatApp");

  const [authUser, setAuthUser] = useState(
    initialUserState ? JSON.parse(initialUserState) : undefined
  );

  // Clean up corrupted sessions on auth state change
  useEffect(() => {
    if (authUser) {
      cleanupCorruptedSessions();
    }
  }, [authUser]);

  return (
    <AuthContext.Provider value={[authUser, setAuthUser]}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
