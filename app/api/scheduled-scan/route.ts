import { NextRequest, NextResponse } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';



export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get('siteId');
  if (!siteId) {
    return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
  }
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse(
    `/api/scheduled-scan?siteId=${encodeURIComponent(siteId)}`,
    { method: 'GET', cookies: cookie },
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/scheduled-scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body: JSON.stringify(body),
  });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
  }
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse(
    `/api/scheduled-scan?id=${encodeURIComponent(id)}`,
    { method: 'DELETE', cookies: cookie },
  );
}
