import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Next proxy][verify-code] body received', {
      emailPresent: Boolean(body?.email),
      purpose: body?.purpose,
      codeLen: String(body?.code || '').length,
      origin: request.headers.get('origin') || null,
      referer: request.headers.get('referer') || null,
    });

    const workerRes = await serverFetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const contentType = workerRes.headers.get('content-type') ?? '';
    const payload = contentType.toLowerCase().includes('application/json')
      ? await workerRes.json().catch(async () => ({ success: false, error: await workerRes.text() }))
      : { success: false, error: await workerRes.text() };
    console.log('[Next proxy][verify-code] worker response', { status: workerRes.status, success: payload?.success });

    const res = NextResponse.json(payload, { status: workerRes.status });

    // Forward set-cookie from Worker; strip Secure when on HTTP (dev)
    let setCookie = workerRes.headers.get('set-cookie') ?? workerRes.headers.get('Set-Cookie');
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

