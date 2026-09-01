export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

/**
 * Checks the signed-in user's current password without changing it, so the profile panel
 * can reveal the new-password fields only once it is confirmed. Needs the session cookie.
 */
export async function POST(request: NextRequest) {
  const cookie = request.headers.get('cookie') || '';
  const body = await request.text();
  return proxyWorkerResponse('/api/auth/verify-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cookies: cookie,
  });
}
