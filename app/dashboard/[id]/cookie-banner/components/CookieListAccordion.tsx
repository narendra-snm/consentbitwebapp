"use client";

import { useState } from "react";
import Accordion from "./ui/Accordion";
import ToggleSwitch from "./ui/ToggleSwitch";

export default function CookieListAccordion({
  isOpen,
  onToggle,
}: {
  isOpen?: boolean;
  onToggle?: (nextOpen: boolean) => void;
}) {
  const [settings, setSettings] = useState({
    showCookieList: true,
    embedCode: '<div class="cky-audit-table-element"></div>',
    cookieLabel: "Show less",
    duration: "Duration",
    description: "Description",
    alwaysActive: "Always Active",
    noCookies: "No cookies to display.",
  });

  const update = (key: keyof typeof settings, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full max-w-[409px] mx-auto">
      <Accordion title="Cookie List" isOpen={isOpen} onToggle={onToggle}>
        <div className="pb-6 space-y-6">

          {/* Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                className="block font-['DM_Sans'] text-base text-black leading-5"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Show cookie list on banner
              </label>

              <ToggleSwitch
                checked={settings.showCookieList}
                onChange={() =>
                  update("showCookieList", !settings.showCookieList)
                }
              />
            </div>
          </div>

          {/* Embed Code */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Embed code
            </label>

            <p className="text-[13px] text-[#6b7280] leading-5">
              Add cookie list to your Cookie/Privacy Policy page with this HTML code.
            </p>

            <textarea
              rows={3}
              value={settings.embedCode}
              onChange={(e) => update("embedCode", e.target.value)}
              className="w-full p-4 bg-white border border-[#e5e5e5] rounded-lg focus:border-[#007aff] focus:outline-none font-['DM_Sans'] text-[15px] text-[#111827] resize-none leading-normal"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* Cookie Label */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Cookie
            </label>

            <input
              type="text"
              value={settings.cookieLabel}
              onChange={(e) => update("cookieLabel", e.target.value)}
              className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg focus:border-[#007aff] focus:outline-none font-['DM_Sans'] text-base text-[#111827]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Duration
            </label>

            <input
              type="text"
              value={settings.duration}
              onChange={(e) => update("duration", e.target.value)}
              className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg focus:border-[#007aff] focus:outline-none font-['DM_Sans'] text-base text-[#111827]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Description
            </label>

            <input
              type="text"
              value={settings.description}
              onChange={(e) => update("description", e.target.value)}
              className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg focus:border-[#007aff] focus:outline-none font-['DM_Sans'] text-base text-[#111827]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* Always Active */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              "Always Active" label
            </label>

            <input
              type="text"
              value={settings.alwaysActive}
              onChange={(e) => update("alwaysActive", e.target.value)}
              className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg font-['DM_Sans'] text-base text-[#111827]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* No Cookies */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              "No cookies to display" label
            </label>

            <input
              type="text"
              value={settings.noCookies}
              onChange={(e) => update("noCookies", e.target.value)}
              className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg font-['DM_Sans'] text-base text-[#111827]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

        </div>
      </Accordion>
    </div>
  );
}