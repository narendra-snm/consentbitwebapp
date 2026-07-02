export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const siteId = searchParams.get('siteId');
  const year = searchParams.get('year') || String(new Date().getFullYear());
  const month = (searchParams.get('month') || String(new Date().getMonth() + 1)).padStart(2, '0');
  const limit = searchParams.get('limit') || '500';
  const offset = searchParams.get('offset') || '0';

  if (!siteId) {
    return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
  }

  const params = new URLSearchParams({ siteId, year, month, limit, offset });
  const cookie = request.headers.get('cookie') || '';

  return proxyWorkerResponse(
    `/api/legacy-consent-logs-framer?${params.toString()}`,
    { method: 'GET', cookies: cookie },
  );
}
