/**
 * Resolves which plan tier to show for the **selected site** (header, upgrade page, etc.).
 * Aligns with dashboard-init per-site `planId` + org `effectivePlanId` (see authDashboardInit.js).
 */

const PAID = new Set(["basic", "essential", "growth"]);

export function readPlanTierFromSite(site: unknown): string {
  if (!site || typeof site !== "object") return "";
  const s = site as Record<string, unknown>;
  const raw =
    s.planId ??
    s.plan_id ??
    s.planID ??
    s.PlanId ??
    s.subscription_plan ??
    s.subscriptionPlanId ??
    s.plan;
  return raw != null ? String(raw).trim().toLowerCase() : "";
}

const KNOWN_PLAN_TIERS = new Set(["free", "basic", "essential", "growth"]);

export function planTierFromSiteRow(site: unknown): string {
  if (!site || typeof site !== "object") return "free";
  const raw = readPlanTierFromSite(site);
  if (!raw) return "free";
  if (KNOWN_PLAN_TIERS.has(raw)) return raw;
  return "free";
}

/**
 * When the selected site row is paid → use it.
 * When it is still free: if no site in the org shows paid yet but org `effectivePlanId` is paid
 * (post-checkout lag), use org tier; if another site is already paid, keep this site as free.
 */
export function resolvePlanTierForSiteContext(options: {
  activeSite: unknown | null;
  sites: unknown[];
  effectivePlanId: string | null | undefined;
}): string {
  const fromSession = String(options.effectivePlanId ?? "")
    .trim()
    .toLowerCase();
  const sites = options.sites ?? [];
  const anySiteHasPaidPlan = sites.some((s) => PAID.has(planTierFromSiteRow(s)));

  if (options.activeSite) {
    const siteTier = planTierFromSiteRow(options.activeSite);
    if (PAID.has(siteTier)) return siteTier;
    if (!anySiteHasPaidPlan && PAID.has(fromSession)) return fromSession;
    return "free";
  }
  return PAID.has(fromSession) ? fromSession : fromSession || "";
}
