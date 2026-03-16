"use client";

import { useState } from "react";
import Accordion from "./ui/Accordion";
import ToggleSwitch from "./ui/ToggleSwitch";

export default function CookieListAccordion() {
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
      <Accordion title="Cookie List">
        <div className="space-y-5">

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-black">
              Show cookie list on banner
            </label>

            <ToggleSwitch
              checked={settings.showCookieList}
              onChange={() =>
                update("showCookieList", !settings.showCookieList)
              }
            />
          </div>

          {/* Embed Code */}
          <div className="space-y-1">
            <label className="text-sm text-black">Embed code</label>

            <p className="text-xs text-gray-500">
              Add cookie list to your Cookie/Privacy Policy page with this HTML code.
            </p>

            <textarea
              rows={2}
              value={settings.embedCode}
              onChange={(e) => update("embedCode", e.target.value)}
              className="w-full p-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#007aff] text-sm resize-none"
            />
          </div>

          {/* Cookie Label */}
          <div className="space-y-1">
            <label className="text-sm text-black">Cookie</label>

            <input
              type="text"
              value={settings.cookieLabel}
              onChange={(e) => update("cookieLabel", e.target.value)}
              className="w-full h-11 px-3 border border-[#e5e5e5] rounded-lg"
            />
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <label className="text-sm text-black">Duration</label>

            <input
              type="text"
              value={settings.duration}
              onChange={(e) => update("duration", e.target.value)}
              className="w-full h-11 px-3 border border-[#e5e5e5] rounded-lg"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm text-black">Description</label>

            <input
              type="text"
              value={settings.description}
              onChange={(e) => update("description", e.target.value)}
              className="w-full h-11 px-3 border border-[#e5e5e5] rounded-lg"
            />
          </div>

          {/* Always Active */}
          <div className="space-y-1">
            <label className="text-sm text-black">
              "Always Active" label
            </label>

            <input
              type="text"
              value={settings.alwaysActive}
              onChange={(e) => update("alwaysActive", e.target.value)}
              className="w-full h-11 px-3 border border-[#e5e5e5] rounded-lg"
            />
          </div>

          {/* No Cookies */}
          <div className="space-y-1">
            <label className="text-sm text-black">
              "No cookies to display" label
            </label>

            <input
              type="text"
              value={settings.noCookies}
              onChange={(e) => update("noCookies", e.target.value)}
              className="w-full h-11 px-3 border border-[#e5e5e5] rounded-lg"
            />
          </div>

        </div>
      </Accordion>
    </div>
  );
}