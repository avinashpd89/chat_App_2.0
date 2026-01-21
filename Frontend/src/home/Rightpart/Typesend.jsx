import React, { useState, useEffect, useRef } from "react";
import { IoSend } from "react-icons/io5";
import { BsEmojiSmile } from "react-icons/bs";
import { GrAttachment } from "react-icons/gr"; // Import Attachment Icon
import useSendMessage from "../../context/useSendMessage.jsx";
import EmojiPicker from "emoji-picker-react";

import { HiDocumentText } from "react-icons/hi";
import { IoClose } from "react-icons/io5";

function Typesend() {
  const [message, setMessage] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // { data, type, name }
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

  const inputRef = useRef(null);

  // Restore focus to input after loading completes
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message.trim() === "") return;
    await sendMessages(message);
    setMessage("");
    // Focus will be handled by the useEffect above
  };

  const onEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Detect file type
    let type = "document";
    if (file.type.startsWith("image/")) {
      type = "image";
    } else if (file.type.startsWith("video/")) {
      type = "video";
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result;
      setPreviewFile({
        data: base64Data,
        type: type,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = null;
  };

  const handleSendPreview = async () => {
    if (!previewFile) return;

    let payload = previewFile.data;
    if (previewFile.type === "document") {
      payload = `filename:${previewFile.name}|${previewFile.data}`;
    }

    await sendMessages(payload, previewFile.type);
    setPreviewFile(null);
  };

  const handleCancelPreview = () => {
    setPreviewFile(null);
  };

  // Handle Enter key for preview
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (previewFile && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendPreview();
      }
      if (previewFile && e.key === "Escape") {
        handleCancelPreview();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewFile]);

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
    <div className="w-full relative z-50">
      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-base-300 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-base-300/50">
              <h3 className="font-bold text-lg md:text-xl">
                Preview {previewFile.type}
              </h3>
              <button
                onClick={handleCancelPreview}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                disabled={loading}>
                <IoClose size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-center justify-center bg-base-100/30">
              {previewFile.type === "image" && (
                <img
                  src={previewFile.data}
                  alt="Preview"
                  className="max-w-full max-h-[50vh] rounded-xl shadow-lg object-contain"
                />
              )}
              {previewFile.type === "video" && (
                <video
                  src={previewFile.data}
                  controls
                  className="max-w-full max-h-[50vh] rounded-xl shadow-lg"
                />
              )}
              {previewFile.type === "document" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-24 h-24 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                    <HiDocumentText size={48} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg max-w-xs break-all">
                      {previewFile.name}
                    </p>
                    <p className="text-xs opacity-50 uppercase tracking-widest mt-1">
                      Ready to send
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-base-300/50 border-t border-white/5 flex gap-4">
              <button
                onClick={handleCancelPreview}
                className="flex-1 py-3 md:py-4 rounded-2xl font-bold bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                disabled={loading}>
                Cancel
              </button>
              <button
                onClick={handleSendPreview}
                className="flex-[2] py-3 md:py-4 rounded-2xl font-bold bg-primary text-primary-content shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
                disabled={loading}>
                {loading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    Send <IoSend />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full">
        <div className="w-full px-4 pb-4 md:px-6 md:pb-6 pt-2 bg-transparent transition-all duration-300">
          <div className="max-w-7xl mx-auto relative border-t border-white/5 pt-4">
            <div
              className={`
                relative flex items-center gap-2 md:gap-4 p-2 md:p-3 rounded-2xl md:rounded-[32px] 
                bg-base-300/40 backdrop-blur-2xl border border-white/5 
                shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] 
                transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${message ? "ring-1 ring-primary/20 bg-base-300/60" : ""}
                focus-within:ring-2 focus-within:ring-primary/30 focus-within:bg-base-300/70
                focus-within:translate-y-[-2px] focus-within:shadow-[0_12px_40px_0_rgba(0,0,0,0.3)]
              `}>
              {/* Emoji Section */}
              <div className="relative flex items-center" ref={pickerRef}>
                <div
                  onClick={() => setShowPicker(!showPicker)}
                  className="p-2 md:p-3 rounded-full hover:bg-white/10 text-base-content/70 hover:text-primary transition-all duration-300 cursor-pointer active:scale-95">
                  <BsEmojiSmile
                    className="text-xl md:text-2xl"
                    id="emoji-trigger"
                  />
                </div>

                {showPicker && (
                  <div className="absolute bottom-16 left-0 z-[110] animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        theme="auto"
                        width={pickerWidth}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Section */}
              <div className="flex-1 relative flex items-center min-w-0">
                <input
                  id="chat-message-input"
                  ref={inputRef}
                  type="text"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-base-content text-base md:text-lg 
                             placeholder-base-content/40 py-2 md:py-3 px-1"
                  disabled={loading}
                  autoComplete="off"
                />
              </div>

              {/* Actions Section */}
              <div className="flex items-center gap-1 md:gap-3 px-1 md:px-2">
                <input
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="p-2 md:p-3 rounded-full hover:bg-white/10 text-base-content/50 hover:text-primary transition-all duration-300 active:scale-95"
                  title="Attach file">
                  <GrAttachment className="text-lg md:text-xl rotate-45" />
                </button>

                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className={`
                    flex items-center justify-center p-3 md:p-4 rounded-xl md:rounded-2xl
                    transition-all duration-500 transform
                    ${
                      message.trim()
                        ? "bg-primary text-primary-content shadow-lg shadow-primary/20 scale-100 hover:scale-105 active:scale-95"
                        : "bg-base-100 text-base-content/20 scale-90 cursor-not-allowed"
                    }
                  `}>
                  <IoSend
                    className={`text-xl md:text-2xl transition-transform duration-500 ${
                      message.trim() ? "translate-x-[2px] -rotate-12" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Typesend;
