"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type AccordionProps = {
  title: string;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (nextOpen: boolean) => void;
  children: React.ReactNode;
};

export default function Accordion({
  title,
  defaultOpen = true,
  isOpen,
  onToggle,
  children,
}: AccordionProps) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(defaultOpen);
  const open = isOpen ?? uncontrolledIsOpen;

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