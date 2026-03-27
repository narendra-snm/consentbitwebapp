import { NextRequest, NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const siteId = request.nextUrl.searchParams.get('siteId') || '';
    if (!siteId) {
      return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
    }
    const response = await serverFetch(
      `/api/custom-cookie-rules?siteId=${encodeURIComponent(siteId)}`,
      { method: 'GET', cookies: cookie },
    );
    const data = await response.json().catch(async () => ({ success: false, error: await response.text() }));
    return NextResponse.json(data, { status: response.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch cookie rules';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const body = await request.json();
    const response = await serverFetch('/api/custom-cookie-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cookies: cookie,
      body,
    });
    const data = await response.json().catch(async () => ({ success: false, error: await response.text() }));
    return NextResponse.json(data, { status: response.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save cookie rule';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const id = request.nextUrl.searchParams.get('id') || '';
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    const response = await serverFetch(
      `/api/custom-cookie-rules?id=${encodeURIComponent(id)}`,
      { method: 'DELETE', cookies: cookie },
    );
    const data = await response.json().catch(async () => ({ success: false, error: await response.text() }));
    return NextResponse.json(data, { status: response.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete cookie rule';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
