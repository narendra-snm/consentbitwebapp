"use client";
import { useState } from "react";

/**
 * Regional requirements (General tab), Essential + Growth only.
 *   Quebec → visitors in Quebec see the banner in French
 *   Brazil → visitors in Brazil see the banner in Brazilian Portuguese
 * Language only: every visitor still gets a banner from the Consent template, and the
 * consent rules (opt-in, Quebec off by default) apply whether ticked or not.
 * Saved as translations.config.regionalLanguages; applied by the worker (cdnM.js), which
 * re-checks the plan at serve time, so a downgraded site falls back to the selected language.
 * Replaces the 2026-10-12 Geo-target banner (GeoTargetCard.tsx.bak-regional-lang).
 * Also works with the IAB TCF banner: the worker sets the IAB banner's language to fr / pt
 * for these visitors (iabLangOverride in cdnM.js). IAB has no Brazilian Portuguese, so
 * Brazil gets the IAB's standard Portuguese; iabActive shows a note saying so.
 */

export type RegionalLanguages = { quebec: boolean; brazil: boolean };
export const DEFAULT_REGIONAL_LANGUAGES: RegionalLanguages = { quebec: false, brazil: false };

const OPTIONS: { key: keyof RegionalLanguages; label: string; detail: string }[] = [
  {
    key: "quebec",
    label: "Quebec (Law 25)",
    detail: "Visitors in Quebec see the banner in French.",
  },
  {
    key: "brazil",
    label: "Brazil (LGPD)",
    detail: "Visitors in Brazil see the banner in Brazilian Portuguese.",
  },
];

export default function RegionalLanguagesCard({
  value,
  onChange,
  isPaidPlan,
  iabActive = false,
  onUpgrade,
}: {
  value: RegionalLanguages;
  onChange: (next: RegionalLanguages) => void;
  isPaidPlan: boolean;
  iabActive?: boolean;
  onUpgrade: () => void;
}) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const enabled = isPaidPlan;

  const toggle = (key: keyof RegionalLanguages) => {
    if (!isPaidPlan) {
      setShowUpgrade(true);
      return;
    }
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg p-4 mt-4 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <p className="font-semibold text-base text-black">Regional requirements</p>
        <span className="text-[10px] font-semibold text-[#b45309] bg-[#fef3c7] rounded px-1.5 py-0.5">Essential / Growth</span>
      </div>
      <p className="text-xs text-[#6b7280] mb-3">
        Show the banner in the local language to visitors in these places. Everyone else sees your selected language.
      </p>

      {OPTIONS.map((o) => (
        <label
          key={o.key}
          className={`flex items-start gap-2 py-1.5 ${enabled ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
        >
          <input
            type="checkbox"
            checked={enabled && value[o.key]}
            onChange={() => toggle(o.key)}
            className="accent-[#007aff] mt-0.5"
          />
          <span>
            <span className="block text-sm text-black">{o.label}</span>
            <span className="block text-xs text-[#6b7280]">{o.detail}</span>
          </span>
        </label>
      ))}

      {iabActive && isPaidPlan && (
        <p className="text-xs text-[#6b7280] mt-2 leading-relaxed">
          With the IAB TCF banner, Brazil visitors see the IAB&apos;s standard Portuguese text. IAB does not
          publish a Brazilian Portuguese version.
        </p>
      )}

      {showUpgrade && !isPaidPlan && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-sm font-semibold mb-1">Upgrade for regional requirements</p>
          <p className="text-xs text-[#1A5EA1] mb-2">Regional languages are available on the Essential and Growth plans.</p>
          <button
            type="button"
            onClick={onUpgrade}
            className="h-8 px-3 rounded-md bg-[#007AFF] text-white text-xs font-semibold"
          >
            Upgrade plan
          </button>
        </div>
      )}

      <p className="text-xs text-[#4b5563] mt-3 leading-relaxed">
        Select these if you have visitors from Quebec or Brazil. Quebec law requires French for businesses that target
        Quebec, and Brazil expects Portuguese. Consent rules for both places apply automatically either way.
      </p>
    </div>
  );
}
