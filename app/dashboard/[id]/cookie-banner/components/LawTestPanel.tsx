"use client";
import { useMemo, useState } from "react";
import { resolveBannerTestScriptUrl } from "@/lib/consentbit-script";

/**
 * Law test panel.
 *
 * Produces ONE generalised test URL. Paste it once on a test page; the banner
 * then follows whatever country your VPN exits from, because the worker reads
 * cf.country from the real request. Switch VPN to Brazil → you get what a
 * Brazilian visitor gets. No per-country URL needed.
 *
 * It points at the worker's /cdn-test/ route (handlers/cdnTest.js) rather than
 * the live CDN, so banner experiments never touch the installed script.
 *
 * The forced-country section at the bottom is a fallback for when a VPN exit is
 * not available for some jurisdiction — the live CDN has no such override.
 */

type Row = {
  flag: string;
  label: string;
  expected: string;
  watch?: string;
};

/** What the CURRENT runtime serves per location — the baseline you check against. */
const EXPECTATIONS: Row[] = [
  {
    flag: "🇪🇺",
    label: "EU / EEA",
    expected: "Opt-in banner. Non-essential scripts blocked until accept.",
  },
  {
    flag: "🇺🇸",
    label: "US — California",
    expected: "Opt-out banner. Scripts run until Do Not Sell is set. GPC honoured.",
  },
  {
    flag: "🇺🇸",
    label: "US — Virginia",
    expected: "Opt-out banner, same as California.",
    watch: "Consent record still writes regulation='ccpa'; the statute name is not persisted.",
  },
  {
    flag: "🇺🇸",
    label: "US — Colorado",
    expected: "Opt-out banner. GPC is legally mandatory here.",
  },
  {
    flag: "🇺🇸",
    label: "US — Utah",
    expected: "Opt-out banner. Utah grants no profiling opt-out, so analytics should survive.",
    watch:
      "Known defect — after opting out, the record and Consent Mode say analytics is GRANTED while the blocker BLOCKS it.",
  },
  {
    flag: "🇧🇷",
    label: "Brazil",
    expected: "GDPR opt-in banner, in the language YOU selected in the dashboard — not switched by location.",
    watch: "Consent record: law='LGPD', consent_model='optin', lang_wanted='pt-BR' (recorded only, never shown).",
  },
  {
    flag: "🇦🇺",
    label: "Australia",
    expected: "GDPR opt-in banner, in the language YOU selected — your own text and spelling, unchanged.",
    watch: "Consent record: law='PRIVACY_ACT'. GPC is ignored outside the ccpa banner type.",
  },
  {
    flag: "🇨🇦",
    label: "Canada",
    expected: "GDPR opt-in banner — no PIPEDA behaviour exists.",
    watch: "Quebec needs a stricter banner than the rest of Canada; not implemented.",
  },
  {
    flag: "🌏",
    label: "Singapore · South Africa · Thailand · Saudi Arabia",
    expected: "GDPR opt-in banner, in the language you selected. Consent record carries the local law name.",
  },
];

const FORCE_OPTIONS = [
  { id: "", label: "Use my real location (VPN)" },
  { id: "DE|1", label: "Force: European Union" },
  { id: "US:CA|", label: "Force: US — California" },
  { id: "US:VA|", label: "Force: US — Virginia" },
  { id: "US:CO|", label: "Force: US — Colorado" },
  { id: "US:UT|", label: "Force: US — Utah" },
  { id: "BR|", label: "Force: Brazil" },
  { id: "AU|", label: "Force: Australia" },
  { id: "CA|", label: "Force: Canada" },
  { id: "SG|", label: "Force: Singapore" },
  { id: "ZA|", label: "Force: South Africa" },
  { id: "TH|", label: "Force: Thailand" },
  { id: "SA|", label: "Force: Saudi Arabia" },
];

export default function LawTestPanel({
  scriptUrl,
  siteId,
  cdnScriptId,
  regionMode,
}: {
  scriptUrl?: string | null;
  siteId?: string | null;
  cdnScriptId?: string | null;
  regionMode?: string | null;
}) {
  const [force, setForce] = useState<string>("");
  const [copied, setCopied] = useState<"url" | "snippet" | null>(null);

  const geo = useMemo(() => {
    if (!force) return undefined;
    const [loc, eu] = force.split("|");
    const [country, region] = loc.split(":");
    return { country, region: region || undefined, eu: eu === "1" ? true : undefined };
  }, [force]);

  /** No geo → one generalised URL that follows the real request country. */
  const testUrl = useMemo(
    () => resolveBannerTestScriptUrl(scriptUrl, siteId, cdnScriptId, geo),
    [scriptUrl, siteId, cdnScriptId, geo],
  );

  const snippet = testUrl
    ? `<script id="consentbit" type="text/javascript" src="${testUrl}"></script>`
    : "";

  const ccpaOnly = String(regionMode ?? "").toLowerCase() === "ccpa";

  async function copy(text: string, which: "url" | "snippet") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  }

  return (
    <div className="max-w-[410px] w-full bg-white rounded-lg">
      <div className="bg-[#F9F9FA] border border-[#E5E5E5] rounded-lg p-4 pb-6 space-y-4">

        <div>
          <p className="font-semibold text-base text-black">Law test URL</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#6b7280]">
            One URL for every jurisdiction. Paste it on a test page, then switch your
            VPN — the banner follows whatever country you appear from. Points at the
            test CDN, so the installed script is unaffected.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="cursor-default text-sm text-[#111827]">Script tag</label>
            {testUrl && (
              <button
                type="button"
                onClick={() => copy(snippet, "snippet")}
                className="text-[11px] font-semibold text-[#007AFF] hover:underline"
              >
                {copied === "snippet" ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          <textarea
            readOnly
            value={snippet || "No cdnScriptId for this site yet."}
            rows={3}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-[#374151] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {testUrl && (
            <button
              type="button"
              onClick={() => copy(testUrl, "url")}
              className="mt-2 text-[11px] font-semibold text-[#007AFF] hover:underline"
            >
              {copied === "url" ? "URL copied" : "Copy URL only"}
            </button>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-[#6b7280]">
            Serve the page from this site&rsquo;s registered domain — the test CDN keeps
            the same host check as the live one.
          </p>
        </div>

        {ccpaOnly && (
          <div className="rounded-lg border border-[#9C3B22] bg-[#F6E9E3] p-3">
            <p className="text-[11px] leading-relaxed text-[#9C3B22]">
              This site is set to <strong>CCPA only</strong>. From any non-US location{" "}
              <strong>no banner will render at all</strong> (<code>bannerEnabled=false</code>).
              An empty page means you reproduced that, not that the URL is wrong.
            </p>
          </div>
        )}

        {/* Reference: what each location should produce today */}
        <div>
          <p className="mb-2 text-sm text-[#111827]">What to expect</p>
          <div className="rounded-lg border border-[#e5e5e5] bg-white divide-y divide-[#f0f0f0]">
            {EXPECTATIONS.map((r) => (
              <div key={r.label} className="p-3">
                <p className="text-xs font-semibold text-[#111827]">
                  <span className="mr-1.5">{r.flag}</span>{r.label}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#374151]">{r.expected}</p>
                {r.watch && (
                  <p className="mt-1 text-[11px] leading-relaxed text-[#9C3B22]">
                    <strong>Watch for:</strong> {r.watch}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fallback for when a VPN exit is unavailable */}
        <div className="border-t border-[#e5e5e5] pt-4">
          <label className="cursor-default text-sm text-[#111827]">
            No VPN? Force a location
          </label>
          <p className="mt-1 mb-2 text-[11px] leading-relaxed text-[#6b7280]">
            Adds a geo override to the URL above. Test CDN only — the live CDN ignores
            these entirely.
          </p>
          <div className="relative">
            <select
              value={force}
              onChange={(e) => setForce(e.target.value)}
              className="w-full appearance-none bg-white border h-[44px] border-gray-300 rounded-lg px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer pr-8"
            >
              {FORCE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
