"use client";

import React, { useRef, useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useAppContext } from "@/app/context/AppProvider";
import type { ColorSettings } from "./bannerAppearance";

type Props = {
  /** When set with `onChange`, panel is controlled from parent `appearance.colors` (publish + preview stay in sync). */
  value?: ColorSettings;
  onChange?: (next: ColorSettings) => void;
};

const ColorPickerPanel: React.FC<Props> = ({ value: controlledValue, onChange: controlledOnChange }) => {
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
        applyPreferenceSync({ ...controlledValue, [key]: v }),
      );
      return;
    }
    ctx.setColors((prev: Record<string, string>) => {
      const raw = { ...prev, [key]: v } as ColorSettings;
      return applyPreferenceSync(raw) as Record<string, string>;
    });
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
    const [inputText, setInputText] = useState(value);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Keep local text in sync when value changes externally (e.g. picker drag)
    useEffect(() => {
      setInputText(value);
    }, [value]);

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

    const handleTextChange = (raw: string) => {
      setInputText(raw);
      const normalised = raw.trim().startsWith("#") ? raw.trim() : `#${raw.trim()}`;
      if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalised)) {
        onPick(normalised);
      }
    };

    return (
      <div className="flex items-center justify-between">
        <label className="text-sm text-[#111827]">{label}</label>

        <div className="relative" ref={popoverRef}>
          <div className="flex items-center w-[150px] h-[36px] bg-[#F9F9FA] border border-[#E5E5E5] rounded-lg overflow-hidden">
            {/* Swatch — click opens picker */}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="w-[42px] h-full shrink-0 border-r border-[#E5E5E5] cursor-pointer"
              style={{ backgroundColor: value }}
              aria-label="Open color picker"
            />
            {/* Editable hex text input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => handleTextChange(e.target.value)}
              onBlur={() => setInputText(value)}
              onFocus={() => setOpen(false)}
              maxLength={7}
              spellCheck={false}
              className="flex-1 text-sm text-[#111827] text-center bg-transparent outline-none px-1"
            />
          </div>

          {open && (
            <div className="absolute top-[44px] right-0 z-50 bg-white p-3 rounded-lg shadow-xl">
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
        <h3 className="text-base font-semibold  mb-5">
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
        <h3 className="text-base font-semibold  mb-5">
          Buttons colors
        </h3>

        <p className="text-xs text-[#6B7280] mb-3">Accept/Reject/Cancel</p>
        <div className="space-y-4 mb-6">
          <ColorInput
            label="Background"
            value={colors.buttonColor}
            onChange={(v) => updateColor("buttonColor", v)}
          />

          <ColorInput
            label="Text"
            value={colors.buttonTextColor}
            onChange={(v) => updateColor("buttonTextColor", v)}
          />
        </div>

        <p className="text-xs text-[#6B7280] mb-3">
          Preferences
        </p>
        <div className="space-y-4">
          <ColorInput
            label="Background"
            value={colors.preferencesButtonBg}
            onChange={(v) => updateColor("preferencesButtonBg", v)}
          />
          <ColorInput
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
