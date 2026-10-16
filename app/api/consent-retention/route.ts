export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

// Consent-record retention period for a site. Thin proxy to the worker, which owns
// the session + site-ownership check and the plan-range validation — nothing is
// enforced here.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteId = url.searchParams.get('siteId');
  if (!siteId) {
    return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
  }
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse(`/api/consent-retention?siteId=${encodeURIComponent(siteId)}`, {
    method: 'GET',
    cookies: cookie,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/consent-retention', {
    method: 'POST',
    // Not in the worker's PUBLIC_PATHS, so it goes through CSRF validation (an
    // X-Requested-With check). The browser's header doesn't survive this hop.
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    cookies: cookie,
    body: JSON.stringify(body),
  });
}
