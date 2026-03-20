import { NextResponse } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('cookie') || '';

    const workerRes = await serverFetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      cookies: cookie,
      body: JSON.stringify(body),
    });

    const text = await workerRes.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, error: text || 'Invalid JSON from upstream' };
    }

    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: any) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}

