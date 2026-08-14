"use client";

import { useId, useState } from "react";
import { FONT_SANS, OPSZ } from "./fonts";

type AuthFieldProps = {
  label: string;
  type?: "text" | "email";
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  invalid?: boolean;
};

/**
 * Text input with a floating label, matching the auth design's field spec:
 * 52px tall, 12px radius, #e1e3e7 border, brand-blue focus ring.
 *
 * At rest the label sits inside the box and doubles as the placeholder. On
 * focus — or as soon as the field holds a value — it rises onto the top border
 * and shrinks, with a white chip behind it notching the stroke. This removes
 * the separate label line above each input (36px per field).
 */
export default function AuthField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  autoComplete,
  autoFocus = false,
  invalid = false,
}: AuthFieldProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);

  // Driven from React state rather than :placeholder-shown/:focus so the two
  // states can't fight over CSS variant ordering.
  const floated = focused || value.length > 0;

  const floatedColor = invalid
    ? "text-[#b03240]"
    : focused
    ? "text-[#0777e6]"
    : "text-[#5f6a8f]";

  return (
    <div className="relative mb-[22px] lg:mb-[clamp(12px,2.4vh,22px)]">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // The example text would collide with the resting label, so it only
        // appears once the label has floated out of the way.
        placeholder={focused ? placeholder : ""}
        disabled={disabled}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        className={`w-full bg-white border rounded-xl h-[57px] px-5 text-[#202022] text-[16px] leading-normal outline-none transition-colors placeholder:text-[#757575] focus:border-[#0777e6] focus:ring-2 focus:ring-[#0777e6]/25 disabled:bg-[#f7f8fa] disabled:text-[#757575] ${
          invalid ? "border-[#b03240]" : "border-[#e1e3e7]"
        }`}
        style={{ fontFamily: FONT_SANS, fontVariationSettings: OPSZ }}
      />
      {/*
        left/px are paired so the text's left edge stays at 20px in both states
        (14 + 6 padding when floated, 20 + 0 when resting) — the label rises
        without sliding sideways.
      */}
      <label
        htmlFor={id}
        className={`pointer-events-none absolute -translate-y-1/2 transition-all duration-150 ease-out ${
          floated
            ? `top-0 left-[14px] px-1.5 bg-white text-[12px] font-medium ${floatedColor}`
            : "top-1/2 left-5 px-0 text-[16px] text-[#757575]"
        }`}
        style={{ fontFamily: FONT_SANS, fontVariationSettings: OPSZ }}
      >
        {label}
      </label>
    </div>
  );
}
