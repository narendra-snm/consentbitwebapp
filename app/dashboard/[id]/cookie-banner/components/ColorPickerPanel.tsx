"use client";

import React, { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useAppContext } from "@/app/context/AppProvider";
import type { ColorSettings } from "./bannerAppearance";

type Props = {
  value?: ColorSettings;
  onChange?: (next: ColorSettings) => void;
};

type SingleColorInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const SingleColorInput: React.FC<SingleColorInputProps> = ({
  label,
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#111827]">{label}</span>

      <div ref={containerRef} className="relative">
        <div
          className="flex items-center w-[150px] h-[36px] bg-[#F9F9FA] border border-[#E5E5E5] rounded-lg overflow-hidden cursor-pointer"
          onClick={() => setOpen((v) => !v)}
        >
          <div
            className="w-[42px] h-full shrink-0"
            style={{ backgroundColor: value }}
          />

          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            spellCheck={false}
            className="w-full h-full px-2 text-sm text-[#111827] text-center bg-transparent border-none outline-none"
          />
        </div>

        {open && (
          <div className="absolute top-[44px] right-0 z-50 bg-white p-3 rounded-lg shadow-xl">
            <HexColorPicker
              color={value}
              onChange={onChange}
              style={{ width: 180, height: 180 }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const ColorPickerPanel: React.FC<Props> = ({
  value: controlledValue,
  onChange: controlledOnChange,
}) => {
  const ctx = useAppContext();
  const colors = (controlledValue ?? ctx.colors) as ColorSettings;

  const updateColor = (key: keyof ColorSettings, v: string) => {
    const applyPreferenceSync = (next: ColorSettings): ColorSettings => {
      if (key === "preferencesButtonBg" || key === "preferencesButtonText") {
        return {
          ...next,
          savePreferencesButtonBg: next.preferencesButtonBg,
          savePreferencesButtonText: next.preferencesButtonText,
        };
      }
      return next;
    };

    if (controlledOnChange && controlledValue) {
      controlledOnChange(
        applyPreferenceSync({ ...controlledValue, [key]: v })
      );
      return;
    }

    ctx.setColors((prev: Record<string, string>) => {
      const raw = { ...prev, [key]: v } as ColorSettings;
      return applyPreferenceSync(raw) as Record<string, string>;
    });
  };

  return (
    <div className="w-full max-w-[454px] space-y-4">
      <div className="bg-[#F9F9FA] border border-[#E5E5E5] rounded-xl p-5">
        <h3 className="text-base font-semibold mb-5">General Colors</h3>

        <div className="space-y-4">
          <SingleColorInput
            label="Banners background"
            value={colors.bannerBg}
            onChange={(v) => updateColor("bannerBg", v)}
          />

          <SingleColorInput
            label="Text color"
            value={colors.textColor}
            onChange={(v) => updateColor("textColor", v)}
          />

          <SingleColorInput
            label="Heading color"
            value={colors.headingColor}
            onChange={(v) => updateColor("headingColor", v)}
          />
        </div>
      </div>

      <div className="bg-[#F9F9FA] border border-[#E5E5E5] rounded-xl p-5">
        <h3 className="text-base font-semibold mb-5">Buttons colors</h3>

        <p className="text-xs text-[#6B7280] mb-3">Accept/Reject/Cancel</p>
        <div className="space-y-4 mb-6">
          <SingleColorInput
            label="Background"
            value={colors.buttonColor}
            onChange={(v) => updateColor("buttonColor", v)}
          />

          <SingleColorInput
            label="Text"
            value={colors.buttonTextColor}
            onChange={(v) => updateColor("buttonTextColor", v)}
          />
        </div>

        <p className="text-xs text-[#6B7280] mb-3">Preferences</p>
        <div className="space-y-4">
          <SingleColorInput
            label="Background"
            value={colors.preferencesButtonBg}
            onChange={(v) => updateColor("preferencesButtonBg", v)}
          />

          <SingleColorInput
            label="Text"
            value={colors.preferencesButtonText}
            onChange={(v) => updateColor("preferencesButtonText", v)}
          />
        </div>
      </div>
    </div>
  );
};

export default ColorPickerPanel;