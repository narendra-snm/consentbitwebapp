import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Next proxy][request-code] body received', {
      emailPresent: Boolean(body?.email),
      purpose: body?.purpose,
      namePresent: Boolean(body?.name),
    });

    const workerRes = await serverFetch('/api/auth/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await workerRes.text().catch(() => '');
    const data = (() => {
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, error: text || 'Non-JSON response from worker' };
      }
    })();

    console.log('[Next proxy][request-code] worker response', { status: workerRes.status, success: data?.success });
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: any) {
    console.error('Request-code API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to request code' },
      { status: 500 }
    );
  }
}

