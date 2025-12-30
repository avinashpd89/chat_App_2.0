import React, { useEffect } from "react";
import { SignalManager } from "../utils/SignalManager";
import { useAuth } from "./Authprovider";
import axios from "axios";

// E2E Encryption Setup - Ensures all users have Signal Protocol keys
export const E2EEncryptionSetup = ({ children }) => {
  const [authUser] = useAuth();
  const [setupComplete, setSetupComplete] = React.useState(false);

  useEffect(() => {
    const initializeE2E = async () => {
      if (!authUser?.user?._id) {
        setSetupComplete(false);
        return;
      }

      try {
        // Check if user already has keys
        const hasIdentityKey = localStorage.getItem("identityKey");

        if (!hasIdentityKey) {
          console.log(
            "Initializing E2E encryption for user:",
            authUser.user._id
          );
          const keyData = await SignalManager.generateIdentity(
            authUser.user._id
          );
          await axios.post("/api/user/keys/publish", keyData);
          console.log("✅ E2E encryption initialized successfully");
        } else {
          // Check if we need more one-time prekeys
          try {
            const response = await axios.get("/api/user/keys/count");
            console.log(`Current Signal prekey count: ${response.data.count}`);

            if (response.data.count < 5) {
              console.log("🔄 Refilling Signal one-time prekeys...");
              const newPreKeys = await SignalManager.refillPreKeys();
              await axios.post("/api/user/keys/publish", {
                oneTimePreKeys: newPreKeys,
              });
              console.log("✅ Signal prekeys refilled and published");
            }
          } catch (keyCheckError) {
            console.error("Error checking/refilling keys:", keyCheckError);
          }
        }

        setSetupComplete(true);
      } catch (error) {
        console.error("Error initializing E2E encryption:", error);
        setSetupComplete(true); // Still allow app to work
      }
    };

    initializeE2E();
  }, [authUser?.user?._id]);

  return <>{children}</>;
};

export default E2EEncryptionSetup;
