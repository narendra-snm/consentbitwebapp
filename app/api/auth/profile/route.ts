import { NextResponse } from 'next/server';
import { serverFetchJson } from '@/lib/server-api';

export const runtime = 'edge';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('cookie') || '';

    const { data, status } = await serverFetchJson('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      cookies: cookie,
      body: JSON.stringify(body),
    });

    return NextResponse.json(data, { status });
  } catch (error: any) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}

