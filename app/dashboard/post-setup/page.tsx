"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function normalizeDomain(raw: string): string {
  const v = String(raw || "").trim();
  if (!v) return "";
  const noProto = v.replace(/^https?:\/\//i, "");
  const noWww = noProto.replace(/^www\./i, "");
  const hostOnly = noWww.split("/")[0].split("?")[0].split("#")[0];
  return hostOnly.replace(/\.+$/, "").toLowerCase();
}

export default function PostSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const domain = normalizeDomain(searchParams?.get("domain") || "");
    const siteId = String(searchParams?.get("siteId") || "").trim();
    if (!domain && !siteId) {
      router.replace("/dashboard");
      return;
    }

    // Prefer direct message to the already-open wizard/dashboard tab.
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: "CONSENTBIT_POST_SETUP", domain, siteId },
          window.location.origin,
        );
        window.close();
        return;
      }
    } catch {
      // ignore and fall back
    }

    // Fallback: storage event for existing tab, then close/redirect.
    try {
      localStorage.setItem(
        "cb_post_setup",
        JSON.stringify({ domain, siteId, ts: Date.now() }),
      );
    } catch {
      // ignore
    }

    if (domain) {
      router.replace(`/dashboard?postSetup=1&domain=${encodeURIComponent(domain)}`);
    } else {
      router.replace(`/dashboard?postSetup=1&siteId=${encodeURIComponent(siteId)}`);
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#E6F1FD] flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5 text-sm text-gray-700">
        Completing setup… you can close this tab.
      </div>
    </div>
  );
}

