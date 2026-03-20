"use client";

import { useState } from "react";
import Accordion from "./ui/Accordion";
import ToggleSwitch from "./ui/ToggleSwitch";

export default function PreferenceBannerAccordion() {
  const [settings, setSettings] = useState({
    title: "We value your privacy",
    overview:
      "We use cookies to help you navigate efficiently and perform certain functions...",
    showPolicy: true,
    message:
      "For more information on how Google's third-party cookies operate and handle your data, see:",
    linkText: "Google Privacy Policy",
    url: "https://business.safety.google/privacy/",
    savePreferences: "Save My Preferences",
    showMore: "Show more",
    showLess: "Show less",
  });

  const update = (key: keyof typeof settings, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full max-w-[409px] mx-auto">
      <Accordion title="Preference Banner">
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
              onChange={(e) => update("title", e.target.value)}
              className="w-full h-12 px-4 bg-white border-[3px] border-[rgba(0,122,255,0.1)] rounded-lg focus:border-[#007aff] focus:outline-none font-['DM_Sans'] text-base text-[#111827]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* Privacy overview */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Privacy overview
            </label>

            <textarea
              rows={6}
              value={settings.overview}
              onChange={(e) => update("overview", e.target.value)}
              className="w-full p-4 bg-white border border-[#e5e5e5] rounded-lg focus:border-[#007aff] focus:outline-none font-['DM_Sans'] text-[15px] text-[#111827] resize-none leading-normal"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                className="block font-['DM_Sans'] text-base text-black leading-5"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Show Google Privacy Policy
              </label>

              <ToggleSwitch
                checked={settings.showPolicy}
                onChange={() => update("showPolicy", !settings.showPolicy)}
              />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Message
            </label>

            <textarea
              rows={4}
              value={settings.message}
              onChange={(e) => update("message", e.target.value)}
              className="w-full p-4 bg-white border border-[#e5e5e5] rounded-lg focus:border-[#007aff] focus:outline-none font-['DM_Sans'] text-[15px] text-[#111827] resize-none leading-normal"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* Link text */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Link text
            </label>

            <input
              type="text"
              value={settings.linkText}
              onChange={(e) => update("linkText", e.target.value)}
              className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg focus:border-[#007aff] focus:outline-none font-['DM_Sans'] text-base text-[#111827]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* URL */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              URL
            </label>

            <input
              type="text"
              value={settings.url}
              onChange={(e) => update("url", e.target.value)}
              className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg focus:border-[#007aff] focus:outline-none font-['DM_Sans'] text-base text-[#111827]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* Save Preferences */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              "Save My Preferences" button
            </label>

            <input
              type="text"
              value={settings.savePreferences}
              onChange={(e) => update("savePreferences", e.target.value)}
              className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg font-['DM_Sans'] text-base text-[#111827]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* Show more */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              "Show more" button
            </label>

            <input
              type="text"
              value={settings.showMore}
              onChange={(e) => update("showMore", e.target.value)}
              className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg font-['DM_Sans'] text-base text-[#111827]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {/* Show less */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              "Show less" button
            </label>

            <input
              type="text"
              value={settings.showLess}
              onChange={(e) => update("showLess", e.target.value)}
              className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg font-['DM_Sans'] text-base text-[#111827]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

        </div>
      </Accordion>
    </div>
  );
}