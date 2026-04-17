export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';



export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get('siteId');
  const limit = request.nextUrl.searchParams.get('limit') || '100';
  const offset = request.nextUrl.searchParams.get('offset') || '0';

  if (!siteId) {
    return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse(
    `/api/consent-logs?siteId=${encodeURIComponent(siteId)}&limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`,
    { method: 'GET', cookies: cookie },
  );
}
