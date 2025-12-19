import React, { useState, useEffect, useRef } from "react";
import { IoSend } from "react-icons/io5";
import { BsEmojiSmile } from "react-icons/bs";
import { GrAttachment } from "react-icons/gr"; // Import Attachment Icon
import useSendMessage from "../../context/useSendMessage.jsx";
import EmojiPicker from "emoji-picker-react";

function Typesend() {
  const [message, setMessage] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const { loading, sendMessages } = useSendMessage();
  const pickerRef = useRef(null);
  const fileInputRef = useRef(null); // Ref for file input
  const [pickerWidth, setPickerWidth] = useState(350); // Default width

  // Adjust picker width on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 500) {
        setPickerWidth(280); // Smaller width for mobile
      } else {
        setPickerWidth(350); // Default for desktop
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initialize check

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message.trim() === "") return;
    await sendMessages(message);
    setMessage("");
  };

  const onEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      const type = file.type.startsWith("image/") ? "image" : "video";
      // Send immediately or consider adding a preview state first.
      // For simplicity, we send immediately as per request flow.
      await sendMessages(base64Data, type);
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = null;
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside); // For mobile
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showPicker]);

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center gap-2 h-[10vh] md:h-[8vh] px-2 md:px-4 bg-transparent md:bg-base-100 max-w-full">
        <div className="flex-1 flex items-center bg-base-300 rounded-full px-3 py-2 gap-2 md:gap-4 md:bg-transparent md:p-0 md:rounded-none min-w-0">
          <div className="relative" ref={pickerRef}>
            <BsEmojiSmile
              className="text-xl md:text-2xl text-base-content cursor-pointer hover:text-primary duration-200"
              onClick={() => setShowPicker(!showPicker)}
            />
            {showPicker && (
              <div className="absolute bottom-16 left-0 z-50">
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  theme="auto"
                  width={pickerWidth}
                />
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-base-content placeholder-base-content/60"
            disabled={loading}
          />

          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="text-xl md:text-2xl text-base-content hover:text-primary duration-200 rotate-45">
            <GrAttachment />
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex-shrink-0 flex items-center justify-center bg-blue-500 md:bg-transparent p-2 md:p-0 rounded-full text-white md:text-blue-500 shadow-lg md:shadow-none hover:bg-blue-600 md:hover:bg-transparent duration-200">
          <IoSend className="text-xl md:text-3xl" />
        </button>
      </div>
    </form>
  );
}

export default Typesend;
