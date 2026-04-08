import { NextRequest, NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const response = await serverFetch('/api/feedback', {
      method: 'GET',
      cookies: cookie,
    });
    const data = await response.json().catch(async () => ({ success: false, error: await response.text() }));
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch feedback';
    console.error('[feedback GET]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('cookie') || '';
    const response = await serverFetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cookies: cookie,
    });
    const data = await response.json().catch(async () => ({ success: false, error: await response.text() }));
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit feedback';
    console.error('[feedback POST]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
