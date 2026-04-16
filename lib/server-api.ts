/**
 * Backend (Cloudflare Worker) origin for Next.js API routes.
 * Match the old dashboard: override via env so the same deploy can point at the Worker
 * that has your real DB + Stripe secrets (avoids "invalid API key" when a default Worker is stale).
 */
const PRODUCTION_API_BASE =
  process.env.PRODUCTION_API_BASE || "https://consent-webapp-manager.web-8fb.workers.dev";

export function getProductionApiBase() {
  return PRODUCTION_API_BASE.replace(/\/+$/, "");
}


export async function serverFetch(
  endpoint: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    cookies?: string;
  } = {}
): Promise<Response> {
  const { method = 'GET', headers = {}, body, cookies } = options;
  
  const url = `${getProductionApiBase()}${endpoint}`;
  
  const requestHeaders: Record<string, string> = {
    // Required by the worker's CSRF guard on all mutating requests
    'X-Requested-With': 'XMLHttpRequest',
    ...headers,
  };

  // Forward cookies if provided
  if (cookies) {
    requestHeaders['Cookie'] = cookies;
  }
  
  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };
  
  if (body) {
    if (typeof body === 'string') {
      fetchOptions.body = body;
    } else {
      fetchOptions.body = JSON.stringify(body);
      if (!requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
    }
  }
  
  return fetch(url, fetchOptions);
}

/**
 * Decode the base64 transport envelope produced by the worker's security middleware.
 * Shape: { d: "<base64 UTF-8 JSON>" }. Falls through for plain JSON responses.
 */
function decodeWorkerEnvelope(parsed: any): any {
  if (parsed && typeof parsed.d === 'string') {
    try {
      const binary = atob(parsed.d);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      try {
        // fallback: escape/decodeURIComponent approach
        return JSON.parse(decodeURIComponent(escape(atob(parsed.d))));
      } catch { /* fall through to raw */ }
    }
  }
  return parsed;
}

/**
 * Fetch from the worker, decode the base64 envelope server-side, and return
 * plain JSON data + status + original headers (for Set-Cookie forwarding).
 */
export async function serverFetchJson(
  endpoint: string,
  options: Parameters<typeof serverFetch>[1] = {},
): Promise<{ data: any; status: number; headers: Headers }> {
  const res = await serverFetch(endpoint, options);
  const text = await res.text().catch(() => '');
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { success: false, error: text.trim().startsWith('<') ? `Server error (${res.status})` : text || `Worker error: ${res.status}` };
  }
  const data = decodeWorkerEnvelope(parsed);
  return { data, status: res.status, headers: res.headers };
}

/**
 * Proxy a worker response to the browser with the base64 envelope intact.
 * Use this instead of NextResponse.json(data) so the client can decode it.
 * Pass requestUrl to strip the Secure flag from Set-Cookie on HTTP (dev).
 */
export async function proxyWorkerResponse(
  endpoint: string,
  options: Parameters<typeof serverFetch>[1] = {},
  { forwardSetCookie = false, requestUrl = '' }: { forwardSetCookie?: boolean; requestUrl?: string } = {},
): Promise<Response> {
  const res = await serverFetch(endpoint, options);
  const text = await res.text().catch(() => '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (res.headers.get('X-Content-Encoded')) headers['X-Content-Encoded'] = '1';
  if (forwardSetCookie) {
    let setCookie = res.headers.get('set-cookie') ?? res.headers.get('Set-Cookie');
    if (setCookie) {
      try {
        if (requestUrl && new URL(requestUrl).protocol === 'http:') {
          setCookie = setCookie.replace(/\s*;\s*Secure/gi, '');
        }
      } catch (_) {}
      headers['Set-Cookie'] = setCookie;
    }
  }
  return new Response(text, { status: res.status, headers });
}

