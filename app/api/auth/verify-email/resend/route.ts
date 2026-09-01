export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

/** Re-sends the confirmation link to the signed-in user. Needs the session cookie. */
export async function POST(request: NextRequest) {
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/auth/verify-email/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    cookies: cookie,
  });
}
