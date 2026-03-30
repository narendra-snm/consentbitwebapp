import { NextResponse } from 'next/server';
import { serverFetchJson } from '@/lib/server-api';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, status } = await serverFetchJson('/api/auth/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    console.log('[Next proxy][request-code] worker response', { status, success: data?.success, hasRequestId: Boolean(data?.requestId) });
    return NextResponse.json(data, { status });
  } catch (error: any) {
    console.error('Request-code API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to request code' },
      { status: 500 }
    );
  }
}

