// app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Compatibility shim: backend/DB schema expects snake_case `password_hash`
    // while the webapp sends camelCase `passwordHash`.
    const normalizedBody =
      body && typeof body === 'object'
        ? {
            ...body,
            password_hash: body.password_hash ?? body.passwordHash,
            confirm_password_hash: body.confirm_password_hash ?? body.confirmPasswordHash,
          }
        : body;

    const workerRes = await serverFetch('/api/auth/signup', {
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
      // Avoid leaking full HTML pages; keep a short snippet for debugging.
      const snippet = payload.slice(0, 500);
      console.error('Signup Worker non-JSON response:', {
        status: workerRes.status,
        contentType,
        snippet,
      });
      const res = NextResponse.json(
        { success: false, error: snippet || 'Upstream returned non-JSON response' },
        { status: workerRes.status || 502 }
      );

      let setCookie = workerRes.headers.get('set-cookie') ?? workerRes.headers.get('Set-Cookie');
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

    let setCookie = workerRes.headers.get('set-cookie') ?? workerRes.headers.get('Set-Cookie');
    if (setCookie) {
      try {
        const isHttp = new URL(request.url).protocol === 'http:';
        if (isHttp) setCookie = setCookie.replace(/\s*;\s*Secure/gi, '');
      } catch (_) {}
      res.headers.set('Set-Cookie', setCookie);
    }

    return res;
  } catch (error: unknown) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Signup failed' },
      { status: 500 }
    );
  }
}
