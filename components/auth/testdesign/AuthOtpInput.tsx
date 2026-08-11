"use client";

import type React from "react";
import { useMemo, useRef } from "react";
import { FONT_SANS, OPSZ } from "./fonts";

type AuthOtpInputProps = {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
};

function sanitizeDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

/**
 * Six-box verification code entry, styled from the same tokens as AuthField
 * (52px tall, 12px radius, #e1e3e7 border, brand-blue focus ring).
 * Boxes flex to fit the viewport so the row never overflows on small screens.
 */
export default function AuthOtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  invalid = false,
}: AuthOtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = useMemo(() => {
    const clean = sanitizeDigits(value).slice(0, length);
    return Array.from({ length }, (_, i) => clean[i] || "");
  }, [value, length]);

  const focusIndex = (idx: number) => {
    inputRefs.current[idx]?.focus();
  };

  const setFromIndex = (startIndex: number, newDigits: string) => {
    if (disabled) return;
    const clean = sanitizeDigits(newDigits).slice(0, length);
    const next = Array.from({ length }, (_, i) => digits[i] || "");
    for (let k = 0; k < clean.length && startIndex + k < length; k++) {
      next[startIndex + k] = clean[k];
    }
    onChange(next.join("").slice(0, length).replace(/\D/g, ""));
  };

  const handleChange = (idx: number, raw: string) => {
    // Support paste/autofill into a single box: if multiple digits appear, spread them.
    const clean = sanitizeDigits(raw);
    if (clean.length === 0) {
      const next = Array.from({ length }, (_, i) => digits[i] || "");
      next[idx] = "";
      onChange(next.join("").slice(0, length).replace(/\D/g, ""));
      return;
    }

    setFromIndex(idx, clean);
    focusIndex(Math.min(idx + clean.length, length - 1));
  };

  const handlePaste = (idx: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const clean = sanitizeDigits(e.clipboardData.getData("text")).slice(0, length);
    if (!clean) return;
    setFromIndex(idx, clean);
    focusIndex(Math.min(idx + clean.length - 1, length - 1));
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      e.preventDefault();
      const next = Array.from({ length }, (_, i) => digits[i] || "");
      next[idx - 1] = "";
      onChange(next.join("").slice(0, length).replace(/\D/g, ""));
      focusIndex(idx - 1);
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      focusIndex(idx - 1);
    }
    if (e.key === "ArrowRight" && idx < length - 1) {
      e.preventDefault();
      focusIndex(idx + 1);
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {Array.from({ length }, (_, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputRefs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={idx === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digits[idx]}
          onChange={(e) => handleChange(idx, e.target.value)}
          onPaste={(e) => handlePaste(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onFocus={(e) => e.currentTarget.select()}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-label={`Verification code digit ${idx + 1}`}
          className={`min-w-0 flex-1 max-w-[56px] h-[52px] bg-white border rounded-xl text-center text-[#202022] text-[18px] font-medium outline-none transition-colors focus:border-[#0777e6] focus:ring-2 focus:ring-[#0777e6]/25 disabled:bg-[#f7f8fa] disabled:text-[#757575] ${
            invalid ? "border-[#b03240]" : "border-[#e1e3e7]"
          }`}
          style={{ fontFamily: FONT_SANS, fontVariationSettings: OPSZ }}
        />
      ))}
    </div>
  );
}
