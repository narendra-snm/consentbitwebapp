"use client";

import { useState } from "react";


type AccordionProps = {
  title: string;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (nextOpen: boolean) => void;
  /** Render as a plain always-open panel (no header/chevron) — used when shown inside a tab. */
  plain?: boolean;
  /** Render content only — no card, no header — so it can be embedded inside another panel. */
  bare?: boolean;
  children: React.ReactNode;
};
const ChevronDown = ({ size = 16, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronUp = ({ size = 16, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="6 15 12 9 18 15" />
  </svg>
);
export default function Accordion({
  title,
  defaultOpen = true,
  isOpen,
  onToggle,
  plain = false,
  bare = false,
  children,
}: AccordionProps) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(defaultOpen);
  const open = isOpen ?? uncontrolledIsOpen;

  // Bare mode: content only — caller supplies the surrounding panel.
  if (bare) {
    return <>{children}</>;
  }

  // Plain mode: no header/chevron, content always visible (rendered inside a tab).
  if (plain) {
    return (
      <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg overflow-hidden">
        <div className="px-[18px] pt-5 pb-6">{children}</div>
      </div>
    );
  }

  const setOpen = (next: boolean) => {
    if (isOpen === undefined) setUncontrolledIsOpen(next);
    onToggle?.(next);
  };

  return (
    <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-[18px] py-4 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <h3 className="font-semibold text-base text-black leading-5">
          {title}
        </h3>

        <button className="text-black">
          {open ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Content */}
      {open && <div className="px-[18px] pb-6">{children}</div>}
    </div>
  );
}