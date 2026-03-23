import { NextRequest, NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export async function GET(request: NextRequest) {
  try {
    const siteId = request.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
    }
    const cookie = request.headers.get('cookie') || '';
    const response = await serverFetch(`/api/cookies?siteId=${encodeURIComponent(siteId)}`, {
      method: 'GET',
      cookies: cookie,
    });
    const data = await response.json().catch(async () => ({ success: false, error: await response.text() }));
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch cookies';
    console.error('[cookies]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const body = await request.json();
    const response = await serverFetch('/api/cookies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cookies: cookie,
      body,
    });
    const data = await response.json().catch(async () => ({ success: false, error: await response.text() }));
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save cookie';
    console.error('[cookies:post]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
