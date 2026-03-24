// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received login request for email:', body.email);

    const normalizedBody =
      body && typeof body === 'object'
        ? {
            ...body,
            password_hash: body.password_hash ?? body.passwordHash,
          }
        : body;

    // Call production API
    const workerRes = await serverFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedBody),
    });

    const contentType = workerRes.headers.get('content-type') ?? '';
    let payload: any = null;
    if (contentType.toLowerCase().includes('application/json')) {
      try {
        payload = await workerRes.json();
      } catch {
        payload = await workerRes.text();
      }
    } else {
      payload = await workerRes.text();
    }

    if (typeof payload === 'string') {
      const snippet = payload.slice(0, 500);
      console.error('Login Worker non-JSON response:', {
        status: workerRes.status,
        contentType,
        snippet,
      });
      const res = NextResponse.json(
        { success: false, error: snippet || 'Upstream returned non-JSON response' },
        { status: workerRes.status || 502 }
      );

      // Forward set-cookie from Worker; strip Secure when we're on HTTP so the browser stores the cookie (e.g. dev at 192.168.x.x)
      let setCookie = workerRes.headers.get('set-cookie');
      if (setCookie) {
        try {
          const isHttp = new URL(request.url).protocol === 'http:';
          if (isHttp) setCookie = setCookie.replace(/\s*;\s*Secure/gi, '');
        } catch (_) {}
        res.headers.set('Set-Cookie', setCookie);
      }

      return res;
    }

    const res = NextResponse.json(payload, { status: workerRes.status });

    // Forward set-cookie from Worker; strip Secure when we're on HTTP so the browser stores the cookie (e.g. dev at 192.168.x.x)
    let setCookie = workerRes.headers.get('set-cookie');
    if (setCookie) {
      try {
        const isHttp = new URL(request.url).protocol === 'http:';
        if (isHttp) setCookie = setCookie.replace(/\s*;\s*Secure/gi, '');
      } catch (_) {}
      res.headers.set('Set-Cookie', setCookie);
    }

    return res;
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
