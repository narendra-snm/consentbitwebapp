import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';



export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('cookie') || '';

    const workerRes = await serverFetch('/api/verify-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cookies: cookie,
      body: JSON.stringify(body),
    });

    const data = await workerRes.json().catch(async () => ({ success: false, error: await workerRes.text() }));
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify script';
    return NextResponse.json({ success: false, found: false, error: message }, { status: 500 });
  }
}

