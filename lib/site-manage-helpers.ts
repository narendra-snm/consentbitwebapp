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


// Calls POST /api/sites/rename-domain — returns a normalized result.
// Goes through the Next.js proxy route so the sid cookie is forwarded server-side
// (same pattern as /api/sites/check-domain).
export async function renameSiteDomain({
  websiteUrl,
  excludeSiteId,
}: {
  websiteUrl: string;
  excludeSiteId?: string;
}) {
  const res = await fetch(`/api/sites/rename-domain`, {
    method: 'POST',
    credentials: 'include',                   // send the sid cookie to our own origin
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',   // ← CSRF guard requires this
    },
    body: JSON.stringify({ websiteUrl, excludeSiteId }),
  });

  console.log('[renameSiteDomain] request', { websiteUrl, excludeSiteId });

  const rawText = await res.text();
  let parsed: any = null;
  try { parsed = rawText ? JSON.parse(rawText) : null; } catch { /* non-JSON */ }

  // Worker wraps payloads in { d: "<base64 UTF-8 JSON>" } — decode like lib/client-api.ts does.
  let data: any = parsed;
  if (parsed && typeof parsed.d === 'string') {
    try {
      const binary = atob(parsed.d);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      data = JSON.parse(new TextDecoder().decode(bytes));
    } catch { /* fall through to raw parsed value */ }
  }

  console.log('[renameSiteDomain] response', {
    status: res.status,
    ok: res.ok,
    rawText,
    envelope: parsed,
    data,
  });

  if (!res.ok) {
    const err: any = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data?.code || null;
    console.log('[renameSiteDomain] error', { status: err.status, code: err.code, message: err.message });
    throw err;
  }

  if (!data?.success) {
    const conflict = {
      ok: false as const,
      conflict: true as const,
      code: data?.code || 'UNKNOWN_CONFLICT',
      message: data?.message || 'This domain cannot be used.',
      domain: data?.domain || null,
    };
    console.log('[renameSiteDomain] conflict', conflict);
    return conflict;
  }

  const success = {
    ok: true as const,
    conflict: false as const,
    domain: data.domain,
    platform: data.platform || '',
    platformSiteId: data.platformSiteId || '',
    detected: !!data.detected,
    code: data.code,
    isOldScript: data.isOldScript || false,
  };
  console.log('[renameSiteDomain] success', success);
  return success;
}
