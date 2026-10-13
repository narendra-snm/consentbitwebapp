export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

// One visitor's consent records: export (GET) or delete (POST), to answer that visitor's
// access or erasure request. Thin proxy to the worker, which owns the session, site-access
// and owner/Admin checks — nothing is enforced here. Worker answers 404 unless LAW_FIXES is on.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteId = url.searchParams.get('siteId');
  const deviceId = url.searchParams.get('deviceId');
  if (!siteId || !deviceId) {
    return NextResponse.json({ success: false, error: 'siteId and deviceId are required' }, { status: 400 });
  }
  const params = new URLSearchParams({ siteId, deviceId });
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse(`/api/consent-visitor?${params.toString()}`, {
    method: 'GET',
    cookies: cookie,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/consent-visitor', {
    method: 'POST',
    // Not in the worker's PUBLIC_PATHS, so it goes through CSRF validation (an
    // X-Requested-With check). The browser's header doesn't survive this hop.
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    cookies: cookie,
    body: JSON.stringify(body),
  });
}
