"use client";

import { useEffect, useState } from "react";
import ToggleSwitch from "./ui/ToggleSwitch";
import { getLastGcmCheck, runGcmCheck, type GcmCheck } from "@/lib/client-api";

const DOCS = {
  gcm: "https://www.consentbit.com/articles/google-consent-mode-v2",
  debug: "https://www.consentbit.com/articles/debug-mode",
  fix: "https://www.consentbit.com/articles/debug-mode#late-tags:~:text=Fixing%20a%20Google%20tag%20that%20loads%20too%20early,-When%20debug%20mode%20flags",
  gtg: "https://www.consentbit.com/articles/using-consentbit-with-google-tag-gateway",
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
}: {
  siteId: string;
  debugEnabled: boolean;
  onToggleDebug: () => void;
}) {
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
