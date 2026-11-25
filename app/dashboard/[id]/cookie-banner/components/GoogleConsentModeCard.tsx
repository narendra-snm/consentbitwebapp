"use client";

import { useEffect, useState } from "react";
import ToggleSwitch from "./ui/ToggleSwitch";
import { getLastGcmCheck, runGcmCheck, type GcmCheck } from "@/lib/client-api";

const DOCS = {
  gcm: "https://www.consentbit.com/articles/google-consent-mode-v2",
  debug: "https://www.consentbit.com/articles/debug-mode",
  fix: "https://www.consentbit.com/articles/debug-mode#late-tags:~:text=Fixing%20a%20Google%20tag%20that%20loads%20too%20early,-When%20debug%20mode%20flags",
  gtg: "https://www.consentbit.com/articles/using-consentbit-with-google-tag-gateway",
  // Help article for the Advanced / Basic / Off settings (Google CMP audit iii.5). Publish it at this URL.
  modes: "https://www.consentbit.com/articles/google-consent-mode-advanced-basic-off",
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const STATUS_STYLE: Record<GcmCheck["status"], { label: string; color: string }> = {
  ok: { label: "Google Consent Mode is set up correctly", color: "#1a7f37" },
  issues: { label: "Issues found", color: "#9a6700" },
  not_found: { label: "ConsentBit script not found", color: "#9a6700" },
  failed: { label: "Scan failed", color: "#9a6700" },
};

const ROW_COLOR = { pass: "#1a7f37", warn: "#9a6700", info: "#818b98" } as const;
const ROW_LABEL = { pass: "PASS", warn: "WARN", info: "INFO" } as const;

/**
 * Google Consent Mode card — banner editor, General tab.
 *
 * "Support Google Consent Mode" + "Allow Google tags to fire before consent" (all plans, saved
 * with the banner as translations.config.gcmSupport / gcmTagsBeforeConsent, both on by default):
 *   both on            Advanced (unchanged): tags load at once, consent default denied.
 *   support on, other off  Basic: Google tags blocked and nothing sent to Google until the
 *                      visitor accepts Analytics or Marketing; then Consent Mode starts.
 *   support off        Off: no Consent Mode commands; Google tags blocked by category.
 * Applied by the worker (cdnM.js gcmMode). Not for IAB/TCF sites (Google reads the TC string).
 *
 * "Check now" asks the worker to load the live site and run the same checks as Debug
 * Mode (consent default present and set before Google tags, all four v2 signals, no
 * Google requests before the default). The debug toggle is saved with the banner
 * (translations.config.gcmDebug) and is OFF by default; when on, every visitor's
 * browser console shows the report — no on-page panel.
 */
export default function GoogleConsentModeCard({
  siteId,
  debugEnabled,
  onToggleDebug,
  gcmSupport,
  onToggleGcmSupport,
  tagsBeforeConsent,
  onToggleTagsBeforeConsent,
  iabEnabled,
}: {
  siteId: string;
  debugEnabled: boolean;
  onToggleDebug: () => void;
  gcmSupport: boolean;
  onToggleGcmSupport: () => void;
  tagsBeforeConsent: boolean;
  onToggleTagsBeforeConsent: () => void;
  iabEnabled: boolean;
}) {
  const mode: "advanced" | "basic" | "off" = !gcmSupport ? "off" : tagsBeforeConsent ? "advanced" : "basic";
  const [check, setCheck] = useState<GcmCheck | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId) return;
    let alive = true;
    getLastGcmCheck(siteId)
      .then((c) => { if (alive) setCheck(c); })
      .catch(() => {});
    return () => { alive = false; };
  }, [siteId]);

  const onCheck = async () => {
    setRunning(true);
    setError(null);
    try {
      setCheck(await runGcmCheck(siteId));
    } catch (e: any) {
      setError(e?.message || "The check could not be completed. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  const status = check ? STATUS_STYLE[check.status] : null;
  const hasLateIssue = !!check?.results?.some((r) => r.s === "warn" && r.fix);

  return (
    <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg p-4 mt-4">
      <p className="font-semibold text-base text-black mb-1">Google Consent Mode (GCM)</p>
      <p className="text-xs text-[#6B7280] mb-4">
        ConsentBit sets Google Consent Mode v2 automatically (ad_storage, analytics_storage,
        ad_user_data, ad_personalization).{" "}
        <a href={DOCS.gcm} target="_blank" rel="noopener noreferrer" className="text-[#007aff] underline">
          Learn more
        </a>
      </p>

      {/* Advanced / Basic / Off — saved with the banner; both on (Advanced) by default */}
      {iabEnabled ? (
        <p className="text-xs text-[#6B7280] mb-5">
          With IAB TCF, Google reads consent from the TCF string, so the Consent Mode settings below don&apos;t
          apply.
        </p>
      ) : (
        <div className="mb-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-black tracking-tight font-medium">Support Google Consent Mode</p>
              <p className="text-xs text-[#6B7280] mt-1">
                Send Google the visitor&apos;s consent choices (Consent Mode default and update commands).
              </p>
            </div>
            <ToggleSwitch checked={gcmSupport} onChange={onToggleGcmSupport} />
          </div>

          {gcmSupport && (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-black tracking-tight font-medium">Allow Google tags to fire before consent</p>
                <p className="text-xs text-[#6B7280] mt-1">
                  On (Advanced, recommended): Google tags load right away with consent denied and send cookieless
                  pings until the visitor chooses. Off (Basic): Google tags are blocked, and nothing is sent to Google,
                  until the visitor accepts Analytics or Marketing.
                </p>
              </div>
              <ToggleSwitch checked={tagsBeforeConsent} onChange={onToggleTagsBeforeConsent} />
            </div>
          )}

          <div className="rounded-md border border-[#e5e5e5] bg-white px-3 py-2 text-xs text-[#374151] space-y-1">
            <p>
              <span className="font-semibold">
                Current mode: {mode === "advanced" ? "Advanced" : mode === "basic" ? "Basic" : "Off"}.
              </span>{" "}
              {mode === "advanced" &&
                "Google tags load immediately and adjust to the visitor's choice."}
              {mode === "basic" &&
                "When the visitor accepts Analytics or Marketing, Consent Mode starts with their choices and your Google tags load. Visitors who get the opt-out (CCPA) banner have nothing to accept first, so their Google tags load as in Advanced mode."}
              {mode === "off" &&
                "ConsentBit sends no consent signals to Google. Google tags are blocked like other trackers until the visitor accepts: Google Analytics needs Analytics, Google Ads needs Marketing, and Google Tag Manager needs both."}
            </p>
            {mode !== "advanced" && (
              <p className="text-[#6B7280]">
                Place your Google tag below the ConsentBit script: a tag above it runs before ConsentBit can block it.
                &quot;Check now&quot; and debug mode look for a consent default before your Google tags, so they report
                it as missing in this mode; that is expected. Our Google Tag Manager template always sets Consent Mode
                defaults inside GTM, so these settings don&apos;t apply to a template install: to use Basic or Off, add
                the ConsentBit script to your site directly.
              </p>
            )}
            <p>
              <a href={DOCS.modes} target="_blank" rel="noopener noreferrer" className="text-[#007aff] underline">
                Advanced, Basic and Off explained
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Check GCM status */}
      <div className="space-y-2">
        <p className="text-xs text-black tracking-tight font-medium">Check GCM status</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onCheck}
            disabled={running || !siteId}
            className="h-8 rounded-md border border-[#007aff] bg-white px-3 text-xs font-medium text-[#007aff] hover:bg-[#eff6ff] disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {running ? "Checking…" : "Check now"}
          </button>
          {check?.checkedAt && !running && (
            <span className="text-xs italic text-[#6B7280]">
              Last checked: <span className="font-semibold">{formatWhen(check.checkedAt)}</span>
            </span>
          )}
          {running && (
            <span className="text-xs text-[#6B7280]">Loading your live site — this takes up to 30 seconds.</span>
          )}
        </div>

        {error && !running && (
          <p className="text-xs text-[#b91c1c]">{error}</p>
        )}

        {check && status && !running && (
          <div className="mt-2 rounded-md border border-[#e5e5e5] bg-white">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#eaeef2]">
              <span className="h-2 w-2 rounded-full" style={{ background: status.color }} />
              <span className="text-xs font-semibold" style={{ color: status.color }}>{status.label}</span>
              {check.url && <span className="ml-auto truncate text-[11px] text-[#818b98]">{check.url}</span>}
            </div>

            {check.status === "failed" && (
              <p className="px-3 py-2 text-xs text-[#374151]">
                {check.error || "The scan couldn't be completed due to an unexpected error."} Please try again or
                check the{" "}
                <a href={DOCS.debug} target="_blank" rel="noopener noreferrer" className="text-[#007aff] underline">
                  troubleshooting guide
                </a>
                .
              </p>
            )}

            {check.results?.length > 0 && (
              <ul>
                {check.results.map((r, i) => (
                  <li
                    key={i}
                    className={`grid grid-cols-[40px_1fr] gap-2 px-3 py-2 ${i ? "border-t border-[#eaeef2]" : ""}`}
                  >
                    <span
                      className="font-mono text-[10px] font-semibold leading-5"
                      style={{ color: ROW_COLOR[r.s] }}
                    >
                      {ROW_LABEL[r.s]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-black">{r.title}</p>
                      <p className="text-xs text-[#59636e]">{r.detail}</p>
                      {r.code && (
                        <p className="mt-1 break-words font-mono text-[11px] text-[#1f2328]">{r.code}</p>
                      )}
                      {r.fix && (
                        <p className="mt-1 text-xs">
                          <a href={DOCS.fix} target="_blank" rel="noopener noreferrer" className="text-[#007aff] underline">
                            How to fix
                          </a>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {hasLateIssue && (
              <p className="px-3 py-2 border-t border-[#eaeef2] text-xs text-[#374151]">
                Consent arriving late? If you use Google tag gateway, check its setup first:{" "}
                <a href={DOCS.gtg} target="_blank" rel="noopener noreferrer" className="text-[#007aff] underline">
                  Using ConsentBit with Google tag gateway
                </a>
                .
              </p>
            )}
          </div>
        )}
      </div>

      {/* Enable debug mode — saved with the banner, off by default */}
      <div className="flex items-start justify-between gap-4 mt-5">
        <div>
          <p className="text-xs text-black tracking-tight font-medium">Enable debug mode</p>
          <p className="text-xs text-[#6B7280] mt-1">
            When enabled, your site&apos;s browser console shows the Consent Mode default, updates, and whether the
            default was set before your Google tags. To open the console, right-click any page and choose{" "}
            <em>Inspect &gt; Console</em>. Turn it off when you&apos;re done. Saved when you publish.
          </p>
        </div>
        <ToggleSwitch checked={debugEnabled} onChange={onToggleDebug} />
      </div>
    </div>
  );
}
