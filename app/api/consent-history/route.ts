import { NextRequest, NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const siteId = request.nextUrl.searchParams.get('siteId');
    const limit = request.nextUrl.searchParams.get('limit') || '100';
    const offset = request.nextUrl.searchParams.get('offset') || '0';

    if (!siteId) {
      return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
    }

    const cookie = request.headers.get('cookie') || '';
    const response = await serverFetch(
      `/api/consent-logs?siteId=${encodeURIComponent(siteId)}&limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`,
      { method: 'GET', cookies: cookie },
    );

    const data = await response.json().catch(async () => ({ success: false, error: await response.text() }));
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch consent logs';
    console.error('[consent-history]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
