import React, { useEffect, useState } from "react";
import useConversation from "../zustand/useConversation.js";
import axios from "axios";

const useGetGroups = () => {
  const [loading, setLoading] = useState(false);
  const { groups, setGroups } = useConversation();

  useEffect(() => {
    const getGroups = async () => {
      setLoading(true);
      try {
        const response = await axios.get("/api/user/get-groups");
        setGroups(response.data);
      } catch (error) {
        console.error("Error in useGetGroups:", error);
      } finally {
        setLoading(false);
      }
    };
    getGroups();
  }, [setGroups]);

  return [groups, loading];
};

export default useGetGroups;
