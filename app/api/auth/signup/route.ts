// app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';
import { serverFetchJson } from '@/lib/server-api';

export const runtime = 'edge';

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

    const { data: payload, status, headers: workerHeaders } = await serverFetchJson('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedBody),
    });

    const res = NextResponse.json(payload, { status });

    let setCookie = workerHeaders.get('set-cookie') ?? workerHeaders.get('Set-Cookie');
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
