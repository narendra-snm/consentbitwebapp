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
        <div className="space-y-5">

          {/* Title */}
          <div className="space-y-1">
            <label className="text-sm text-black">Title</label>
            <input
              type="text"
              value={settings.title}
              onChange={(e) => update("title", e.target.value)}
              className="w-full h-11 px-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#007aff]"
            />
          </div>

          {/* Privacy overview */}
          <div className="space-y-1">
            <label className="text-sm text-black">Privacy overview</label>

            <textarea
              rows={7}
              value={settings.overview}
              onChange={(e) => update("overview", e.target.value)}
              className="w-full p-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#007aff] resize-none text-sm"
            />
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-black">
              Show Google Privacy Policy
            </label>

            <ToggleSwitch
              checked={settings.showPolicy}
              onChange={() => update("showPolicy", !settings.showPolicy)}
            />
          </div>

          {/* Message */}
          <div className="space-y-1">
            <label className="text-sm text-black">Message</label>

            <textarea
              rows={3}
              value={settings.message}
              onChange={(e) => update("message", e.target.value)}
              className="w-full p-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#007aff] resize-none text-sm"
            />
          </div>

          {/* Link text */}
          <div className="space-y-1">
            <label className="text-sm text-black">Link text</label>

            <input
              type="text"
              value={settings.linkText}
              onChange={(e) => update("linkText", e.target.value)}
              className="w-full h-11 px-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#007aff]"
            />
          </div>

          {/* URL */}
          <div className="space-y-1">
            <label className="text-sm text-black">URL</label>

            <input
              type="text"
              value={settings.url}
              onChange={(e) => update("url", e.target.value)}
              className="w-full h-11 px-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#007aff]"
            />
          </div>

          {/* Save Preferences */}
          <div className="space-y-1">
            <label className="text-sm text-black">
              "Save My Preferences" button
            </label>

            <input
              type="text"
              value={settings.savePreferences}
              onChange={(e) => update("savePreferences", e.target.value)}
              className="w-full h-11 px-3 border border-[#e5e5e5] rounded-lg"
            />
          </div>

          {/* Show more */}
          <div className="space-y-1">
            <label className="text-sm text-black">"Show more" button</label>

            <input
              type="text"
              value={settings.showMore}
              onChange={(e) => update("showMore", e.target.value)}
              className="w-full h-11 px-3 border border-[#e5e5e5] rounded-lg"
            />
          </div>

          {/* Show less */}
          <div className="space-y-1">
            <label className="text-sm text-black">"Show less" button</label>

            <input
              type="text"
              value={settings.showLess}
              onChange={(e) => update("showLess", e.target.value)}
              className="w-full h-11 px-3 border border-[#e5e5e5] rounded-lg"
            />
          </div>

        </div>
      </Accordion>
    </div>
  );
}