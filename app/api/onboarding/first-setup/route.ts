// app/api/onboarding/first-setup/route.ts
import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('Cookie') || '';

    const workerRes = await serverFetch('/api/onboarding/first-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cookies: cookie,
      body: JSON.stringify(body),
    });

    const data = await workerRes.json();
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: any) {
    console.error('Onboarding API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Onboarding setup failed' },
      { status: 500 }
    );
  }
}
