export const runtime = 'edge';





import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';



export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie') || '';
    // Pass the raw response through so the base64 envelope reaches the client intact
    const res = await serverFetch('/api/auth/dashboard-init', {
      method: 'GET',
      cookies: cookie,
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...(res.headers.get('X-Content-Encoded') ? { 'X-Content-Encoded': '1' } : {}),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { authenticated: false, success: false, error: error.message },
      { status: 500 }
    );
  }
}
