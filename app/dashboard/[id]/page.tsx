"use client";

import ComplianceAlert from "../components/ComplianceAlert";
import GettingStarted from "../components/GettingStarted";
import SiteSummaryCards from "../components/SiteSummaryCards";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDashboardSession } from "../DashboardSessionProvider";

export default function DashboardSitePage() {
  const params = useParams<{ id: string }>();
  const siteId = params?.id;
  const router = useRouter();
  const { loading, authenticated, user, sites, setActiveSiteId } = useDashboardSession();
  const activeSite = sites.find((s: any) => String(s?.id) === String(siteId)) || null;
  const userName = useMemo(() => {
    const email = user?.email ?? "";
    return email ? email.split("@")[0] : undefined;
  }, [user?.email]);

  useEffect(() => {
    if (loading) return;
    if (!authenticated) {
      router.replace("/login");
      return;
    }
    if (siteId) setActiveSiteId(String(siteId));
  }, [authenticated, loading, router, setActiveSiteId, siteId]);

  if (loading) return null;

  return (
    <div className="max-w-[1148px] mx-auto pb-4">
      <ComplianceAlert
        userName={userName}
        siteDomain={activeSite?.domain}
        bannerActive={Boolean(activeSite?.verified === 1 || activeSite?.verified === true)}
      />
      <SiteSummaryCards site={activeSite} />
      <GettingStarted activeSiteId={siteId} />
    </div>
  );
}
