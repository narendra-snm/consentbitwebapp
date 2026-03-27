"use client";

import ComplianceAlert from "../components/ComplianceAlert";
import GettingStarted from "../components/GettingStarted";
import InstallConsentModal from "../components/InstallConsentModal";
import SiteSummaryCards from "../components/SiteSummaryCards";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useDashboardSession } from "../DashboardSessionProvider";

function DashboardSitePageInner() {
  const params = useParams<{ id: string }>();
  const siteId = params?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, authenticated, user, sites, setActiveSiteId, refresh } = useDashboardSession();
  const activeSite = sites.find((s: any) => String(s?.id) === String(siteId)) || null;
  const [showInstallModal, setShowInstallModal] = useState(false);
  const userName = useMemo(() => {
    const email = user?.email ?? "";
    return email ? email.split("@")[0] : undefined;
  }, [user?.email]);
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

  if (loading) return null;

  return (
    <div className="max-w-[1148px] mx-auto pb-4">
      <ComplianceAlert
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
