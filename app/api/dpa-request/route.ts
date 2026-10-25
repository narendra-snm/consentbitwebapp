export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

// Profile → DPA Request. The sid cookie identifies the requester.
export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/dpa-request', { method: 'GET', cookies: cookie });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/dpa-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cookies: cookie,
  });
}
