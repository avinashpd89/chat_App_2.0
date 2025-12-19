import React, { useState } from "react";
import { BiLogOutCircle } from "react-icons/bi";
import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

function Logout() {
  const [loading, setLoading] = useState(false);
  const handleLogout = async () => {
    setLoading(true);
    try {
      const res = await axios.post("/api/user/logout");
      localStorage.removeItem("ChatApp");
      Cookies.remove("jwt");
      setLoading(false);
      toast.success("Logout successfully");
      window.location.reload();
    } catch (error) {
      console.log("Error in Logout: ", error);
      toast.error("Error in logout");
    }
  };
  return (
    <div className="h-[8vh] flex items-center bg-gray-800 px-4">
      <div>
        <BiLogOutCircle
          className="text-3xl text-white hover:bg-gray-700 duration-300 rounded-full cursor-pointer"
          onClick={handleLogout}
        />
      </div>
    </div>
  );
}

export default Logout;
