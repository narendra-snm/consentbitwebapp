"use client";

import React, { useRef, useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useAppContext } from "@/app/context/AppProvider";
const ColorPickerPanel: React.FC = () => {
  const {colors, setColors} =  useAppContext();

  const updateColor = (key: keyof typeof colors, value: string) => {
    setColors((prev: any) => ({ ...prev, [key]: value }));
  };

  const ColorInput = ({
    label,
    value,
    onChange: onPick,
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
        <label className="text-sm text-[#374151]">{label}</label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center w-[150px] h-[36px] bg-[#F3F4F6] border border-[#E5E5E5] rounded-lg overflow-hidden"
          >
            <div
              className="w-[42px] h-full"
              style={{ backgroundColor: value }}
            />
            <span className="flex-1 text-sm text-[#111827] text-center">
              {value}
            </span>
          </button>

          {open && (
            <div
              ref={popoverRef}
              className="absolute top-[44px] right-0 z-50 bg-white p-3 rounded-lg shadow-xl"
            >
              <HexColorPicker color={value} onChange={onPick} />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[454px] space-y-4">
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
      <div className="bg-[#F9F9FA] border border-[#E5E5E5] rounded-xl p-5">
        <h3 className="text-base font-semibold text-[#111827] mb-5">
          Buttons colors
        </h3>

        <div className="space-y-4">
          <ColorInput
            label="Button Color"
            value={colors.SecButtonColor}
            onChange={(v) => updateColor("SecButtonColor", v)}
          />

          <ColorInput
            label="Text color"
            value={colors.SecButtonTextColor}
            onChange={(v) => updateColor("SecButtonTextColor", v)}
          />
        </div>
      </div>
    </div>
  );
};

export default ColorPickerPanel;
