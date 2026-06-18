"use client";

import { useEffect, useState } from "react";
import Accordion from "./ui/Accordion";

// Keep parity with CDN/embed + Cookie Notice editor limits to avoid "preview looks broken" states.
// CCPA opt-out introduction copy is longer; allow more characters so defaults aren't truncated.
const LIMITS = { title: 30, message: 600, button: 20 } as const;

function clampLen(value: string, max: number): string {
  const s = value ?? "";
  return s.length > max ? s.slice(0, max) : s;
}

export default function PreferenceBannerAccordion({
  variant = "gdpr",
  isOpen,
  onToggle,
  plain,
  bare,
  value,
  onChange,
}: {
  variant?: "gdpr" | "ccpa";
  isOpen?: boolean;
  onToggle?: (nextOpen: boolean) => void;
  plain?: boolean;
  bare?: boolean;
  value?: { title?: string; message?: string; saveButtonLabel?: string; cancelLabel?: string };
  onChange?: (next: {
    title: string;
    message: string;
    saveButtonLabel?: string;
    cancelLabel?: string;
  }) => void;
}) {
  const [settings, setSettings] = useState({
    title: "Cookie Preferences",
    overview:
      "By clicking, you agree to store cookies on your device to enhance navigation, analyze usage, and support marketing.",
    savePreferences: "Save My Preferences",
    cancel: "Cancel",
  });

  const update = (key: keyof typeof settings, v: string) => {
    setSettings((prev) => ({ ...prev, [key]: v }));
  };

  useEffect(() => {
    if (!value) return;
    setSettings((prev) => ({
      ...prev,
      title: clampLen(value.title ?? prev.title, LIMITS.title),
      overview: clampLen(value.message ?? prev.overview, LIMITS.message),
      savePreferences: clampLen(value.saveButtonLabel ?? prev.savePreferences, LIMITS.button),
      cancel: clampLen(value.cancelLabel ?? prev.cancel, LIMITS.button),
    }));
  }, [value?.title, value?.message, value?.saveButtonLabel, value?.cancelLabel]);

  const accordionTitle =
    variant === "ccpa" ? "Preference banner (opt-out)" : "Preference Banner";

  const overviewLabel =
    variant === "ccpa" ? "Introduction" : "Privacy overview";

  return (
    <div className="w-full max-w-[409px] mx-auto">
      <Accordion title={accordionTitle} isOpen={isOpen} onToggle={onToggle} plain={plain} bare={bare}>
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
                  cancelLabel: variant === "ccpa" ? settings.cancel : undefined,
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
                  cancelLabel: variant === "ccpa" ? settings.cancel : undefined,
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
                  cancelLabel: variant === "ccpa" ? settings.cancel : undefined,
                });
              }}
              className="w-full h-12 px-4 bg-white border rounded-lg font-['DM_Sans'] text-base text-[#111827] border-[#e5e5e5]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* Cancel button label — CCPA opt-out modal only */}
          {variant === "ccpa" && (
            <div className="space-y-2">
              <label
                className="block font-['DM_Sans'] text-base text-black leading-5"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                &quot;Cancel&quot; button
              </label>

              <input
                type="text"
                value={settings.cancel}
                maxLength={LIMITS.button}
                onChange={(e) => {
                  const v = clampLen(e.target.value, LIMITS.button);
                  update("cancel", v);
                  onChange?.({
                    title: settings.title,
                    message: settings.overview,
                    saveButtonLabel: settings.savePreferences,
                    cancelLabel: v,
                  });
                }}
                className="w-full h-12 px-4 bg-white border rounded-lg font-['DM_Sans'] text-base text-[#111827] border-[#e5e5e5]"
                style={{ fontVariationSettings: "'opsz' 14" }}
              />
            </div>
          )}
        </div>
      </Accordion>
    </div>
  );
}
