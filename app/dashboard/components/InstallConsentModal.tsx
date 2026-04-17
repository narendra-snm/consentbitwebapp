"use client";

import { useEffect, useRef, useState } from "react";

import { verifyScript } from "@/lib/client-api";
import { resolveInstallScriptUrl } from "@/lib/consentbit-script";
import ErrorPopup from "./ErrorPopup";

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function InstallConsentModal({
  open,
  scriptUrl,
  siteDomain,
  siteId,
  cdnScriptId,
  onClose,
}: {
  open: boolean;
  scriptUrl: string;
  siteDomain?: string;
  siteId?: string;
  /** Preferred embed id when rebuilding URL from env (matches Site.cdnScriptId). */
  cdnScriptId?: string;
  onClose?: () => void;
}) {
  const [copiedIcon, setCopiedIcon] = useState(false);
  const [copiedBtn, setCopiedBtn] = useState(false);
  const [publicUrl, setPublicUrl] = useState(siteDomain || "");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [scriptNotDetected, setScriptNotDetected] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const absoluteScriptUrl = resolveInstallScriptUrl(
    scriptUrl,
    siteId ?? null,
    cdnScriptId ?? null,
  );
  // No async/defer — the script must execute synchronously as the browser parses <head>
  // so the consent blocker is installed before any tracking scripts that follow it.
  const installCode = absoluteScriptUrl
    ? `<!-- Start ConsentBit banner -->\n<script id="consentbit" type="text/javascript" src="${absoluteScriptUrl}"></script>\n<!-- End ConsentBit banner -->`
    : "";

  // Reset verify UI whenever we show a different site — do not keep the previous site's domain in the input.
  useEffect(() => {
    if (!open) return;
    setPublicUrl(siteDomain || "");
    setVerifyError(null);
    setScriptNotDetected(false);
    setCopyError(null);
    setVerified(false);
  }, [open, siteId, siteDomain]);

  // Prevent background page scrolling while modal is open.
  useEffect(() => {
    if (!open) return;
    if (typeof document === "undefined") return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const normalizePublicUrl = (value: string) => {
    const v = value.trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    return `https://${v}`;
  };

  const handleCopy = async (which: "icon" | "btn") => {
    setCopyError(null);
    if (!installCode) {
      setCopyError("Missing script URL for this site.");
      return;
    }
    const ok = await copyToClipboard(installCode);
    if (ok) {
      if (which === "icon") {
        setCopiedIcon(true);
        window.setTimeout(() => setCopiedIcon(false), 2000);
      } else {
        setCopiedBtn(true);
        window.setTimeout(() => setCopiedBtn(false), 2000);
      }
    } else {
      setCopyError("Could not copy — select the code and copy manually (Ctrl/Cmd+C).");
    }
  };

  const handleVerify = async () => {
    setVerifyError(null);
    setScriptNotDetected(false);
    setVerified(false);
    const url = normalizePublicUrl(publicUrl);
    if (!url) {
      setVerifyError("Enter your website domain or URL.");
      return;
    }
    if (!absoluteScriptUrl) {
      setVerifyError("Missing script URL for this site.");
      return;
    }
    setVerifying(true);
    try {
      const res = await verifyScript({
        publicUrl: url,
        scriptUrl: absoluteScriptUrl,
        siteId,
      });
      if (res.found) {
        setVerified(true);
      } else {
        if (typeof window !== "undefined" && "debug" in res && res.debug) {
          console.warn("[ConsentBit] Verify script — not found. Debug from worker:", res.debug);
        }
        setScriptNotDetected(true);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("403")) {
        setVerifyError("The URL you entered was not found or is incorrect. Please check the domain and try again.");
      } else if (msg.includes("404")) {
        setVerifyError("Page not found. Check the domain is correct and the site is live.");
      } else if (msg.includes("fetch") || msg.includes("network") || msg.toLowerCase().includes("failed to fetch")) {
        setVerifyError("Could not reach that URL. Make sure the domain is correct and the site is publicly accessible.");
      } else {
        setVerifyError(msg || "Verification failed. Check the domain and try again.");
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {scriptNotDetected && (
        <ErrorPopup
          message="Script not detected on site"
          onClose={() => setScriptNotDetected(false)}
        />
      )}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative flex max-h-[95vh] w-full max-w-[1007px] flex-col rounded-[10px] bg-white shadow-xl">
        <div className="flex items-center justify-between bg-[#E6F1FD] rounded-t-[10px] px-7 py-6">
          <h2 className="text-base font-semibold text-[#111827]">Install ConsentBit on your website</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-black/5" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.9398 8L13.1398 3.80667C13.2653 3.68113 13.3359 3.51087 13.3359 3.33333C13.3359 3.1558 13.2653 2.98554 13.1398 2.86C13.0143 2.73447 12.844 2.66394 12.6665 2.66394C12.4889 2.66394 12.3187 2.73447 12.1931 2.86L7.9998 7.06L3.80646 2.86C3.68093 2.73447 3.51066 2.66394 3.33313 2.66394C3.1556 2.66394 2.98533 2.73447 2.8598 2.86C2.73426 2.98554 2.66374 3.1558 2.66374 3.33333C2.66374 3.51087 2.73426 3.68113 2.8598 3.80667L7.0598 8L2.8598 12.1933C2.79731 12.2553 2.74771 12.329 2.71387 12.4103C2.68002 12.4915 2.6626 12.5787 2.6626 12.6667C2.6626 12.7547 2.68002 12.8418 2.71387 12.9231C2.74771 13.0043 2.79731 13.078 2.8598 13.14C2.92177 13.2025 2.99551 13.2521 3.07675 13.2859C3.15798 13.3198 3.24512 13.3372 3.33313 13.3372C3.42114 13.3372 3.50827 13.3198 3.58951 13.2859C3.67075 13.2521 3.74449 13.2025 3.80646 13.14L7.9998 8.94L12.1931 13.14C12.2551 13.2025 12.3288 13.2521 12.4101 13.2859C12.4913 13.3198 12.5785 13.3372 12.6665 13.3372C12.7545 13.3372 12.8416 13.3198 12.9228 13.2859C13.0041 13.2521 13.0778 13.2025 13.1398 13.14C13.2023 13.078 13.2519 13.0043 13.2857 12.9231C13.3196 12.8418 13.337 12.7547 13.337 12.6667C13.337 12.5787 13.3196 12.4915 13.2857 12.4103C13.2519 12.329 13.2023 12.2553 13.1398 12.1933L8.9398 8Z" fill="#2B2B2B"/>
</svg>

          </button>
        </div>

        <div className="overflow-y-auto px-8 py-6">
          <h3 className="mb-5 mt-0.5 font-bold">Step 1: Copy this banner installation code</h3>

          <div className="relative mb-3.75 rounded-md border border-[#E5E5E5] bg-[#F9F9FA] p-5 pb-8.5 pr-14 text-[#161616]">
            <p className="whitespace-pre-wrap break-all pr-2 font-mono text-sm">{installCode}</p>
            <button
              type="button"
              onClick={() => void handleCopy("icon")}
              className="absolute bottom-4 right-4 rounded p-1 text-gray-500 hover:bg-black/5 hover:text-gray-800"
              aria-label={copiedIcon ? "Copied" : "Copy installation code"}
              title={copiedIcon ? "Copied" : "Copy"}
            >
              {copiedIcon ? <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check text-emerald-600" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg> :      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16 12.9V17.1C16 20.6 14.6 22 11.1 22H6.9C3.4 22 2 20.6 2 17.1V12.9C2 9.4 3.4 8 6.9 8H11.1C14.6 8 16 9.4 16 12.9Z" stroke="#4B5563" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M22 6.9V11.1C22 14.6 20.6 16 17.1 16H16V12.9C16 9.4 14.6 8 11.1 8H8V6.9C8 3.4 9.4 2 12.9 2H17.1C20.6 2 22 3.4 22 6.9Z" stroke="#4B5563" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>}
            </button>
          </div>

          <div className="mb-9.25 flex gap-3">
            <button
              type="button"
              onClick={() => void handleCopy("btn")}
              className="flex items-center gap-2 rounded-md bg-[#E6F1FD] px-2.75 py-3.5 text-xs hover:bg-gray-200"
            >
              {copiedBtn ? "Copied!" : "Copy code"}
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16 12.9V17.1C16 20.6 14.6 22 11.1 22H6.9C3.4 22 2 20.6 2 17.1V12.9C2 9.4 3.4 8 6.9 8H11.1C14.6 8 16 9.4 16 12.9Z" stroke="#4B5563" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M22 6.9V11.1C22 14.6 20.6 16 17.1 16H16V12.9C16 9.4 14.6 8 11.1 8H8V6.9C8 3.4 9.4 2 12.9 2H17.1C20.6 2 22 3.4 22 6.9Z" stroke="#4B5563" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

            </button>
          </div>

          <p className="mb-5 font-semibold">
            Paste the code as the <strong>first script</strong> inside the opening{" "}
            <span className="rounded bg-blue-100 px-1 text-blue-700">{"<head>"}</span> tag — before any other scripts — so tracking is blocked before consent.
          </p>

          <p className="mb-1 text-xs">Refer to our platform-wise guides for instructions.</p>
          <div className="mb-7.25 flex gap-2">
            <img src="/images/allplatform.png" alt="Supported platforms" />
          </div>

          <h3 className="mb-2.5 font-bold">Step 2: Verify your installation.</h3>
          <p className="mb-2 text-xs">Enter your website domain</p>

          <div className="mb-2.25 flex flex-wrap items-center gap-2 w-fit relative">
            <input
              type="text"
              value={publicUrl}
              onChange={(e) => { setPublicUrl(e.target.value); setVerifyError(null); setScriptNotDetected(false); }}
              placeholder={siteDomain || "yoursite.com"}
              disabled={verifying}
              className="h-12 w-full min-w-[319px] max-w-[319px] pr-[70px] rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div
              className={`flex h-9 w-12.5 items-center justify-center rounded-md absolute top-[50%] transform -translate-y-1/2 right-1.5 ${
                verified ? "bg-emerald-500 text-[#2EC04F]" : "bg-slate-300 text-slate-300"
              }`}
              title={verified ? "Verified" : "Not verified yet"}
            >
            <svg width="50" height="36" viewBox="0 0 50 36" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="50" height="36" rx="5" fill="currentColor"/>
<path d="M18.267 18.7468L22.6662 23.4874C22.866 23.7028 23.2074 23.7003 23.4041 23.4821L32.5738 13.3075" stroke="white" stroke-width="2" stroke-linecap="round"/>
</svg>

            </div>
          </div>

          {copyError ? (
            <p className="mb-2 text-sm text-amber-800" role="status">
              {copyError}
            </p>
          ) : null}
          {verifyError ? (
            <p className="mb-3 text-sm text-red-600" role="alert">
              {verifyError}
            </p>
          ) : null}
          {verified ? (
            <p className="mb-3 text-sm font-medium text-emerald-700">Verified — we found the ConsentBit script on your page.</p>
          ) : null}

          <p className="mb-5.5 text-xs text-[#4b5563]">
            Please enter your website domain and click “Verify” to confirm your installation and complete the setup
            {siteDomain ? (
              <>
                : <span className="font-medium">{siteDomain}</span>
              </>
            ) : (
              "."
            )}
          </p>

          <button
            type="button"
            disabled={verifying}
            onClick={() => void handleVerify()}
            className="rounded-lg bg-[#007AFF] px-10.5 py-3.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {verifying ? "Verifying…" : "Verify"}
          </button>
        </div>
      </div>
    </div>
  );
}
