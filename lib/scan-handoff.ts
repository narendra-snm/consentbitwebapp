// Cookie-scan handoff helpers.
//
// The cookie-scanner landing page (a *.consentbit.com subdomain) sets a
// `cb_scan_id` cookie scoped to `.consentbit.com` right before sending the
// visitor to accounts.consentbit.com/signup or /login. Cookies cross
// subdomains; sessionStorage does not — so on arrival we copy the id into
// sessionStorage (which survives the multi-step OTP flow and reloads) and
// clear the bridging cookie. After verify succeeds we clear sessionStorage.

const KEY = 'cb_scan_id';

/** Read a cookie value by name (browser only). */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Move the bridging `cb_scan_id` cookie into sessionStorage and delete it.
 * Safe to call on every mount — no-ops if neither source has a value.
 */
export function captureScanId(): void {
  if (typeof window === 'undefined') return;
  const fromCookie = readCookie(KEY);
  if (fromCookie) {
    try { sessionStorage.setItem(KEY, fromCookie); } catch {}
    // Expire the bridging cookie so a later signup/login can't reuse a stale id.
    document.cookie = `${KEY}=; domain=.consentbit.com; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${KEY}=; path=/; max-age=0; SameSite=Lax`;
  }
}

/** Current handed-off scan id, if any. */
export function getScanId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try { return sessionStorage.getItem(KEY) || undefined; } catch { return undefined; }
}

/** Clear the stored scan id once it has been used. */
export function clearScanId(): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem(KEY); } catch {}
}
