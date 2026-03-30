import { NextResponse } from 'next/server';
import { serverFetchJson } from '@/lib/server-api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const { data, status } = await serverFetchJson('/api/auth/dashboard-init', {
      method: 'GET',
      cookies: cookie,
    });
    return NextResponse.json(data, { status });
  } catch (error: any) {
    return NextResponse.json(
      { authenticated: false, success: false, error: error.message },
      { status: 500 }
    );
  }
}
