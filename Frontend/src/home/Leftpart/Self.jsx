import React, { useState, useRef, useEffect } from "react";
import { BiLogOutCircle } from "react-icons/bi";
import { IoMoon, IoSunny } from "react-icons/io5";
import axios from "axios";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import Avatar from "../../assets/avatar.jpg";
import ProfileModal from "../../components/ProfileModal";
import ConfirmationModal from "../../components/ConfirmationModal";

function Self() {
  const [authUser, setAuthUser] = useState(
    JSON.parse(localStorage.getItem("ChatApp"))
  );
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.querySelector("html").setAttribute("data-theme", theme);
  }, [theme]);

  const handleUpdateProfile = async (newName, file) => {
    let base64Data = null;

    // If a new file is provided, convert and compress it
    if (file) {
      const resizeImage = (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const MAX_WIDTH = 200;
              const MAX_HEIGHT = 200;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", 0.7)); // Compress to 70% quality
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        });
      };
      base64Data = await resizeImage(file);
    }

    try {
      const payload = {};
      if (newName) payload.name = newName;
      if (base64Data) payload.profilepic = base64Data;

      const res = await axios.put("/api/user/update", payload);

      // Update local storage and state with safety catch
      const updatedUser = { ...authUser, user: res.data.user };
      try {
        localStorage.setItem("ChatApp", JSON.stringify(updatedUser));
      } catch (storageError) {
        if (storageError.name === "QuotaExceededError") {
          console.warn(
            "Storage full! Saving user without profile pic to local cache."
          );
          // Save a lean version to storage so session is preserved, but keep full version in RAM
          const leanUser = {
            ...updatedUser,
            user: { ...updatedUser.user, profilepic: "" },
          };
          localStorage.setItem("ChatApp", JSON.stringify(leanUser));
        }
      }
      setAuthUser(updatedUser);

      toast.success("Profile updated!");
      setIsProfileModalOpen(false);
    } catch (error) {
      console.log(error);
      toast.error("Error updating profile");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await axios.delete(`/api/user/delete/${authUser.user._id}`);
      toast.success("Account deleted permanently");
      localStorage.removeItem("ChatApp");
      Cookies.remove("jwt");
      window.location.reload();
    } catch (error) {
      console.log(error);
      toast.error("Failed to delete account");
    }
  };

  const handleLogout = async () => {
    try {
      const res = await axios.post("/api/user/logout");
      localStorage.removeItem("ChatApp");
      Cookies.remove("jwt");
      toast.success("Logout successfully");
      window.location.reload();
    } catch (error) {
      console.log("Error in Logout: ", error);
      toast.error("Error in logout");
    }
  };

  return (
    <>
      <div className="bg-base-100 h-[10vh] p-2 flex items-center justify-between duration-300">
        <div
          className="flex items-center space-x-3 cursor-pointer hover:bg-base-200 p-2 rounded-lg transition-colors"
          onClick={() => setIsProfileModalOpen(true)}>
          <div className="avatar">
            <div className="w-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              <img
                src={authUser.user.profilepic || Avatar}
                alt="My Avatar"
                className="object-cover"
              />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-base-content">
              {authUser.user.name}
            </h1>
            <p className="text-xs text-gray-500">My Profile</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="bg-base-300 p-2 rounded-full hover:bg-base-content hover:text-base-100 duration-200 text-base-content">
            {theme === "light" ? (
              <IoMoon className="text-2xl" />
            ) : (
              <IoSunny className="text-2xl" />
            )}
          </button>
          <button
            onClick={handleLogout}
            className="bg-base-300 p-2 rounded-full hover:bg-base-content hover:text-base-100 duration-200 text-base-content">
            <BiLogOutCircle className="text-2xl" />
          </button>
        </div>
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={authUser.user}
        onUpdate={handleUpdateProfile}
        onDeleteAccount={() => setConfirmDelete(true)}
      />

      <ConfirmationModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account Permanent?"
        message="Are you sure you want to delete your account permanently? All your data will be lost. This action cannot be undone."
        confirmText="Delete Permanent"
        confirmButtonClass="btn-error"
      />
    </>
  );
}

export default Self;
