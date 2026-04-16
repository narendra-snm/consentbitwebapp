"use client";

import type React from "react";
import { useMemo, useRef } from "react";

type OtpInputProps = {
  value: string;
  onChange: (next: string) => void;
  length?: number; // default: 6
  disabled?: boolean;
};

function sanitizeDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

export default function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = useMemo(() => {
    const clean = sanitizeDigits(value).slice(0, length);
    return Array.from({ length }, (_, i) => clean[i] || "");
  }, [value, length]);

  const focusIndex = (idx: number) => {
    const el = inputRefs.current[idx];
    if (el) el.focus();
  };

  const setFromIndex = (startIndex: number, newDigits: string) => {
    if (disabled) return;
    const clean = sanitizeDigits(newDigits).slice(0, length);
    const next = Array.from({ length }, (_, i) => digits[i] || "");
    for (let k = 0; k < clean.length && startIndex + k < length; k++) {
      next[startIndex + k] = clean[k];
    }
    // Preserve only filled digits from the beginning; ignore trailing empties.
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

    // Move focus to the next empty box if we typed/pasted something.
    const nextFocus = Math.min(idx + clean.length, length - 1);
    focusIndex(nextFocus);
  };

  const handlePaste = (idx: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const clean = sanitizeDigits(text).slice(0, length);
    if (!clean) return;
    setFromIndex(idx, clean);
    focusIndex(Math.min(idx + clean.length - 1, length - 1));
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Backspace") {
      const current = digits[idx];
      if (!current && idx > 0) {
        e.preventDefault();
        // Clear previous digit and move focus back.
        const next = Array.from({ length }, (_, i) => digits[i] || "");
        next[idx - 1] = "";
        onChange(next.join("").slice(0, length).replace(/\D/g, ""));
        focusIndex(idx - 1);
      }
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length }, (_, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputRefs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[idx]}
          onChange={(e) => handleChange(idx, e.target.value)}
          onPaste={(e) => handlePaste(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onFocus={() => {
            if (!disabled) focusIndex(idx);
          }}
          disabled={disabled}
          className="w-12 h-14 text-center text-lg border border-gray-300 rounded-[9px] bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#262E84] placeholder:text-[#262E84]"
          aria-label={`OTP digit ${idx + 1}`}
        />
      ))}
    </div>
  );
}

