import React, { useState, useRef, useEffect } from "react";
import { BiLogOutCircle } from "react-icons/bi";
import { IoMoon, IoSunny } from "react-icons/io5";
import axios from "axios";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import Avatar from "../../assets/avatar.jpg";
import ProfileModal from "../../components/ProfileModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import { BsThreeDotsVertical } from "react-icons/bs";
import { compressImage } from "../../utils/imageCompression";

function Self() {
  const [authUser, setAuthUser] = useState(
    JSON.parse(localStorage.getItem("ChatApp")),
  );
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.querySelector("html").setAttribute("data-theme", theme);
  }, [theme]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleUpdateProfile = async (newName, file) => {
    let base64Data = null;

    // If a new file is provided, compress it and convert to base64
    if (file) {
      try {
        const compressedBlob = await compressImage(file, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.7,
        });

        const convertToBase64 = (blob) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(blob);
          });
        };
        base64Data = await convertToBase64(compressedBlob);
      } catch (compressionError) {
        console.error("Compression failed:", compressionError);
        return toast.error("Failed to process image");
      }
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
            "Storage full! Saving user without profile pic to local cache.",
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
      <div className="bg-base-100 py-3 px-4 flex items-center justify-between duration-300">
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

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="bg-base-300 p-2 rounded-full hover:bg-base-content hover:text-base-100 duration-200 text-base-content">
            <BsThreeDotsVertical className="text-2xl" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-48 bg-base-200 rounded-lg shadow-xl py-2 z-[100] border border-base-300">
              <button
                onClick={() => {
                  setTheme(theme === "light" ? "dark" : "light");
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-base-300 flex items-center gap-3 text-base-content transition-colors">
                {theme === "light" ? (
                  <>
                    <IoMoon className="text-xl" />
                    <span>Dark Mode</span>
                  </>
                ) : (
                  <>
                    <IoSunny className="text-xl" />
                    <span>Light Mode</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-base-300 flex items-center gap-3 text-red-500 transition-colors border-t border-base-300">
                <BiLogOutCircle className="text-xl" />
                <span>Logout</span>
              </button>
            </div>
          )}
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
