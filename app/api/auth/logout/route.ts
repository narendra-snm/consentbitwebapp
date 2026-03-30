import { NextResponse } from 'next/server';
import { serverFetchJson } from '@/lib/server-api';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const { data, status } = await serverFetchJson('/api/auth/logout', {
      method: 'POST',
      cookies: cookie,
    });

    const res = NextResponse.json(data, { status });

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

