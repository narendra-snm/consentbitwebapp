import { NextRequest, NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const body = await request.json();
    const response = await serverFetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      cookies: cookie,
    });
    const data = await response.json().catch(async () => ({ success: false, error: await response.text() }));
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Create checkout failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

