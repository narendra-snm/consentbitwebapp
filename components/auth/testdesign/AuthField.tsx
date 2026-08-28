"use client";

import { useId, useState } from "react";
import { FONT_SANS, OPSZ } from "./fonts";

type AuthFieldProps = {
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  invalid?: boolean;
  /** Rendered under the field — used for password requirements. */
  hint?: string;
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
  hint,
}: AuthFieldProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === "password";
  // Toggling to "text" is what actually reveals the characters; the declared `type`
  // stays "password" so password managers still recognise the field.
  const inputType = isPassword && revealed ? "text" : type;

  // Driven from React state rather than :placeholder-shown/:focus so the two
  // states can't fight over CSS variant ordering.
  const floated = focused || value.length > 0;

  const floatedColor = invalid
    ? "text-[#b03240]"
    : focused
    ? "text-[#0777e6]"
    : "text-[#5f6a8f]";

  return (
    // The hint sits OUTSIDE the relative box below, never inside it. Both the reveal
    // button and the resting label are centred with top-1/2, so anything else sharing
    // their positioning context would drag them off the input's centre line.
    // With a hint the bottom margin is trimmed, since the hint itself already supplies
    // most of the gap to the next field — this keeps the field rhythm even.
    <div className={hint ? "mb-[14px] lg:mb-[clamp(8px,1.5vh,14px)]" : "mb-[22px] lg:mb-[clamp(12px,2.4vh,22px)]"}>
      <div className="relative">
        <input
          id={id}
          type={inputType}
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
          aria-describedby={hint ? `${id}-hint` : undefined}
          // Extra right padding on password fields so long values don't slide under
          // the reveal button.
          className={`w-full bg-white border rounded-xl h-[57px] pl-5 ${
            isPassword ? "pr-14" : "pr-5"
          } text-[#202022] text-[16px] leading-normal outline-none transition-colors placeholder:text-[#757575] focus:border-[#0777e6] focus:ring-2 focus:ring-[#0777e6]/25 disabled:bg-[#f7f8fa] disabled:text-[#757575] ${
            invalid ? "border-[#b03240]" : "border-[#e1e3e7]"
          }`}
          style={{ fontFamily: FONT_SANS, fontVariationSettings: OPSZ }}
        />
        {isPassword && (
          <button
            type="button"
            // tabIndex -1 keeps Tab going straight from the field to the submit button;
            // the toggle stays reachable by click and by screen readers.
            tabIndex={-1}
            onClick={() => setRevealed((r) => !r)}
            disabled={disabled}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#5f6a8f] hover:text-[#0777e6] disabled:text-[#b6bac6] disabled:hover:text-[#b6bac6] transition-colors"
            style={{ fontFamily: FONT_SANS, fontVariationSettings: OPSZ }}
          >
            {revealed ? "Hide" : "Show"}
          </button>
        )}
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
      {hint && (
        <p
          id={`${id}-hint`}
          className="mt-1.5 text-[12px] leading-5 text-[#5f6a8f]"
          style={{ fontFamily: FONT_SANS, fontVariationSettings: OPSZ }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
