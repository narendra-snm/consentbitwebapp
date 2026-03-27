import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId') || '';
    const cookie = request.headers.get('cookie') || '';
    const workerRes = await serverFetch(`/api/scan-pending?siteId=${encodeURIComponent(siteId)}`, {
      method: 'GET',
      cookies: cookie,
    });
    const data = await workerRes.json().catch(async () => ({ success: false, error: await workerRes.text() }));
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check scan pending';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('cookie') || '';
    const workerRes = await serverFetch('/api/scan-pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cookies: cookie,
      body: JSON.stringify(body),
    });
    const data = await workerRes.json().catch(async () => ({ success: false, error: await workerRes.text() }));
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to request scan';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
