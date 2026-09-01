export const runtime = 'edge';

import { proxyWorkerResponse } from '@/lib/server-api';

/**
 * Password login. Body forwarded verbatim — the worker verifies against the stored
 * PBKDF2 hash and returns the session cookie, which is forwarded on to the browser.
 */
export async function POST(request: Request) {
  const body = await request.text();
  return proxyWorkerResponse(
    '/api/auth/password-login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    },
    { forwardSetCookie: true, requestUrl: request.url },
  );
}
