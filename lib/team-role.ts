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
