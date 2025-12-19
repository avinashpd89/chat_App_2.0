import React, { useState, useRef } from "react";
import { FaCamera } from "react-icons/fa";

const ProfileModal = ({ isOpen, onClose, user, onUpdate, onDeleteAccount }) => {
  const [name, setName] = useState(user.name);
  const [profilePic, setProfilePic] = useState(user.profilepic);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSave = () => {
    onUpdate(name, file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md p-6 relative animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300">
          ✕
        </button>

        <h2 className="text-2xl font-bold text-center mb-6 text-base-content">
          Edit Profile
        </h2>

        <div className="flex flex-col items-center mb-6">
          <div
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current.click()}>
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary">
              <img
                src={profilePic}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <FaCamera className="text-white text-xl" />
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
          <p className="text-sm text-gray-500 mt-2">Click to change photo</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered w-full bg-base-200 focus:outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={handleSave}
            className="btn btn-primary w-full text-white mt-4">
            Save Changes
          </button>

          <div className="divider">DANGER ZONE</div>

          <button
            onClick={onDeleteAccount}
            className="btn btn-outline btn-error w-full">
            Delete Account Permanent
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
