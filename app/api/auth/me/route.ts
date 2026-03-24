// app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie') || '';
    console.log('ME route: incoming cookie header:', cookie);

    const workerRes = await serverFetch('/api/auth/me', {
      method: 'GET',
      cookies: cookie,
    });

    const text = await workerRes.text();
    console.log('Production API /api/auth/me status:', workerRes.status);
    console.log('Production API /api/auth/me body:', text);

    // Try to parse JSON if possible, otherwise wrap text.
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, error: 'Invalid JSON from production API', raw: text };
    }

    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: any) {
    console.error('ME API error:', error);
    return NextResponse.json(
      { authenticated: false, user: null, organizations: [], error: error.message },
      { status: 500 }
    );
  }
}
