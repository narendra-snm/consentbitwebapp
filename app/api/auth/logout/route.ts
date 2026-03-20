import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export async function POST(request: Request) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const workerRes = await serverFetch('/api/auth/logout', {
      method: 'POST',
      cookies: cookie,
    });

    const data = await workerRes.json().catch(async () => ({ success: false }));
    const res = NextResponse.json(data, { status: workerRes.status });

    // Clear cookie in browser as well (backend already sends Set-Cookie, but keep safe)
    res.headers.set('Set-Cookie', 'sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax');
    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Logout failed' },
      { status: 500 }
    );
  }
}

