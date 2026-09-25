"use client";

import Image from "next/image";
import { useEffect } from "react";

/**
 * The dashboard's toast, for both outcomes.
 *
 * `type` is optional and defaults to "error", so the existing callers
 * (CookieScanDashboard, InstallConsentModal, DomainManagementDashboard) are unaffected.
 * The success variant exists because the same green markup — gradient, Success-icon,
 * Close button — is currently copy-pasted inline in at least three files, which is how
 * the banner page ended up with its own cramped 260px error box instead of this.
 */
export default function ErrorPopup({
  message,
  onClose,
  type = "error",
  duration = 3000,
}: {
  message: string;
  onClose: () => void;
  type?: "error" | "success";
  duration?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  const isError = type === "error";

  return (
    <div
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] flex items-center justify-between gap-4 rounded-xl px-5 py-3.5 shadow-lg w-full max-w-[600px]"
      style={{
        background: isError
          ? "linear-gradient(90deg, #C0392B 0%, #E57373 100%)"
          : "linear-gradient(90deg, #2E7D32 0%, #66BB6A 100%)",
      }}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <Image
          src={isError ? "/asset/Error-icon.png" : "/asset/Success-icon.png"}
          alt={isError ? "Error" : "Success"}
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
