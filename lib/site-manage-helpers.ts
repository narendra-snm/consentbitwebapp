/** Shared helpers for Manage Site / billing site details (website URL). */

export function normalizeSiteLabel(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split("?")[0]
    .split("#")[0]
    .replace(/\.+$/, "")
    .toLowerCase();
}

export function isDuplicateDomainForOthers(
  sites: unknown,
  excludeSiteId: string,
  candidate: string,
): boolean {
  const cand = normalizeSiteLabel(candidate);
  if (!cand) return false;
  const rows = Array.isArray(sites) ? sites : [];
  return rows.some((s: { id?: string; domain?: string }) => {
    if (String(s?.id) === String(excludeSiteId)) return false;
    const domain = normalizeSiteLabel(String(s?.domain ?? ""));
    return Boolean(domain && domain === cand);
  });
}

export function validateManageDomain(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Enter your website URL.";
  const host = normalizeSiteLabel(trimmed);
  if (!host.includes(".")) return "Enter a valid domain like example.com.";
  if (/\s/.test(trimmed)) return "Domain cannot contain spaces.";
  return null;
}

/** Stored site `name` is kept in sync with the registered host (no separate display label). */
export function deriveSiteNameFromDomain(raw: string): string {
  const host = normalizeSiteLabel(raw);
  return host || String(raw || "").trim();
}
