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

  const ColorInput = ({
    label,
    tooltip,
    value,
    onChange: onPick,
  }: {
    label: string;
    tooltip: string;
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

        <div className="relative group" ref={popoverRef}>
          <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-max max-w-[200px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs text-[#374151] shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal">
            {tooltip}
          </span>
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
              className="flex-1 text-sm text-[#111827] text-left bg-transparent outline-none px-2"
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
        <h3 className="text-base font-semibold mb-5">General Colors</h3>

        <div className="space-y-4">
          <SingleColorInput
            label="Banners background"
            // tooltip="Background color of the consent banner card."
            value={colors.bannerBg}
            onChange={(v) => updateColor("bannerBg", v)}
          />

          <SingleColorInput
            label="Text color"
            // tooltip="Color of the body text inside the banner."
            value={colors.textColor}
            onChange={(v) => updateColor("textColor", v)}
          />

          <SingleColorInput
            label="Heading color"
            // tooltip="Color of the banner title and category headings."
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
            // tooltip="Background color of the Accept, Reject and Cancel buttons."
            value={colors.buttonColor}
            onChange={(v) => updateColor("buttonColor", v)}
          />

          <SingleColorInput
            label="Text"
            // tooltip="Text color of the Accept, Reject and Cancel buttons."
            value={colors.buttonTextColor}
            onChange={(v) => updateColor("buttonTextColor", v)}
          />
        </div>

        <p className="text-xs text-[#6B7280] mb-3">Preferences</p>
        <div className="space-y-4">
          <SingleColorInput
            label="Background"
            // tooltip="Background color of the Preferences and Save buttons."
            value={colors.preferencesButtonBg}
            onChange={(v) => updateColor("preferencesButtonBg", v)}
          />

          <SingleColorInput
            label="Text"
            // tooltip="Text color of the Preferences and Save buttons."
            value={colors.preferencesButtonText}
            onChange={(v) => updateColor("preferencesButtonText", v)}
          />
        </div>
      </div>
    </div>
  );
};

export default ColorPickerPanel;