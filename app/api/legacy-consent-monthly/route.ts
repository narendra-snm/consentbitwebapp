export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const siteId = searchParams.get('siteId');
  const year = searchParams.get('year') || String(new Date().getFullYear());
  const month = (searchParams.get('month') || String(new Date().getMonth() + 1)).padStart(2, '0');
  const domain = searchParams.get('domain') || '';

  if (!siteId) {
    return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
  }

  const params = new URLSearchParams({ siteId, year, month, ...(domain ? { domain } : {}) });
  const cookie = request.headers.get('cookie') || '';

  // Proxy to consent-manager's legacy-consent-logs endpoint with year/month params
  // The consent-manager will call cb-server's monthly endpoint for the filtered data
  return proxyWorkerResponse(
    `/api/legacy-consent-logs?${params.toString()}`,
    { method: 'GET', cookies: cookie },
  );
}
