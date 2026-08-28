export const runtime = 'edge';

import { proxyWorkerResponse } from '@/lib/server-api';

/**
 * Password login proxy.
 *
 * The body is forwarded verbatim: the worker expects { email, password } and hashes the
 * password itself with PBKDF2. The previous `password_hash` normalization belonged to the
 * retired client-side SHA-256 scheme and is gone along with it.
 */
export async function POST(request: Request) {
  const body = await request.text();
  return proxyWorkerResponse(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    },
    { forwardSetCookie: true, requestUrl: request.url },
  );
}
