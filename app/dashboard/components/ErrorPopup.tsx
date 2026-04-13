"use client";

import Image from "next/image";

export default function ErrorPopup({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] flex items-center justify-between gap-4 rounded-xl px-5 py-3.5 shadow-lg w-full max-w-[600px]"
      style={{
        background: "linear-gradient(90deg, #C0392B 0%, #E57373 100%)",
      }}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <Image
          src="/asset/Error-icon.png"
          alt="Error"
          width={28}
          height={28}
          className="shrink-0"
        />
        <span className="text-white font-medium text-sm">{message}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-1.5 transition-colors"
      >
        Close
      </button>
    </div>
  );
}
