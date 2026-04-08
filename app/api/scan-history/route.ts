import { NextRequest, NextResponse } from 'next/server';
import { serverFetchJson } from '@/lib/server-api';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const siteId = request.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
    }
    const cookie = request.headers.get('cookie') || '';
    const { data, status } = await serverFetchJson(`/api/scan-history?siteId=${encodeURIComponent(siteId)}`, {
      method: 'GET',
      cookies: cookie,
    });

    // Debug: log decoded scan history payload (worker envelope already decoded).
    // Safe-ish: do not log request cookies or headers.
    console.log('[scan-history] decoded response', JSON.stringify({ siteId, data }, null, 2));

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch scan history';
    console.error('[scan-history]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
