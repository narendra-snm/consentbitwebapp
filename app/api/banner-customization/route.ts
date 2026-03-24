import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export const runtime = 'edge';

function jsonOrText(res: Response) {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('application/json')) {
    return res.json().catch(async () => ({ success: false, error: await res.text() }));
  }
  return res.text().then((t) => ({ success: false, error: t || 'Non-JSON response from upstream' }));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
    }
    const cookie = request.headers.get('cookie') || '';
    const workerRes = await serverFetch(`/api/banner-customization?siteId=${encodeURIComponent(siteId)}`, {
      method: 'GET',
      cookies: cookie,
    });
    const data = await jsonOrText(workerRes);
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load banner customization' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('cookie') || '';
    const workerRes = await serverFetch('/api/banner-customization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cookies: cookie,
      body: JSON.stringify(body),
    });
    const data = await jsonOrText(workerRes);
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save banner customization' },
      { status: 500 },
    );
  }
}

