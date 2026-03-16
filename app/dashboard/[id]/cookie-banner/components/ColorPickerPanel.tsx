"use client";

import React, { useState, useRef, useEffect } from "react";
import { HexColorPicker } from "react-colorful";

const ColorPickerPanel: React.FC = () => {
  const [colors, setColors] = useState({
    bannerBg: "#d99188",
    textColor: "#344e63",
    headingColor: "#0b2342",
    buttonColor: "#d99188",
    buttonTextColor: "#344e63",
  });

  const updateColor = (key: keyof typeof colors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const ColorInput = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClick = (e: MouseEvent) => {
        if (
          popoverRef.current &&
          !popoverRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
      <div className="flex items-center justify-between">
        {/* Label */}
        <label className="text-sm text-[#374151]">{label}</label>

        {/* Input container */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center w-[150px] h-[36px] bg-[#F3F4F6] border border-[#E5E5E5] rounded-lg overflow-hidden"
          >
            {/* Color preview */}
            <div
              className="w-[42px] h-full"
              style={{ backgroundColor: value }}
            />

            {/* Hex value */}
            <span className="flex-1 text-sm text-[#111827] text-center">
              {value}
            </span>
          </button>

          {/* Color Picker */}
          {open && (
            <div
              ref={popoverRef}
              className="absolute top-[44px] right-0 z-50 bg-white p-3 rounded-lg shadow-xl"
            >
              <HexColorPicker color={value} onChange={onChange} />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[454px] space-y-4">
      {/* General Colors */}
      <div className="bg-[#F9F9FA] border border-[#E5E5E5] rounded-xl p-5">
        <h3 className="text-base font-semibold text-[#111827] mb-5">
          General Colors
        </h3>

        <div className="space-y-4">
          <ColorInput
            label="Banners background"
            value={colors.bannerBg}
            onChange={(v) => updateColor("bannerBg", v)}
          />

          <ColorInput
            label="Text color"
            value={colors.textColor}
            onChange={(v) => updateColor("textColor", v)}
          />

          <ColorInput
            label="Heading color"
            value={colors.headingColor}
            onChange={(v) => updateColor("headingColor", v)}
          />
        </div>
      </div>

      {/* Buttons Colors */}
      <div className="bg-[#F9F9FA] border border-[#E5E5E5] rounded-xl p-5">
        <h3 className="text-base font-semibold text-[#111827] mb-5">
          Buttons colors
        </h3>

        <div className="space-y-4">
          <ColorInput
            label="Button Color"
            value={colors.buttonColor}
            onChange={(v) => updateColor("buttonColor", v)}
          />

          <ColorInput
            label="Text color"
            value={colors.buttonTextColor}
            onChange={(v) => updateColor("buttonTextColor", v)}
          />
        </div>
      </div>
    </div>
  );
};

export default ColorPickerPanel;