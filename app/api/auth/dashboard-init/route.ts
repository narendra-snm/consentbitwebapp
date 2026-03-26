import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const workerRes = await serverFetch('/api/auth/dashboard-init', {
      method: 'GET',
      cookies: cookie,
    });
    const data = await workerRes.json().catch(async () => ({
      authenticated: false,
      success: false,
      error: await workerRes.text(),
    }));
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: any) {
    return NextResponse.json(
      { authenticated: false, success: false, error: error.message },
      { status: 500 }
    );
  }
}
