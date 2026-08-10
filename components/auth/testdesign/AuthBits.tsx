"use client";

import type { ReactNode } from "react";
import { FONT_SANS, OPSZ } from "./fonts";

/** Pill submit button, exactly per the design (52px tall, full-bleed on mobile). */
export function AuthSubmitButton({
  children,
  disabled = false,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="bg-[#0777e6] border border-[#0777e6] rounded-full h-[52px] px-8 w-full sm:w-auto text-white text-[18px] font-semibold tracking-[-0.36px] leading-[18px] cursor-pointer transition-colors hover:bg-[#0668c9] hover:border-[#0668c9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0777e6] disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ fontFamily: FONT_SANS, fontVariationSettings: OPSZ }}
    >
      {children}
    </button>
  );
}

/** Muted helper copy below the form. */
export function AuthHelperText({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[#5f6a8f] text-[15px] sm:text-[16px] leading-7"
      style={{ fontFamily: FONT_SANS, fontVariationSettings: OPSZ }}
    >
      {children}
    </p>
  );
}

/**
 * Inline error. Replaces the legacy fixed-width Toast, which is hard-coded to
 * 834px and cannot render on a phone.
 */
export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="text-[#b03240] text-[14px] leading-6 mb-3"
      style={{ fontFamily: FONT_SANS, fontVariationSettings: OPSZ }}
    >
      {message}
    </p>
  );
}

/** Success / informational notice (e.g. "a new code has been sent"). */
export function AuthNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="text-[#0f7a4d] text-[14px] leading-6"
      style={{ fontFamily: FONT_SANS, fontVariationSettings: OPSZ }}
    >
      {message}
    </p>
  );
}

/** Text button used for "resend code" and "use a different email". */
export function AuthTextButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-[#0777e6] text-[14px] font-medium leading-6 underline underline-offset-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:text-[#0668c9]"
      style={{ fontFamily: FONT_SANS, fontVariationSettings: OPSZ }}
    >
      {children}
    </button>
  );
}
