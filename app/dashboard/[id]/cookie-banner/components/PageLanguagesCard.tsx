"use client";
import { useState } from "react";
import Accordion from "./ui/Accordion";
import { PAGE_LANGUAGE_DEFAULTS, PAGE_LANGUAGE_MAX } from "./pageLanguageDefaults";

/**
 * Banner languages (General tab), Essential + Growth only. CookieYes-style, 2026-11-18.
 * The banner follows the language of the PAGE: the runtime reads <html lang> (or
 * window.CONSENTBIT_LANGUAGE) and, if the owner ticked that language here, shows it.
 * Any other page shows the selected (published) language.
 * Saved as translations.config.pageLanguages = { languages: [...], text: { code: {...} } };
 * applied by the worker (consent-manager services/pageLanguages.js + cdnM.js), which
 * re-checks the plan at serve time. Not used for the IAB TCF banner. Quebec / Brazil
 * "Regional requirements" win over this for visitors there.
 */

export type PageLanguages = { languages: string[]; text: Record<string, Record<string, string>> };
export const DEFAULT_PAGE_LANGUAGES: PageLanguages = { languages: [], text: {} };

export const PAGE_LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "nl", label: "Dutch" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pl", label: "Polish" },
  { code: "pt", label: "Portuguese (Portugal)" },
  { code: "pt-br", label: "Portuguese (Brazil)" },
  { code: "es", label: "Spanish" },
  { code: "sv", label: "Swedish" },
  // 2026-11-18: page-only languages (not in the main language dropdown).
  { code: "bg", label: "Bulgarian" },
  { code: "ca", label: "Catalan" },
  { code: "zh", label: "Chinese (Simplified)" },
  { code: "zh-tw", label: "Chinese (Traditional)" },
  { code: "hr", label: "Croatian" },
  { code: "cs", label: "Czech" },
  { code: "da", label: "Danish" },
  { code: "et", label: "Estonian" },
  { code: "eu", label: "Basque" },
  { code: "fi", label: "Finnish" },
  { code: "gl", label: "Galician" },
  { code: "el", label: "Greek" },
  { code: "hi", label: "Hindi" },
  { code: "hu", label: "Hungarian" },
  { code: "is", label: "Icelandic" },
  { code: "id", label: "Indonesian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "lv", label: "Latvian" },
  { code: "lt", label: "Lithuanian" },
  { code: "ms", label: "Malay" },
  { code: "no", label: "Norwegian" },
  { code: "ro", label: "Romanian" },
  { code: "ru", label: "Russian" },
  { code: "sr", label: "Serbian" },
  { code: "sk", label: "Slovak" },
  { code: "sl", label: "Slovenian" },
  { code: "th", label: "Thai" },
  { code: "tr", label: "Turkish" },
  { code: "uk", label: "Ukrainian" },
  { code: "vi", label: "Vietnamese" },
]
  // Only languages the worker has text for (pageLanguageDefaults.ts is generated from it).
  .filter((o) => !!PAGE_LANGUAGE_DEFAULTS[o.code])
  .sort((a, b) => a.label.localeCompare(b.label));

const FIELDS: { key: string; label: string; long?: boolean }[] = [
  { key: "title", label: "Title" },
  { key: "description", label: "Banner message", long: true },
  { key: "acceptAll", label: "Accept button" },
  { key: "rejectAll", label: "Reject button" },
  { key: "customise", label: "Preferences button" },
  { key: "privacyPolicy", label: "Privacy policy link" },
  { key: "cookiePreferences", label: "Preference center title" },
  { key: "managePreferences", label: "Preference center message", long: true },
  { key: "saveMyPreferences", label: "Save button" },
  { key: "essential", label: "Strictly necessary (name)" },
  { key: "essentialDescription", label: "Strictly necessary (description)", long: true },
  { key: "analytics", label: "Analytics (name)" },
  { key: "analyticsDescription", label: "Analytics (description)", long: true },
  { key: "marketing", label: "Marketing (name)" },
  { key: "marketingDescription", label: "Marketing (description)", long: true },
  { key: "preferences", label: "Preferences (name)" },
  { key: "preferencesDescription", label: "Preferences (description)", long: true },
  { key: "ccpaDescription", label: "Opt-out banner message (US)", long: true },
  { key: "doNotSell", label: "Do not sell / share link" },
];

/** Normalise whatever is saved in translations.config.pageLanguages. */
export function readPageLanguagesConfig(raw: any): PageLanguages {
  if (!raw || typeof raw !== "object") return DEFAULT_PAGE_LANGUAGES;
  const known = PAGE_LANGUAGE_OPTIONS.map((o) => o.code);
  const languages = Array.isArray(raw.languages)
    ? raw.languages.map((l: any) => String(l || "").toLowerCase()).filter((l: string) => known.includes(l))
    : [];
  const text: Record<string, Record<string, string>> = {};
  if (raw.text && typeof raw.text === "object") {
    for (const code of languages) {
      const t = raw.text[code];
      if (!t || typeof t !== "object") continue;
      const clean: Record<string, string> = {};
      for (const f of FIELDS) if (typeof t[f.key] === "string" && t[f.key].trim()) clean[f.key] = t[f.key];
      if (Object.keys(clean).length) text[code] = clean;
    }
  }
  return { languages: Array.from(new Set(languages)), text };
}

export default function PageLanguagesCard({
  value,
  onChange,
  publishedLang,
  isPaidPlan,
  onUpgrade,
}: {
  value: PageLanguages;
  onChange: (next: PageLanguages) => void;
  /** The banner's selected language (translations.en.languageSelected). */
  publishedLang: string;
  isPaidPlan: boolean;
  onUpgrade: () => void;
}) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const published = String(publishedLang || "en").toLowerCase();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  // Alphabetical; the search box filters by name or code. (No re-sort on tick: the row would jump.)
  const options = PAGE_LANGUAGE_OPTIONS.filter((o) => o.code !== published)
    .filter((o) => !q || o.label.toLowerCase().includes(q) || o.code.includes(q));

  const toggleLang = (code: string) => {
    if (!isPaidPlan) {
      setShowUpgrade(true);
      return;
    }
    const on = value.languages.includes(code);
    const languages = on ? value.languages.filter((l) => l !== code) : [...value.languages, code];
    const text = { ...value.text };
    if (on) delete text[code];
    if (on && editing === code) setEditing(null);
    onChange({ languages, text });
  };

  const setField = (code: string, key: string, v: string) => {
    const cur = { ...(value.text[code] || {}) };
    if (v === "") delete cur[key];
    else cur[key] = v;
    const text = { ...value.text };
    if (Object.keys(cur).length) text[code] = cur;
    else delete text[code];
    onChange({ ...value, text });
  };

  const resetLang = (code: string) => {
    const text = { ...value.text };
    delete text[code];
    onChange({ ...value, text });
  };

  return (
    <div className="mt-4 mb-4">
      <Accordion title="Banner languages" defaultOpen={false}>
        <p className="text-xs text-[#6b7280] mb-3">
          Show the banner in the language of the page. We read the page&apos;s <code>lang</code> attribute (for
          example <code>&lt;html lang=&quot;fr&quot;&gt;</code>). Pages in any other language show your selected
          language.
        </p>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search languages"
          className="w-full mb-2 rounded-md border border-gray-200 px-2 py-1 text-xs text-black"
        />
        <p className="text-[11px] text-[#6b7280] mb-1">{value.languages.length} selected</p>
        <div className="max-h-80 overflow-y-auto pr-1">
        {options.map((o) => {
          const on = isPaidPlan && value.languages.includes(o.code);
          const edited = !!value.text[o.code];
          return (
            <div key={o.code} className="py-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  className={`flex items-center gap-2 ${isPaidPlan ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleLang(o.code)}
                    className="accent-[#007aff]"
                  />
                  <span className="text-sm text-black">{o.label}</span>
                  {edited && <span className="text-[10px] text-[#007aff]">edited</span>}
                </label>
                {on && (
                  <button
                    type="button"
                    onClick={() => setEditing(editing === o.code ? null : o.code)}
                    className="text-xs text-[#007aff] font-medium"
                  >
                    {editing === o.code ? "Close" : "Edit text"}
                  </button>
                )}
              </div>

              {on && editing === o.code && (
                <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                  <p className="text-xs text-[#6b7280]">
                    Leave a box empty to use our default text (shown in grey).
                  </p>
                  {FIELDS.map((f) => {
                    const def = (PAGE_LANGUAGE_DEFAULTS[o.code] || {})[f.key] || "";
                    const val = (value.text[o.code] || {})[f.key] || "";
                    const max = PAGE_LANGUAGE_MAX[f.key] || 300;
                    const common = {
                      value: val,
                      placeholder: def,
                      maxLength: max,
                      onChange: (e: any) => setField(o.code, f.key, e.target.value),
                      className:
                        "w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-black placeholder:text-[#9ca3af]",
                    };
                    return (
                      <label key={f.key} className="block">
                        <span className="block text-[11px] text-[#4b5563] mb-0.5">{f.label}</span>
                        {f.long ? <textarea rows={3} {...common} /> : <input type="text" {...common} />}
                      </label>
                    );
                  })}
                  {edited && (
                    <button
                      type="button"
                      onClick={() => resetLang(o.code)}
                      className="text-xs text-[#b91c1c] font-medium"
                    >
                      Reset to default text
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        </div>

        {showUpgrade && !isPaidPlan && (
          <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-sm font-semibold mb-1">Upgrade for banner languages</p>
            <p className="text-xs text-[#1A5EA1] mb-2">Banner languages are available on the Essential and Growth plans.</p>
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
          Page has no <code>lang</code> attribute? Add this line above the ConsentBit script on that page:
        </p>
        <pre className="mt-1 rounded-md bg-[#f3f4f6] px-2 py-1.5 text-[11px] text-black overflow-x-auto">
          {'<script>window.CONSENTBIT_LANGUAGE = "fr";</script>'}
        </pre>
      </Accordion>
    </div>
  );
}
