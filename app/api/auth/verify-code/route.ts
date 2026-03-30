import { NextResponse } from 'next/server';
import { serverFetchJson } from '@/lib/server-api';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, status, headers: workerHeaders } = await serverFetchJson('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    console.log('[Next proxy][verify-code] worker response', { status, success: data?.success });

    const res = NextResponse.json(data, { status });

    // Forward set-cookie from Worker; strip Secure when on HTTP (dev)
    let setCookie = workerHeaders.get('set-cookie') ?? workerHeaders.get('Set-Cookie');
    if (setCookie) {
      try {
        const isHttp = new URL(request.url).protocol === 'http:';
        if (isHttp) setCookie = setCookie.replace(/\s*;\s*Secure/gi, '');
      } catch (_) {}
      res.headers.set('Set-Cookie', setCookie);
    }

    return res;
  } catch (error: any) {
    console.error('Verify-code API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to verify code' },
      { status: 500 }
    );
  }
}

