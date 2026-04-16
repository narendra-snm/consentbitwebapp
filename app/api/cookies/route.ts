import { NextRequest, NextResponse } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get('siteId');
  if (!siteId) {
    return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
  }
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse(`/api/cookies?siteId=${encodeURIComponent(siteId)}`, {
    method: 'GET',
    cookies: cookie,
  });
}

export async function POST(request: NextRequest) {
  const cookie = request.headers.get('cookie') || '';
  const body = await request.json();
  return proxyWorkerResponse('/api/cookies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body,
  });
}
