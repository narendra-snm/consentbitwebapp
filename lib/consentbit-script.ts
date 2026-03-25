/**
 * Embed script must be loaded from the ConsentBit Worker/CDN origin.
 * Relative paths like `/client_data/{id}/script.js` resolve on the *publisher's* domain and 404.
 *
 * **Always use `scriptUrl` from `/api/sites`** — it is backed by `Site.embedScriptUrl`, set once at
 * site creation and stored in D1. Do not invent a different path for the same site; verification
 * and publishers depend on a stable `src` string.
 *
 * This helper only: (1) makes relative API paths absolute using env, or (2) last-resort fallback
 * when `scriptUrl` is missing (prefer `cdnScriptId` so the path matches `buildEmbedScriptUrl` on the worker).
 *
 * Set `NEXT_PUBLIC_CONSENTBIT_CDN_ORIGIN` or `NEXT_PUBLIC_PRODUCTION_API_BASE` when falling back.
 */
const DEFAULT_CDN_ORIGIN = 'https://consent-webapp-manager.web-8fb.workers.dev';

export function getConsentbitCdnOrigin(): string {
  const fromEnv =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CONSENTBIT_CDN_ORIGIN) ||
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PRODUCTION_API_BASE) ||
    '';
  return (fromEnv || DEFAULT_CDN_ORIGIN).replace(/\/+$/, '');
}

/**
 * Returns a full `https://...` URL suitable for `<script src="...">` on third-party sites.
 * If `scriptUrl` from the API is already absolute, it is returned unchanged (stable per-site URL).
 */
export function resolveInstallScriptUrl(
  scriptUrl: string | undefined | null,
  siteId: string | undefined | null,
  cdnScriptId?: string | undefined | null,
): string {
  const rawTrim = scriptUrl != null ? String(scriptUrl).trim() : '';
  if (rawTrim && /^https?:\/\//i.test(rawTrim)) {
    return rawTrim;
  }
  if (rawTrim) {
    const path = rawTrim.startsWith('/') ? rawTrim : `/${rawTrim}`;
    return `${getConsentbitCdnOrigin()}${path}`;
  }
  const cdn = cdnScriptId != null ? String(cdnScriptId).trim() : '';
  const sid = siteId != null ? String(siteId).trim() : '';
  /** Match worker `buildEmbedScriptUrl`: `/consentbit/{cdnScriptId}/script.js` */
  const embedId = cdn || sid;
  if (!embedId) return '';
  const path = `/consentbit/${embedId}/script.js`;
  return `${getConsentbitCdnOrigin()}${path}`;
}
