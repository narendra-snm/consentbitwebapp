"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type AccordionProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export default function Accordion({
  title,
  defaultOpen = true,
  children,
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-[18px] py-4 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-semibold text-base text-black leading-5">
          {title}
        </h3>

        <button className="text-black">
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Content */}
      {isOpen && <div className="px-[18px] pb-6">{children}</div>}
    </div>
  );
}