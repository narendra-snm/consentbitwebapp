export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';



export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get('siteId');
  const limit = request.nextUrl.searchParams.get('limit') || '100';
  const offset = request.nextUrl.searchParams.get('offset') || '0';
  const year = request.nextUrl.searchParams.get('year');
  const month = request.nextUrl.searchParams.get('month');

  if (!siteId) {
    return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
  }

  const params = new URLSearchParams({
    siteId,
    limit,
    offset,
    ...(year ? { year } : {}),
    ...(month ? { month } : {}),
  });

  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse(
    `/api/consent-logs?${params.toString()}`,
    { method: 'GET', cookies: cookie },
  );
}
