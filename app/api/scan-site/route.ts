import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('cookie') || '';
    const workerRes = await serverFetch('/api/scan-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cookies: cookie,
      body: JSON.stringify(body),
    });
    const contentType = workerRes.headers.get('content-type');
    let data: unknown;
    if (contentType?.includes('application/json')) {
      data = await workerRes.json().catch(async () => ({ success: false, error: await workerRes.text() }));
    } else {
      const text = await workerRes.text();
      data = { success: false, error: text || workerRes.statusText };
    }
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to scan site';
    console.error('[scan-site]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
