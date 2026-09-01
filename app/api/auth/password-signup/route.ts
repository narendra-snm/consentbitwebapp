export const runtime = 'edge';

import { proxyWorkerResponse } from '@/lib/server-api';

/**
 * Password signup — no verification code. The worker creates the account, hashes the
 * password with PBKDF2 and returns the session cookie, which is forwarded on so the
 * browser is signed in immediately.
 *
 * Body is passed through verbatim: the password must reach the worker as plaintext over
 * HTTPS so it can be hashed there. Hashing it in the browser would make that hash the
 * credential.
 */
export async function POST(request: Request) {
  const body = await request.text();
  return proxyWorkerResponse(
    '/api/auth/password-signup',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    },
    { forwardSetCookie: true, requestUrl: request.url },
  );
}
