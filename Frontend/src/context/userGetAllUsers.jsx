import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import useConversation from "../zustand/useConversation.js";

function userGetAllUsers() {
  const [loading, setLoading] = useState(false);
  const { users, setUsers } = useConversation();

  useEffect(() => {
    const getUsers = async () => {
      setLoading(true);
      try {
        const token = Cookies.get("jwt");
        const response = await axios.get("/api/user/allusers", {
          Credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUsers(response.data);
        setLoading(false);
      } catch (error) {
        console.log("Error in userGetAllUsers: " + error);
        setLoading(false);
      }
    };
    getUsers();
  }, [setUsers]);
  return [users, loading];
}

export default userGetAllUsers;
