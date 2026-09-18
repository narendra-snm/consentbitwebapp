// A site's teamRole comes from dashboard-init: 'owner' for the user's own sites,
// 'admin' / 'member' for sites another account shared with them. 'editor' is the
// old name for 'member' and can still sit in a cached session.

export type SiteTeamRole = "owner" | "admin" | "member";

export function siteTeamRole(site: unknown): SiteTeamRole {
  const raw = String((site as { teamRole?: unknown } | null)?.teamRole ?? "").toLowerCase();
  if (raw === "admin") return "admin";
  if (raw === "member" || raw === "editor") return "member";
  return "owner";
}

/** Shared with this user by another account (Admin or Member) — no plans or billing. */
export function isTeamSite(site: unknown): boolean {
  return siteTeamRole(site) !== "owner";
}

/** Member on this site — additionally no new sites and no notifications. */
export function isMemberSite(site: unknown): boolean {
  return siteTeamRole(site) === "member";
}

/**
 * The account (organization) billing and site actions should target. On a site the
 * user is Admin of, that's the owner's account (the site's org); everywhere else it's
 * the session's own `fallback`, unchanged.
 */
export function accountOrgIdFor(site: unknown, fallback: string | null): string | null {
  if (siteTeamRole(site) !== "admin") return fallback;
  const s = site as { organizationId?: unknown; organizationid?: unknown } | null;
  const org = s?.organizationId ?? s?.organizationid;
  return org ? String(org) : fallback;
}
