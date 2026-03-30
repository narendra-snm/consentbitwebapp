"use client";

import { useEffect, useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { verifyScript } from "@/lib/client-api";
import { resolveInstallScriptUrl } from "@/lib/consentbit-script";

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
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState(siteDomain || "");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const absoluteScriptUrl = resolveInstallScriptUrl(
    scriptUrl,
    siteId ?? null,
    cdnScriptId ?? null,
  );
  const installCode = absoluteScriptUrl
    ? `<!-- Start ConsentBit banner -->\n<script id="consentbit" type="text/javascript" src="${absoluteScriptUrl}" async></script>\n<!-- End ConsentBit banner -->`
    : "";

  useEffect(() => {
    if (!open) return;
    setPublicUrl((prev) => (prev.trim() ? prev : siteDomain || ""));
    setVerifyError(null);
    setCopyError(null);
    setVerified(false);
  }, [open, siteDomain]);

  if (!open) return null;

  const normalizePublicUrl = (value: string) => {
    const v = value.trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    return `https://${v}`;
  };

  const handleCopy = async () => {
    setCopyError(null);
    if (!installCode) {
      setCopyError("Missing script URL for this site.");
      return;
    }
    const ok = await copyToClipboard(installCode);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyError("Could not copy — select the code and copy manually (Ctrl/Cmd+C).");
    }
  };

  const handleVerify = async () => {
    setVerifyError(null);
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
        setVerifyError(
          "Script not found on that page yet. Install the snippet in <head>, publish your site, then try again.",
        );
      }
    } catch (e: unknown) {
      setVerifyError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative flex max-h-[95vh] w-full max-w-[1007px] flex-col rounded-[10px] bg-white shadow-xl">
        <div className="flex items-center justify-between bg-[#E6F1FD] px-7 py-6">
          <h2 className="text-base font-semibold text-[#111827]">Install ConsentBit on your website</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-black/5" aria-label="Close">
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <div className="overflow-y-auto px-8 py-6">
          <h3 className="mb-5 mt-0.5 font-bold">Step 1: Copy this banner installation code</h3>

          <div className="relative mb-3.75 rounded-md border border-[#E5E5E5] bg-[#F9F9FA] p-5 pb-8.5 pr-14 text-[#161616]">
            <p className="whitespace-pre-wrap break-all pr-2 font-mono text-sm">{installCode}</p>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="absolute bottom-4 right-4 rounded p-1 text-gray-500 hover:bg-black/5 hover:text-gray-800"
              aria-label={copied ? "Copied" : "Copy installation code"}
              title={copied ? "Copied" : "Copy"}
            >
              {copied ? <Check size={22} className="text-emerald-600" /> : <Copy size={22} />}
            </button>
          </div>

          <div className="mb-9.25 flex gap-3">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="flex items-center gap-2 rounded-md bg-[#E6F1FD] px-2.75 py-3.5 text-xs hover:bg-gray-200"
            >
              {copied ? "Copied!" : "Copy code"}
              <Copy size={14} className="ml-2" />
            </button>
          </div>

          <p className="mb-5 font-semibold">
            Paste the code right after the opening{" "}
            <span className="rounded bg-blue-100 px-1 text-blue-700">{"<head>"}</span> tag in your site&apos;s source
            code.
          </p>

          <p className="mb-1 text-xs">Refer to our platform-wise guides for instructions.</p>
          <div className="mb-7.25 flex gap-2">
            <img src="/images/allplatform.svg" alt="Supported platforms" />
          </div>

          <h3 className="mb-2.5 font-bold">Step 2: Verify your installation.</h3>
          <p className="mb-2 text-xs">Enter your website domain</p>

          <div className="mb-2.25 flex flex-wrap items-center gap-2 w-fit relative">
            <input
              type="text"
              value={publicUrl}
              onChange={(e) => setPublicUrl(e.target.value)}
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
            Use the same domain you added for this site
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
