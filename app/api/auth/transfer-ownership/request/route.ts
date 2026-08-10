export const runtime = 'edge';

import { proxyWorkerResponse } from '@/lib/server-api';

// Authenticated: the signed-in owner requests a transfer. The sid cookie must be
// forwarded so the worker can identify the current owner.
export async function POST(request: Request) {
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/auth/transfer-ownership/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body: JSON.stringify(body),
  });
}
