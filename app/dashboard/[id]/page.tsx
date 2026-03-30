"use client";

import GettingStarted from "../components/GettingStarted";
import InstallConsentModal from "../components/InstallConsentModal";
import SiteSummaryCards from "../components/SiteSummaryCards";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useDashboardSession } from "../DashboardSessionProvider";

function DashboardSitePageInner() {
  const params = useParams<{ id: string }>();
  const siteId = params?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, authenticated, sites, setActiveSiteId, refresh } = useDashboardSession();
  const activeSite = sites.find((s: any) => String(s?.id) === String(siteId)) || null;
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const rawInstallScriptUrl = activeSite?.scriptUrl ?? "";

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
  if (!hydrated || loading) return null;

  return (
    <div className="max-w-[1148px] mx-auto pb-4">
      <SiteSummaryCards site={activeSite} onOpenInstall={() => setShowInstallModal(true)} />
      <GettingStarted activeSiteId={siteId} />
      <InstallConsentModal
        open={showInstallModal}
        scriptUrl={rawInstallScriptUrl}
        siteDomain={activeSite?.domain}
        siteId={siteId ? String(siteId) : undefined}
        cdnScriptId={activeSite?.cdnScriptId ? String(activeSite.cdnScriptId) : undefined}
        onClose={() => setShowInstallModal(false)}
      />
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
