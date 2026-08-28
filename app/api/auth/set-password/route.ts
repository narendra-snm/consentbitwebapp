export const runtime = 'edge';

import { proxyWorkerResponse } from '@/lib/server-api';

/**
 * Set or change the signed-in user's password.
 *
 * The session cookie must be forwarded — the worker identifies the user from it and
 * requires the current password before replacing an existing one.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/auth/set-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body,
  });
}
