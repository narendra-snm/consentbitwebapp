// app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { serverFetchJson } from '@/lib/server-api';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie') || '';

    const { data, status } = await serverFetchJson('/api/auth/me', {
      method: 'GET',
      cookies: cookie,
    });

    return NextResponse.json(data, { status });
  } catch (error: any) {
    console.error('ME API error:', error);
    return NextResponse.json(
      { authenticated: false, user: null, organizations: [], error: error.message },
      { status: 500 }
    );
  }
}
