"use client";
export const runtime = 'edge';

import GettingStarted from "../components/GettingStarted";
import InstallConsentModal from "../components/InstallConsentModal";
import SiteSummaryCards from "../components/SiteSummaryCards";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useDashboardSession } from "../DashboardSessionProvider";
import ComplianceAlert from "../components/ComplianceAlert";

function DashboardSitePageInner() {
  const params = useParams<{ id: string }>();
  const siteId = params?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, authenticated, sites,user, setActiveSiteId, refresh } = useDashboardSession();
  const activeSite = sites.find((s: any) => String(s?.id) === String(siteId)) || null;
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
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

  // After Stripe success redirect, refresh session twice (webhook updates can lag).
  useEffect(() => {
    const success = searchParams?.get("success");
    if (success !== "1") return;
    if (siteId) setActiveSiteId(String(siteId));
    void refresh({ showLoading: false });
    const t = window.setTimeout(() => {
      void refresh({ showLoading: false });
    }, 2500);
    const stripQ = window.setTimeout(() => {
      if (siteId) router.replace(`/dashboard/${siteId}`);
    }, 300);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(stripQ);
    };
  }, [refresh, router, searchParams, setActiveSiteId, siteId]);

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

  return (
    <div className="max-w-[1148px] mx-auto pb-4">
      {loading?<LoadingUI/>:<><ComplianceAlert
        userName={userName}
        siteDomain={activeSite?.domain}
        bannerActive={Boolean(activeSite?.verified === 1 || activeSite?.verified === true)}
      />
      <SiteSummaryCards site={activeSite} onOpenInstall={() => setShowInstallModal(true)} />
      <GettingStarted activeSiteId={siteId} />
      <InstallConsentModal
        open={showInstallModal}
        scriptUrl={rawInstallScriptUrl}
        siteDomain={activeSite?.domain}
        siteId={siteId ? String(siteId) : undefined}
        cdnScriptId={activeSite?.cdnScriptId ? String(activeSite.cdnScriptId) : undefined}
        onClose={() => setShowInstallModal(false)}
      /></>}
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
