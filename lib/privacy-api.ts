/**
 * Privacy requests live in their own worker (consentbit-privacy-requests), separate from
 * consent-manager. These helpers forward the dashboard's session cookie to it; the worker
 * does every session, site-access and plan check.
 * Local dev: PRIVACY_API_BASE=http://localhost:8790 in .env.local.
 */
// Live script's custom domain. Its workers.dev address is switched off since the domain was
// attached (Cloudflare error 1042), so don't fall back to it.
const PRIVACY_API_BASE =
  process.env.PRIVACY_API_BASE || 'https://privacy.consentbit.com';

export async function proxyPrivacyApi(
  request: Request,
  endpoint: string,
  init: { method?: 'GET' | 'POST'; body?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    // The worker's CSRF check for POST; the browser's own header doesn't survive this hop.
    'X-Requested-With': 'XMLHttpRequest',
  };
  const cookie = request.headers.get('cookie');
  if (cookie) headers.Cookie = cookie;
  if (init.body) headers['Content-Type'] = 'application/json';
  try {
    const res = await fetch(`${PRIVACY_API_BASE.replace(/\/+$/, '')}${endpoint}`, {
      method: init.method || 'GET',
      headers,
      body: init.body,
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ success: false, error: 'Could not reach the privacy request service.' }, { status: 502 });
  }
}
