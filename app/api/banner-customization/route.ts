import { NextResponse } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

export const runtime = 'edge';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteId = url.searchParams.get('siteId');
  if (!siteId) {
    return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
  }
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse(
    `/api/banner-customization?siteId=${encodeURIComponent(siteId)}`,
    { method: 'GET', cookies: cookie },
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/banner-customization', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body: JSON.stringify(body),
  });
}
