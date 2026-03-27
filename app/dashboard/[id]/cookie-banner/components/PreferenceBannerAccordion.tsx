"use client";

import { useEffect, useState } from "react";
import Accordion from "./ui/Accordion";

const LIMITS = { title: 60, message: 320, button: 40 } as const;

function clampLen(value: string, max: number): string {
  const s = value ?? "";
  return s.length > max ? s.slice(0, max) : s;
}

export default function PreferenceBannerAccordion({
  variant = "gdpr",
  isOpen,
  onToggle,
  value,
  onChange,
}: {
  variant?: "gdpr" | "ccpa";
  isOpen?: boolean;
  onToggle?: (nextOpen: boolean) => void;
  value?: { title?: string; message?: string; saveButtonLabel?: string };
  onChange?: (next: {
    title: string;
    message: string;
    saveButtonLabel?: string;
  }) => void;
}) {
  const [settings, setSettings] = useState({
    title: "Cookie Preferences",
    overview:
      "By clicking, you agree to store cookies on your device to enhance navigation, analyze usage, and support marketing.",
    savePreferences: "Save My Preferences",
  });

  const update = (key: keyof typeof settings, v: string) => {
    setSettings((prev) => ({ ...prev, [key]: v }));
  };

  useEffect(() => {
    if (!value) return;
    setSettings((prev) => ({
      ...prev,
      title: value.title ?? prev.title,
      overview: value.message ?? prev.overview,
      savePreferences: value.saveButtonLabel ?? prev.savePreferences,
    }));
  }, [value?.title, value?.message, value?.saveButtonLabel]);

  const accordionTitle =
    variant === "ccpa" ? "Preference banner (opt-out)" : "Preference Banner";

  const overviewLabel =
    variant === "ccpa" ? "Introduction" : "Privacy overview";

  return (
    <div className="w-full max-w-[409px] mx-auto">
      <Accordion title={accordionTitle} isOpen={isOpen} onToggle={onToggle}>
        <div className="pb-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Title
            </label>
            <input
              type="text"
              value={settings.title}
              maxLength={LIMITS.title}
              onChange={(e) => {
                const nextTitle = clampLen(e.target.value, LIMITS.title);
                update("title", nextTitle);
                onChange?.({
                  title: nextTitle,
                  message: settings.overview,
                  saveButtonLabel:
                    variant === "ccpa" ? settings.savePreferences : undefined,
                });
              }}
              className="w-full h-12 px-4 bg-white border-[3px] rounded-lg focus:outline-none font-['DM_Sans'] text-base text-[#111827] border-[rgba(0,122,255,0.1)] focus:border-[#007aff]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* Main copy */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] font-normal text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {overviewLabel}
            </label>

            <textarea
              rows={variant === "ccpa" ? 8 : 6}
              value={settings.overview}
              maxLength={LIMITS.message}
              onChange={(e) => {
                const v = clampLen(e.target.value, LIMITS.message);
                update("overview", v);
                onChange?.({
                  title: settings.title,
                  message: v,
                  saveButtonLabel:
                    variant === "ccpa" ? settings.savePreferences : undefined,
                });
              }}
              className="w-full p-4 bg-white border rounded-lg focus:outline-none font-['DM_Sans'] text-[15px] text-[#111827] resize-none leading-normal border-[#e5e5e5] focus:border-[#007aff]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* Save button label */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {variant === "ccpa"
                ? '"Save my preferences" button'
                : '"Save My Preferences" button'}
            </label>

            <input
              type="text"
              value={settings.savePreferences}
              maxLength={LIMITS.button}
              onChange={(e) => {
                const v = clampLen(e.target.value, LIMITS.button);
                update("savePreferences", v);
                onChange?.({
                  title: settings.title,
                  message: settings.overview,
                  saveButtonLabel: v,
                });
              }}
              className="w-full h-12 px-4 bg-white border rounded-lg font-['DM_Sans'] text-base text-[#111827] border-[#e5e5e5]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>
        </div>
      </Accordion>
    </div>
  );
}
