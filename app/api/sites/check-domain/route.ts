// app/api/sites/check-domain/route.ts
import { NextResponse } from 'next/server';
import { serverFetchJson } from '@/lib/server-api';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('cookie') || '';

    const { data, status } = await serverFetchJson('/api/sites/check-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cookies: cookie,
      body: JSON.stringify(body),
    });

    return NextResponse.json(data, { status });
  } catch (error: any) {
    console.error('Check-domain proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check domain availability' },
      { status: 500 },
    );
  }
}

