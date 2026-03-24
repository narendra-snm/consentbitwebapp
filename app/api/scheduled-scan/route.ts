import { NextRequest, NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const siteId = request.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
    }
    const cookie = request.headers.get('cookie') || '';
    const workerRes = await serverFetch(
      `/api/scheduled-scan?siteId=${encodeURIComponent(siteId)}`,
      { method: 'GET', cookies: cookie },
    );
    const data = await workerRes.json().catch(async () => ({ success: false, error: await workerRes.text() }));
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch scheduled scans';
    console.error('[scheduled-scan GET]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('cookie') || '';
    const workerRes = await serverFetch('/api/scheduled-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cookies: cookie,
      body: JSON.stringify(body),
    });
    const data = await workerRes.json().catch(async () => ({ success: false, error: await workerRes.text() }));
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create scheduled scan';
    console.error('[scheduled-scan POST]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    const cookie = request.headers.get('cookie') || '';
    const workerRes = await serverFetch(`/api/scheduled-scan?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      cookies: cookie,
    });
    const data = await workerRes.json().catch(async () => ({ success: false, error: await workerRes.text() }));
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete scheduled scan';
    console.error('[scheduled-scan DELETE]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
