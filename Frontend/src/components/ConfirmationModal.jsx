import React from "react";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  confirmButtonClass = "bg-red-500 hover:bg-red-600 text-white",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-[#1f2937] text-white rounded-lg shadow-xl w-80 md:w-96 p-6">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <p className="text-gray-300 mb-6 text-sm">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-green-500 hover:bg-gray-700 rounded-full font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-full font-medium transition-colors ${confirmButtonClass}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
