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

export function PostSetupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const domain = normalizeDomain(searchParams?.get("domain") || "");
    const siteId = String(searchParams?.get("siteId") || "").trim();
    const returnToRaw = String(searchParams?.get("returnTo") || "").trim();
    const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/dashboard";
    if (!domain && !siteId) {
      router.replace("/dashboard");
      return;
    }

    // Clear stale session cache so the dashboard fetches fresh plan/site data after payment.
    try { sessionStorage.removeItem("cbSessionCache"); } catch { /* ignore */ }

    // Redirect to returnTo page with postSetup params so PostSetupOverlay shows InstallConsentModal there.
    // Build URL properly so existing query params in returnTo are preserved.
    const base = returnTo.startsWith("/dashboard") ? returnTo : "/dashboard";
    const url = new URL(base, window.location.origin);
    url.searchParams.set("postSetup", "1");
    if (domain) url.searchParams.set("domain", domain);
    else url.searchParams.set("siteId", siteId);
    const dashUrl = url.pathname + url.search + (url.hash || "");

    // Prefer navigating the opener (works even if opener isn't listening for postMessage).
    try {
      if (window.opener && !window.opener.closed) {
        // same-origin navigation
        window.opener.location.replace(dashUrl);
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
        JSON.stringify({ domain, siteId, returnTo, ts: Date.now() }),
      );
    } catch {
      // ignore
    }

    router.replace(dashUrl);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#E6F1FD] flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5 text-sm text-gray-700">
        Completing setup… you can close this tab.
      </div>
    </div>
  );
}

