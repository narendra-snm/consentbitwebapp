"use client";
import { useMemo, useRef, useState } from "react";

/**
 * Banner region (General tab, all plans), modelled on CookieYes "Geo-target banner".
 * The banner TYPE (GDPR / CCPA / GDPR + CCPA) is chosen separately and works as before;
 * this card decides WHERE that banner is shown:
 *   GDPR banner   Worldwide (default) | Europe (EU, EEA, UK & Switzerland) | Select countries
 *   CCPA banner   Worldwide (default) | United States | Select countries
 * On GDPR + CCPA each banner has its own region. The visitor's location still routes the
 * banner (US → CCPA, everyone else → GDPR); there the CCPA default means "the US" and the
 * GDPR default means "everyone not shown the CCPA banner".
 * Visitors outside the region see no banner, nothing is blocked for them and Google
 * Consent Mode is granted (denied only for a GPC signal).
 * Saved as translations.config.bannerRegion (see serializeBannerRegion); applied by the
 * worker (cdnM.js "Banner region", which documents the exact rules).
 */

export type GdprRegion = "worldwide" | "europe" | "countries";
export type CcpaRegion = "worldwide" | "us" | "countries";
export type BannerRegion = {
  gdpr: GdprRegion;
  gdprCountries: string[];
  ccpa: CcpaRegion;
  ccpaCountries: string[];
};
export const DEFAULT_BANNER_REGION: BannerRegion = { gdpr: "worldwide", gdprCountries: [], ccpa: "worldwide", ccpaCountries: [] };

const CODE_RE = /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/;
function cleanList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((c) => String(c).toUpperCase()).filter((c) => CODE_RE.test(c)))];
}

/** Saved value → state. Missing / junk = worldwide; the first version saved the string "europe". */
export function readBannerRegion(raw: unknown): BannerRegion {
  if (raw === "europe") return { ...DEFAULT_BANNER_REGION, gdpr: "europe" };
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BANNER_REGION };
  const r = raw as Record<string, unknown>;
  const g = String(r.gdpr ?? "");
  const c = String(r.ccpa ?? "");
  return {
    gdpr: g === "europe" || g === "countries" ? g : "worldwide",
    gdprCountries: cleanList(r.gdprCountries),
    ccpa: c === "us" || c === "countries" ? c : "worldwide",
    ccpaCountries: cleanList(r.ccpaCountries),
  };
}

/** State → saved value (translations.config.bannerRegion). */
export function serializeBannerRegion(v: BannerRegion): BannerRegion {
  return {
    gdpr: v.gdpr,
    gdprCountries: cleanList(v.gdprCountries),
    ccpa: v.ccpa,
    ccpaCountries: cleanList(v.ccpaCountries),
  };
}

/** Stable string for unsaved-changes checks. */
export function bannerRegionKey(v: BannerRegion | null): string {
  return v ? JSON.stringify(serializeBannerRegion(v)) : "";
}

/** Quebec is a province; its code matches the worker's `${country}-${regionCode}` key. */
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
  [QUEBEC]: ["quebec", "québec", "qc"],
  DE: ["germany", "deutschland"],
  CH: ["switzerland", "swiss"],
  SA: ["ksa", "saudi"],
  ZA: ["rsa", "south africa"],
  BR: ["brasil"],
};

type Option = { code: string; name: string };

function useCountryOptions(): Option[] {
  return useMemo(() => {
    let dn: Intl.DisplayNames | null = null;
    try {
      dn = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      dn = null;
    }
    const list = [...COUNTRY_CODES, QUEBEC].map((code) => ({ code, name: regionName(code, dn) }));
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, []);
}

/** Search + checkbox list + chips. Module-level so the search box keeps focus while typing. */
function CountryPicker({
  countries,
  onChange,
  options,
  inputRef,
}: {
  countries: string[];
  onChange: (next: string[]) => void;
  options: Option[];
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState("");
  // After "Select all" there can be ~250 chips; show the first CHIP_LIMIT unless expanded.
  const [showAllChips, setShowAllChips] = useState(false);
  const CHIP_LIMIT = 30;
  const selected = new Set(countries);
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
    const rank = (o: Option) =>
      q
        ? o.name.toLowerCase().startsWith(q) || (ALIASES[o.code] || []).some((a) => a.startsWith(q)) ? 0 : 1
        : selected.has(o.code) ? 0 : 1;
    return [...hits].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, options, countries]);

  const toggle = (code: string) => {
    const next = new Set(countries);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange([...next]);
  };
  const nameOf = (c: string) => options.find((o) => o.code === c)?.name || c;

  return (
    <div className="mt-2 ml-6">
      {countries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(showAllChips ? countries : countries.slice(0, CHIP_LIMIT)).map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-full bg-white border border-[#d1d5db] px-2 py-0.5 text-xs">
              {nameOf(c)}
              <button type="button" aria-label={`Remove ${nameOf(c)}`} onClick={() => toggle(c)} className="text-[#6b7280] hover:text-black">
                ×
              </button>
            </span>
          ))}
          {countries.length > CHIP_LIMIT && (
            <button type="button" onClick={() => setShowAllChips((v) => !v)} className="text-xs text-[#007aff] hover:underline px-1">
              {showAllChips ? "Show less" : `+${countries.length - CHIP_LIMIT} more`}
            </button>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[#6b7280]">{countries.length} selected</span>
        <div className="flex items-center gap-3">
          {/* Select all = every country in the current search results (all countries when
              the search box is empty), added to what is already selected. */}
          {filtered.some((o) => !selected.has(o.code)) && (
            <button
              type="button"
              onClick={() => onChange([...new Set([...countries, ...filtered.map((o) => o.code)])])}
              className="text-xs text-[#007aff] hover:underline"
            >
              {q ? "Select all results" : "Select all"}
            </button>
          )}
          {countries.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="text-xs text-[#007aff] hover:underline">
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
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter ticks the top match, then clears the box for the next country.
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[0]) {
                if (!selected.has(filtered[0].code)) toggle(filtered[0].code);
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
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-black text-base leading-none"
          >
            ×
          </button>
        )}
      </div>
      {q && filtered[0] && <p className="text-[11px] text-[#6b7280] mt-1">Press Enter to add {filtered[0].name}</p>}
      <div className="mt-1 max-h-[180px] overflow-y-auto rounded-lg border border-[#e5e7eb] bg-white">
        {filtered.map((o) => (
          <label key={o.code} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[#f9fafb] cursor-pointer">
            <input type="checkbox" checked={selected.has(o.code)} onChange={() => toggle(o.code)} className="accent-[#007aff]" />
            {o.name}
          </label>
        ))}
        {filtered.length === 0 && <p className="px-3 py-2 text-xs text-[#6b7280]">No match</p>}
      </div>
    </div>
  );
}

type RegionChoice<M extends string> = { mode: M; label: string };

/** One banner's region: radios, plus the country picker for "Select countries". */
function RegionSection<M extends string>({
  name,
  title,
  choices,
  mode,
  isChecked,
  countries,
  defaultLabel,
  onMode,
  onCountries,
  options,
}: {
  name: string;
  title: string | null;
  choices: RegionChoice<M>[];
  mode: M;
  isChecked: (choice: M) => boolean;
  countries: string[];
  defaultLabel: string;
  onMode: (m: M) => void;
  onCountries: (c: string[]) => void;
  options: Option[];
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-2">
      {title && <p className="text-sm font-semibold text-black mb-0.5">{title}</p>}
      {choices.map((c) => (
        <label key={c.mode} className="flex items-center gap-2 py-1.5 cursor-pointer">
          <input
            type="radio"
            name={name}
            checked={isChecked(c.mode)}
            onChange={() => {
              onMode(c.mode);
              if (c.mode === "countries") setTimeout(() => searchRef.current?.focus(), 0);
            }}
            className="accent-[#007aff]"
          />
          <span className="text-sm text-black">{c.label}</span>
        </label>
      ))}
      {mode === "countries" && (
        <>
          <CountryPicker countries={countries} onChange={onCountries} options={options} inputRef={searchRef} />
          {countries.length === 0 && (
            <p className="text-xs text-[#b91c1c] mt-1.5 ml-6">
              Select at least one country. Until you do, this banner uses its default region ({defaultLabel}).
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function BannerRegionCard({
  value,
  onChange,
  consentType,
}: {
  value: BannerRegion;
  onChange: (next: BannerRegion) => void;
  consentType: "gdpr" | "ccpa" | "both";
}) {
  const options = useCountryOptions();
  const both = consentType === "both";
  const showGdpr = consentType !== "ccpa";
  const showCcpa = consentType !== "gdpr";

  const gdprChoices: RegionChoice<GdprRegion>[] = [
    { mode: "worldwide", label: both ? "Everyone not shown the CCPA banner (default)" : "Worldwide" },
    { mode: "europe", label: "Europe (EU, EEA, UK & Switzerland)" },
    { mode: "countries", label: "Select countries" },
  ];
  // On GDPR + CCPA the CCPA banner already goes to US visitors only, so its default is the US
  // and a separate "Worldwide" choice would do the same thing.
  const ccpaChoices: RegionChoice<CcpaRegion>[] = both
    ? [
        { mode: "worldwide", label: "United States (default)" },
        { mode: "countries", label: "Select countries" },
      ]
    : [
        { mode: "worldwide", label: "Worldwide" },
        { mode: "us", label: "United States" },
        { mode: "countries", label: "Select countries" },
      ];

  // Is any visitor left without a banner? (On GDPR + CCPA, only when the GDPR banner is limited.)
  const limited = both
    ? value.gdpr !== "worldwide"
    : consentType === "ccpa"
      ? value.ccpa !== "worldwide"
      : value.gdpr !== "worldwide";

  return (
    <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg p-4 mt-4 mb-4">
      <p className="font-semibold text-base text-black mb-1">Banner region</p>
      <p className="text-xs text-[#6b7280] mb-1">Choose where visitors see the banner, based on their location.</p>

      {showGdpr && (
        <RegionSection<GdprRegion>
          name="banner-region-gdpr"
          title={both ? "GDPR banner" : null}
          choices={gdprChoices}
          mode={value.gdpr}
          isChecked={(m) => value.gdpr === m}
          countries={value.gdprCountries}
          defaultLabel={both ? "everyone not shown the CCPA banner" : "Worldwide"}
          onMode={(m) => onChange({ ...value, gdpr: m })}
          onCountries={(c) => onChange({ ...value, gdpr: "countries", gdprCountries: c })}
          options={options}
        />
      )}
      {showCcpa && (
        <RegionSection<CcpaRegion>
          name="banner-region-ccpa"
          title={both ? "CCPA banner" : null}
          choices={ccpaChoices}
          mode={value.ccpa}
          // On GDPR + CCPA, a saved "United States" shows as the default choice (same behaviour).
          isChecked={(m) => value.ccpa === m || (both && m === "worldwide" && value.ccpa === "us")}
          countries={value.ccpaCountries}
          defaultLabel={both ? "United States" : "Worldwide"}
          onMode={(m) => onChange({ ...value, ccpa: m })}
          onCountries={(c) => onChange({ ...value, ccpa: "countries", ccpaCountries: c })}
          options={options}
        />
      )}

      {both && (
        <p className="text-xs text-[#6b7280] mt-2">
          Each visitor sees one banner at most. A country inside one banner&apos;s chosen region gets that banner. A
          country inside both gets the banner for its location: CCPA in the US, GDPR everywhere else.
        </p>
      )}

      {limited && (
        <div className="mt-2 space-y-1">
          <p className="text-xs text-[#6b7280]">
            Visitors outside the region won&apos;t see a banner. Nothing is blocked for them, and Google Consent Mode
            is set to granted (unless their browser sends a Global Privacy Control signal).
          </p>
          <p className="text-xs text-[#9a6700]">
            Many countries require a cookie banner (for example the EU, UK, Brazil, India and South Africa). Check the
            laws that apply to your visitors before limiting the region.
          </p>
        </div>
      )}
    </div>
  );
}
