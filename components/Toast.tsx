"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type: "error" | "success";
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed top-4 right-4 left-4 md:left-auto md:max-w-sm z-50 transform transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
      }`}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border"
        style={{
          background: type === "success" ? 'var(--forest-50)' : 'white',
          borderColor: type === "success" ? 'var(--forest-200)' : 'var(--terracotta-300)',
          boxShadow: type === "success"
            ? '0 4px 20px rgba(74, 122, 92, 0.15)'
            : '0 4px 20px rgba(194, 93, 58, 0.15)',
        }}
      >
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: type === "success" ? 'var(--forest-100)' : 'var(--terracotta-300)',
          }}
        >
          {type === "success" ? (
            <svg className="w-4 h-4 text-[var(--forest-700)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        {/* Message */}
        <p
          className="text-sm font-medium flex-1"
          style={{
            color: type === "success" ? 'var(--forest-800)' : 'var(--stone-800)',
          }}
        >
          {message}
        </p>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--stone-100)]"
        >
          <svg className="w-4 h-4 text-[var(--stone-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
