"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDashboardSession } from "../DashboardSessionProvider";
import { firstSetup } from "@/lib/client-api";
import InstallConsentModal from "./InstallConsentModal";

function normalizeDomain(raw: string) {
  return String(raw || "").trim()
    .replace(/^https?:\/\//i, "").replace(/^www\./i, "")
    .split("/")[0].split("?")[0].split("#")[0]
    .replace(/\.+$/, "").toLowerCase();
}

function getPostSetupParams(): { postSetup: string; domain: string; siteId: string; upgraded: string } {
  if (typeof window === "undefined") return { postSetup: "", domain: "", siteId: "", upgraded: "" };
  const p = new URLSearchParams(window.location.search);
  return {
    postSetup: p.get("postSetup") ?? "",
    domain: p.get("domain") ?? "",
    siteId: p.get("siteId") ?? "",
    upgraded: p.get("upgraded") ?? "",
  };
}

export default function PostSetupOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { loading, authenticated, sites, refresh } = useDashboardSession();

  const [pendingSiteId, setPendingSiteId] = useState<string | null>(null);
  const [pendingDomain, setPendingDomain] = useState<string | null>(null);
  const [postSetupInstall, setPostSetupInstall] = useState<{
    scriptUrl: string;
    siteId: string;
    siteDomain: string;
    cdnScriptId?: string;
  } | null>(null);
  const lastSig = useRef("");

  // Read params from window.location synchronously before paint to avoid flash
  useLayoutEffect(() => {
    function check() {
      const { postSetup, domain, siteId, upgraded } = getPostSetupParams();
      console.log("[PostSetupOverlay] URL check:", { postSetup, domain, siteId, upgraded });

      if (postSetup === "1" && domain) {
        const sig = `domain:${domain}`;
        if (lastSig.current === sig) return;
        lastSig.current = sig;
        console.log("[PostSetupOverlay] Setting pendingDomain:", domain);
        setPendingDomain(normalizeDomain(domain));
      } else if (postSetup === "1" && siteId) {
        const sig = `siteId:${siteId}`;
        if (lastSig.current === sig) return;
        lastSig.current = sig;
        console.log("[PostSetupOverlay] Setting pendingSiteId:", siteId);
        setPendingSiteId(siteId);
      } else if (upgraded === "1" && siteId) {
        const sig = `upgraded:${siteId}`;
        if (lastSig.current === sig) return;
        lastSig.current = sig;
        console.log("[PostSetupOverlay] Setting pendingSiteId (upgraded):", siteId);
        setPendingSiteId(siteId);
      }
    }

    check();
    window.addEventListener("popstate", check);
    return () => window.removeEventListener("popstate", check);
  }, [pathname, searchParams]); // re-run whenever path OR search params change

  // Handle storage event (opener tab redirect via PostSetupClient)
  useEffect(() => {
    function onStorage(ev: StorageEvent) {
      if (ev.key !== "cb_post_setup" || !ev.newValue) return;
      try {
        const parsed = JSON.parse(ev.newValue) as { domain?: string; siteId?: string };
        console.log("[PostSetupOverlay] Storage event:", parsed);
        const domain = parsed.domain ?? "";
        const siteId = parsed.siteId ?? "";
        if (domain) {
          const sig = `domain:${domain}`;
          if (lastSig.current === sig) return;
          lastSig.current = sig;
          setPendingDomain(normalizeDomain(domain));
        } else if (siteId) {
          const sig = `siteId:${siteId}`;
          if (lastSig.current === sig) return;
          lastSig.current = sig;
          setPendingSiteId(siteId);
        }
      } catch {}
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // New site: call firstSetup(domain) then resolve
  useEffect(() => {
    if (!pendingDomain || loading || !authenticated) return;
    const domain = pendingDomain;
    setPendingDomain(null);
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;

    console.log("[PostSetupOverlay] Calling firstSetup for domain:", domain);
    firstSetup({ websiteUrl: domain })
      .then((result) => {
        console.log("[PostSetupOverlay] firstSetup result:", result);
        // Do NOT check cancelled here — firstSetup is one-shot and must complete.
        const siteId = result?.siteId ?? result?.site?.id;
        const scriptUrl = result?.site?.embedScriptUrl ?? result?.scriptUrl ?? result?.site?.scriptUrl;
        const cdnScriptId = result?.site?.cdnScriptId;
        if (siteId && scriptUrl) {
          console.log("[PostSetupOverlay] Setting postSetupInstall with scriptUrl:", scriptUrl);
          setPostSetupInstall({ scriptUrl, siteId: String(siteId), siteDomain: domain, cdnScriptId });
        } else if (siteId) {
          console.log("[PostSetupOverlay] No scriptUrl yet, polling for siteId:", siteId);
          setPendingSiteId(String(siteId));
        } else {
          console.warn("[PostSetupOverlay] firstSetup returned no siteId or scriptUrl");
        }
        void refresh({ showLoading: false });
        let ticks = 0;
        poll = setInterval(() => {
          if (cancelled) { if (poll) clearInterval(poll); return; }
          ticks += 1;
          void refresh({ showLoading: false });
          if (ticks >= 16) { if (poll) clearInterval(poll); poll = null; }
        }, 1500);
      })
      .catch((err) => {
        console.error("[PostSetupOverlay] firstSetup error:", err);
      });

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
    };
  }, [pendingDomain, loading, authenticated, refresh]);

  // Existing site: resolve from sites list
  useEffect(() => {
    if (!pendingSiteId || loading || !authenticated) return;
    const id = pendingSiteId;
    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    setPostSetupInstall((prev) =>
      prev?.siteId === id ? prev : { scriptUrl: "", siteId: id, siteDomain: "" }
    );

    const tryResolve = async () => {
      if (cancelled) return;
      const match = (Array.isArray(sites) ? sites : []).find(
        (s: any) => String(s?.id) === id
      );
      const scriptUrl =
        match?.embedScriptUrl ?? match?.embed_script_url ??
        match?.scriptUrl ?? match?.script_url ?? null;
      console.log("[PostSetupOverlay] tryResolve - match:", match, "scriptUrl:", scriptUrl);
      if (match && scriptUrl) {
        setPostSetupInstall({
          scriptUrl: String(scriptUrl),
          siteId: String(match.id),
          siteDomain: String(match.domain || ""),
          cdnScriptId: match?.cdnScriptId ? String(match.cdnScriptId) : undefined,
        });
        setPendingSiteId(null);
        return;
      }
      attempts += 1;
      if (attempts <= 20) {
        try { await refresh({ showLoading: false }); } catch {}
        t = setTimeout(tryResolve, 1500);
      } else {
        console.warn("[PostSetupOverlay] Gave up resolving siteId:", id);
        setPendingSiteId(null);
      }
    };

    void tryResolve();
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, [pendingSiteId, loading, authenticated, sites, refresh]);

  function handleClose() {
    const newSiteId = postSetupInstall?.siteId;
    setPostSetupInstall(null);
    lastSig.current = "";
    // Refresh session so dashboard header + site list reflect the new site/plan immediately.
    void refresh({ showLoading: false });
    if (newSiteId) {
      router.replace(`/dashboard/${newSiteId}`);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("postSetup");
      url.searchParams.delete("upgraded");
      url.searchParams.delete("siteId");
      url.searchParams.delete("domain");
      router.replace(url.pathname + (url.search || "") + (url.hash || ""));
    }
  }

  const isPending = (pendingDomain || pendingSiteId) && !postSetupInstall;

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#E6F1FD] flex flex-col fixed inset-0 z-50">
        <div className="flex justify-between items-center px-8 pt-7.5 pb-5.25 border-b border-[#000000]/10 rounded-t-xl">
          <img src="/images/ConsentBit-logo-Dark.png" alt="logo" className="h-6" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <svg className="animate-spin h-8 w-8 text-[#007AFF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-[#374151] text-sm font-medium">
            {pendingDomain ? "Setting up your site…" : "Payment succeeded — updating your plan…"}
          </p>
        </div>
      </div>
    );
  }

  if (!postSetupInstall) return null;

  return (
    <InstallConsentModal
      open
      scriptUrl={postSetupInstall.scriptUrl}
      siteDomain={postSetupInstall.siteDomain}
      siteId={postSetupInstall.siteId}
      cdnScriptId={postSetupInstall.cdnScriptId}
      onClose={handleClose}
    />
  );
}
