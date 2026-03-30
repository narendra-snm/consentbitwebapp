// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { serverFetchJson } from '@/lib/server-api';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const normalizedBody =
      body && typeof body === 'object'
        ? { ...body, password_hash: body.password_hash ?? body.passwordHash }
        : body;

    const { data, status, headers: workerHeaders } = await serverFetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedBody),
    });

    const res = NextResponse.json(data, { status });

    let setCookie = workerHeaders.get('set-cookie');
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
