"use client";

import BlackFridayBar from "@/components/BlackFridayBar/BlackFridayBar";
import { useDashboardSession } from "../DashboardSessionProvider";

/**
 * Black Friday banner at the top of every dashboard page (any plan, including Growth —
 * user asked for it there too). "Claim Offer" goes to the active site's upgrade (pricing)
 * page, or the dashboard home before a site exists. Remove with the offer.
 */
export default function DashboardBlackFridayBar() {
  const { authenticated, activeSiteId, effectivePlanId } = useDashboardSession();
  if (!authenticated) return null;
  const href = activeSiteId ? `/dashboard/${activeSiteId}/upgrade` : "/dashboard";
  return (
    <BlackFridayBar
      claimHref={href}
      source="black_friday_dashboard_bar"
      siteId={activeSiteId || undefined}
      currentPlan={effectivePlanId || "free"}
    />
  );
}
