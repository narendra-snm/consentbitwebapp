"use client";


import GettingStarted from "../components/GettingStarted";
import InstallConsentModal from "../components/InstallConsentModal";
import SiteSummaryCards from "../components/SiteSummaryCards";
import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDashboardSession } from "../DashboardSessionProvider";
import ComplianceAlert from "../components/ComplianceAlert";
import FeedbackDesign from "../components/FeedbackDesign";

function DashboardSitePageInner() {
  const params = useParams<{ id: string }>();
  const siteId = params?.id;
  const router = useRouter();
  const { loading, authenticated, sites, user, setActiveSiteId, refresh } = useDashboardSession();
  const activeSite = sites.find((s: any) => String(s?.id) === String(siteId)) || null;
  const isLegacySite = !!(activeSite as any)?.isLegacy;
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useLayoutEffect(() => setHydrated(true), []);
  const rawInstallScriptUrl = activeSite?.scriptUrl ?? "";
  const userEmail = user?.email ?? "";
const userName = useMemo(() => {
   const name = user?.name?.trim();
   if (name) return name.charAt(0).toUpperCase() + name.slice(1);
   return userEmail || undefined;
 }, [user?.name, userEmail]);
  useEffect(() => {
    if (loading) return;
    if (!authenticated) {
      router.replace("/login");
      return;
    }
    if (siteId) setActiveSiteId(String(siteId));
  }, [authenticated, loading, router, setActiveSiteId, siteId]);

  // If we just created a site (free plan) or returned from Stripe, open the install modal
  // on the very first paint (avoid "dashboard flash" before the modal appears).
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    // If domain= is present, PostSetupOverlay is handling the install modal — don't double-open.
    const hasDomain = Boolean(p.get("domain"));
    const shouldOpen =
      (!hasDomain && p.get("postSetup") === "1" && (p.get("siteId") || "") === String(siteId || "")) ||
      (p.get("upgraded") === "1" && (p.get("siteId") || "") === String(siteId || ""));
    if (!shouldOpen) return;
    setShowInstallModal(true);
    try {
      // Clean the URL immediately so refresh doesn't re-trigger.
      router.replace(`/dashboard/${String(siteId || "")}`);
    } catch {
      // ignore
    }
  }, [router, siteId]);

  // After Stripe payment, poll until the plan changes from "free".
  // Uses a sessionStorage flag set by the upgrade page — avoids depending on ?success=1
  // which gets cleared by router.replace() and cancels the polling timer.
  useEffect(() => {
    const flagKey = `cb_post_payment_${siteId}`;
    const hasFlag = typeof sessionStorage !== "undefined" && sessionStorage.getItem(flagKey) === "1";
    // Also support legacy ?success=1 from the URL (strip it immediately).
    const hasSuccessParam =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("success") === "1";
    if (hasSuccessParam) router.replace(`/dashboard/${siteId}`);
    if (!hasFlag && !hasSuccessParam) return;
    if (hasFlag) sessionStorage.removeItem(flagKey);

    let attempts = 0;
    let t: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      const planNow = String(await refresh({ showLoading: false }) ?? "").toLowerCase();
      attempts += 1;
      // Stop once the plan is known and not free, or after 20 attempts (~40s).
      if ((!planNow || planNow === "free") && attempts < 20) {
        t = setTimeout(poll, 2000);
      }
    };
    void poll();
    return () => { if (t) clearTimeout(t); };
  }, [siteId, router, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // Avoid SSR/CSR mismatches in this client page (Suspense + session state).
  // if (!hydrated || loading){ return null};



  function LoadingUI(){
    return (
      <>
       
        <div className="max-w-[1148px] mx-auto pb-4">
          
          {/* Skeleton cards */}
          <div className="grid grid-cols-2 gap-6 mt-4 animate-pulse">
            <div className="bg-white border border-gray-200 rounded-xl p-5 h-[260px]">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-20 bg-gray-100 rounded-lg mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 h-[260px]">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-20 bg-gray-100 rounded-lg mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
          <div className="bg-gray-100 rounded-xl mt-5 h-[120px] animate-pulse" />
        </div>
      </>
    );
  }

  const showLoading = !hydrated || loading;

  return (
    <div className="px-4">
    <div className="max-w-[1148px] mx-auto pb-4 ">
      {showLoading?<LoadingUI/>:<><ComplianceAlert
        userName={userName}
        siteDomain={activeSite?.domain}
        bannerActive={Boolean(activeSite?.verified === 1 || activeSite?.verified === true)}
      />
      <SiteSummaryCards site={activeSite} onOpenInstall={isLegacySite ? undefined : () => setShowInstallModal(true)} isLegacy={isLegacySite} />
      <GettingStarted activeSiteId={siteId} isLegacy={isLegacySite} />
      <InstallConsentModal
        key={siteId ? String(siteId) : "install"}
        open={showInstallModal}
        scriptUrl={rawInstallScriptUrl}
        siteDomain={activeSite?.domain}
        siteId={siteId ? String(siteId) : undefined}
        cdnScriptId={activeSite?.cdnScriptId ? String(activeSite.cdnScriptId) : undefined}
        onClose={() => { document.body.style.overflow = ""; setShowInstallModal(false); }}
        onVerified={() => refresh({ showLoading: false })}
      />
      <FeedbackDesign />
      </>}
    </div>
    </div>
  );
}

export default function DashboardSitePage() {
  return (
    <Suspense>
      <DashboardSitePageInner />
    </Suspense>
  );
}
