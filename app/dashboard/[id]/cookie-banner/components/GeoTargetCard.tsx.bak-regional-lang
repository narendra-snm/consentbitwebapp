"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Geo-target banner (General tab). Decides WHICH visitors see the banner:
 *   Global          everyone (every plan)
 *   EU Countries & UK / Select Countries   Essential + Growth only
 * Visitors outside the target see no banner and nothing is blocked for them.
 * Saved as translations.config.geoTarget; enforced by the worker (cdnM.js), which also
 * re-checks the plan at serve time, so a downgraded site falls back to Global.
 *
 * Quebec and Brazil: when selected, visitors there see the banner in French /
 * Brazilian Portuguese (worker-side); everywhere else, the customer's chosen language.
 */

export type GeoTargetMode = "global" | "eu_uk" | "countries";
export type GeoTarget = { mode: GeoTargetMode; countries: string[] };
export const DEFAULT_GEO_TARGET: GeoTarget = { mode: "global", countries: [] };

/** Quebec is a province; its code matches the worker's `${country}-${region}` key. */
const QUEBEC = "CA-QC";

// ISO 3166-1 alpha-2. Names come from Intl.DisplayNames so they stay correct and short.
const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT " +
  "MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG " +
  "UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

function regionName(code: string, dn: Intl.DisplayNames | null): string {
  if (code === QUEBEC) return "Quebec (Canada)";
  try {
    return (dn && dn.of(code)) || code;
  } catch {
    return code;
  }
}

/** Short / common names people type, so the search finds them. */
const ALIASES: Record<string, string[]> = {
  GB: ["uk", "united kingdom", "britain", "great britain", "england", "scotland", "wales"],
  US: ["usa", "us", "america", "united states of america"],
  AE: ["uae", "emirates", "dubai"],
  NL: ["holland"],
  KR: ["korea", "south korea"],
  KP: ["north korea"],
  CZ: ["czech republic"],
  RU: ["russia"],
  CA: ["canada"],
  "CA-QC": ["quebec", "québec", "qc"],
  DE: ["germany", "deutschland"],
  CH: ["switzerland", "swiss"],
  SA: ["ksa", "saudi"],
  ZA: ["rsa", "south africa"],
  BR: ["brasil"],
};

const LANGUAGE_NOTE: Record<string, string> = {
  [QUEBEC]: "French",
  CA: "French for visitors in Quebec",
  BR: "Brazilian Portuguese",
};

export default function GeoTargetCard({
  value,
  onChange,
  isPaidPlan,
  onUpgrade,
}: {
  value: GeoTarget;
  onChange: (next: GeoTarget) => void;
  isPaidPlan: boolean;
  onUpgrade: () => void;
}) {
  const [query, setQuery] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  // After "Select all" there can be ~250 chips; show the first CHIP_LIMIT unless expanded.
  const [showAllChips, setShowAllChips] = useState(false);
  const CHIP_LIMIT = 30;

  const options = useMemo(() => {
    let dn: Intl.DisplayNames | null = null;
    try {
      dn = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      dn = null;
    }
    const list = [...COUNTRY_CODES, QUEBEC].map((code) => ({ code, name: regionName(code, dn) }));
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const selected = new Set(value.countries);
  const q = query.trim().toLowerCase();
  // Matches the name, the code, or a common alias; names starting with the query first.
  // With no query, the selected countries are listed first.
  const filtered = useMemo(() => {
    const hits = q
      ? options.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            o.code.toLowerCase() === q ||
            (ALIASES[o.code] || []).some((a) => a.includes(q)),
        )
      : options;
    const rank = (o: { code: string; name: string }) =>
      q ? (o.name.toLowerCase().startsWith(q) || (ALIASES[o.code] || []).some((a) => a.startsWith(q)) ? 0 : 1)
        : (selected.has(o.code) ? 0 : 1);
    return [...hits].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, options, value.countries]);

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (value.mode === "countries" && isPaidPlan) searchRef.current?.focus();
  }, [value.mode, isPaidPlan]);

  const choose = (mode: GeoTargetMode) => {
    if (mode !== "global" && !isPaidPlan) {
      setShowUpgrade(true);
      return;
    }
    setShowUpgrade(false);
    onChange({ mode, countries: value.countries });
  };

  const toggleCountry = (code: string) => {
    const next = new Set(value.countries);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange({ mode: "countries", countries: [...next] });
  };

  const languageNotes = value.mode === "countries"
    ? value.countries.filter((c) => LANGUAGE_NOTE[c]).map((c) => `${options.find((o) => o.code === c)?.name || c}: ${LANGUAGE_NOTE[c]}`)
    : [];

  const Radio = ({ mode, label, paid }: { mode: GeoTargetMode; label: string; paid?: boolean }) => {
    const locked = paid && !isPaidPlan;
    return (
      <label className={`flex items-center gap-2 py-1.5 ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
        <input
          type="radio"
          name="geo-target-mode"
          checked={value.mode === mode}
          onChange={() => choose(mode)}
          className="accent-[#007aff]"
        />
        <span className="text-sm text-black">{label}</span>
        {paid && (
          <span className="text-[10px] font-semibold text-[#b45309] bg-[#fef3c7] rounded px-1.5 py-0.5">Essential / Growth</span>
        )}
      </label>
    );
  };

  return (
    <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg p-4 mt-4 mb-4">
      <p className="font-semibold text-base text-black mb-1">Geo-target banner</p>
      <p className="text-xs text-[#6b7280] mb-3">Choose which visitors see the banner, based on their location.</p>

      <Radio mode="global" label="Global" />
      {/* Hidden 2026-10-13: "EU Countries & UK" (EU + UK only). The worker still supports
          mode 'eu_uk'; restore this line to offer it again.
      <Radio mode="eu_uk" label="EU Countries & UK" paid /> */}
      <Radio mode="countries" label="Select Countries" paid />

      {showUpgrade && !isPaidPlan && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-sm font-semibold mb-1">Upgrade to target countries</p>
          <p className="text-xs text-[#1A5EA1] mb-2">Geo-targeting is available on the Essential and Growth plans.</p>
          <button
            type="button"
            onClick={onUpgrade}
            className="h-8 px-3 rounded-md bg-[#007AFF] text-white text-xs font-semibold"
          >
            Upgrade plan
          </button>
        </div>
      )}

      {value.mode === "countries" && isPaidPlan && (
        <div className="mt-2">
          {value.countries.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(showAllChips ? value.countries : value.countries.slice(0, CHIP_LIMIT)).map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-white border border-[#d1d5db] px-2 py-0.5 text-xs">
                  {options.find((o) => o.code === c)?.name || c}
                  <button type="button" aria-label={`Remove ${c}`} onClick={() => toggleCountry(c)} className="text-[#6b7280] hover:text-black">
                    ×
                  </button>
                </span>
              ))}
              {value.countries.length > CHIP_LIMIT && (
                <button type="button" onClick={() => setShowAllChips((v) => !v)} className="text-xs text-[#007aff] hover:underline px-1">
                  {showAllChips ? "Show less" : `+${value.countries.length - CHIP_LIMIT} more`}
                </button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#6b7280]">{value.countries.length} selected</span>
            <div className="flex items-center gap-3">
            {/* Select all = every country in the current search results (all countries when
                the search box is empty), added to what is already selected. */}
            {filtered.some((o) => !selected.has(o.code)) && (
              <button
                type="button"
                onClick={() => onChange({ mode: "countries", countries: [...new Set([...value.countries, ...filtered.map((o) => o.code)])] })}
                className="text-xs text-[#007aff] hover:underline"
              >
                {q ? "Select all results" : "Select all"}
              </button>
            )}
            {value.countries.length > 0 && (
              <button type="button" onClick={() => onChange({ mode: "countries", countries: [] })} className="text-xs text-[#007aff] hover:underline">
                Clear all
              </button>
            )}
            </div>
          </div>
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <circle cx="11" cy="11" r="7" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter ticks the top match, then clears the box for the next country.
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered[0]) {
                    if (!selected.has(filtered[0].code)) toggleCountry(filtered[0].code);
                    setQuery("");
                  }
                } else if (e.key === "Escape") {
                  setQuery("");
                }
              }}
              placeholder="Search countries (e.g. France, UK, Quebec)"
              aria-label="Search countries"
              className="w-full h-9 pl-8 pr-8 rounded-lg border border-[#d1d5db] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#007aff]"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-black text-base leading-none"
              >
                ×
              </button>
            )}
          </div>
          {q && filtered[0] && (
            <p className="text-[11px] text-[#6b7280] mt-1">Press Enter to add {filtered[0].name}</p>
          )}
          <div className="mt-1 max-h-[180px] overflow-y-auto rounded-lg border border-[#e5e7eb] bg-white">
            {filtered.map((o) => (
              <label key={o.code} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[#f9fafb] cursor-pointer">
                <input type="checkbox" checked={selected.has(o.code)} onChange={() => toggleCountry(o.code)} className="accent-[#007aff]" />
                {o.name}
              </label>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-[#6b7280]">No match</p>}
          </div>
          {value.countries.length === 0 && (
            <p className="text-xs text-[#b91c1c] mt-1.5">Select at least one country, or no visitor will see the banner.</p>
          )}
          {languageNotes.length > 0 && (
            <p className="text-xs text-[#4b5563] mt-1.5">
              Banner language by location: {languageNotes.join("; ")}. Everywhere else: your selected language.
            </p>
          )}
        </div>
      )}

      {value.mode !== "global" && isPaidPlan && (
        <p className="text-xs text-[#92400e] bg-[#fffbeb] border border-[#fde68a] rounded-md p-2 mt-3 leading-relaxed">
          Visitors outside the selected area won&apos;t see a banner, and cookies will load for them without consent.
          Many countries outside the EU and UK also require consent (for example Brazil, Quebec, Switzerland,
          Australia), so include every country where you have visitors and the law applies.
        </p>
      )}
    </div>
  );
}
