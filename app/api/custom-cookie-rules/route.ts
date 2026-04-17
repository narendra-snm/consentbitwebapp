export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';



export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') || '';
  const siteId = request.nextUrl.searchParams.get('siteId') || '';
  if (!siteId) {
    return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
  }
  return proxyWorkerResponse(
    `/api/custom-cookie-rules?siteId=${encodeURIComponent(siteId)}`,
    { method: 'GET', cookies: cookie },
  );
}

export async function POST(request: NextRequest) {
  const cookie = request.headers.get('cookie') || '';
  const body = await request.json();
  return proxyWorkerResponse('/api/custom-cookie-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body,
  });
}

export async function DELETE(request: NextRequest) {
  const cookie = request.headers.get('cookie') || '';
  const id = request.nextUrl.searchParams.get('id') || '';
  if (!id) {
    return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
  }
  return proxyWorkerResponse(
    `/api/custom-cookie-rules?id=${encodeURIComponent(id)}`,
    { method: 'DELETE', cookies: cookie },
  );
}
