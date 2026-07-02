"use client";

import Accordion from "./ui/Accordion";

// Keep parity with CDN/embed limits so the live banner doesn't truncate unexpectedly.
const NAME_LIMIT = 20;
const DESC_LIMIT = 300;
const LABEL_LIMIT = 20;

function clampLen(value: string, max: number): string {
  const s = value ?? "";
  return s.length > max ? s.slice(0, max) : s;
}

export type CookieCategoryContent = {
  necessary: { name: string; description: string };
  analytics: { name: string; description: string };
  marketing: { name: string; description: string };
  preferences: { name: string; description: string };
  alwaysActiveLabel: string;
};

type CategoryKey = "necessary" | "analytics" | "marketing" | "preferences";

const CATEGORY_ORDER: { key: CategoryKey; label: string }[] = [
  { key: "necessary", label: "Strictly Necessary" },
  { key: "marketing", label: "Marketing" },
  { key: "analytics", label: "Analytics" },
  { key: "preferences", label: "Preferences" },
];

export default function CookieCategoriesAccordion({
  isOpen,
  onToggle,
  bare,
  value,
  onChange,
}: {
  isOpen?: boolean;
  onToggle?: (nextOpen: boolean) => void;
  bare?: boolean;
  value: CookieCategoryContent;
  onChange: (next: CookieCategoryContent) => void;
}) {
  const setName = (key: CategoryKey, name: string) =>
    onChange({
      ...value,
      [key]: { ...value[key], name: clampLen(name, NAME_LIMIT) },
    });

  const setDescription = (key: CategoryKey, description: string) =>
    onChange({
      ...value,
      [key]: { ...value[key], description: clampLen(description, DESC_LIMIT) },
    });

  const setAlwaysActiveLabel = (label: string) =>
    onChange({ ...value, alwaysActiveLabel: clampLen(label, LABEL_LIMIT) });

  return (
    <div className="w-full max-w-[409px] mx-auto">
      <Accordion title="Cookie categories" isOpen={isOpen} onToggle={onToggle} bare={bare}>
        <div className="pb-6 space-y-7">
          {/* "Always Active" label — applies to the Strictly Necessary row */}
          <div className="space-y-2">
            <label
              className="block font-['DM_Sans'] text-base text-black leading-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              &quot;Always Active&quot; label
            </label>
            <input
              type="text"
              value={value.alwaysActiveLabel}
              maxLength={LABEL_LIMIT}
              onChange={(e) => setAlwaysActiveLabel(e.target.value)}
              className="w-full h-12 px-4 bg-white border rounded-lg focus:outline-none font-['DM_Sans'] text-base text-[#111827] border-[#e5e5e5] focus:border-[#007aff]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
          </div>

          {CATEGORY_ORDER.map(({ key, label }) => (
            <div key={key} className="space-y-3 border-t border-[#ededed] pt-5">
              <p
                className="font-semibold text-sm text-black leading-5"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                {label}
              </p>

              {/* Category name */}
              <div className="space-y-2">
                <label
                  className="block font-['DM_Sans'] text-base text-black leading-5"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={value[key].name}
                  maxLength={NAME_LIMIT}
                  onChange={(e) => setName(key, e.target.value)}
                  className="w-full h-12 px-4 bg-white border-[3px] rounded-lg focus:outline-none font-['DM_Sans'] text-base text-[#111827] border-[rgba(0,122,255,0.1)] focus:border-[#007aff]"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                />
              </div>

              {/* Category description */}
              <div className="space-y-2">
                <label
                  className="block font-['DM_Sans'] font-normal text-base text-black leading-5"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  Description
                </label>
                <textarea
                  rows={4}
                  value={value[key].description}
                  maxLength={DESC_LIMIT}
                  onChange={(e) => setDescription(key, e.target.value)}
                  className="w-full p-4 bg-white border rounded-lg focus:outline-none font-['DM_Sans'] text-[15px] text-[#111827] resize-none leading-normal border-[#e5e5e5] focus:border-[#007aff]"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                />
              </div>
            </div>
          ))}
        </div>
      </Accordion>
    </div>
  );
}
