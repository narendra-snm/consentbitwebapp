export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';



export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/feedback', { method: 'GET', cookies: cookie });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cookies: cookie,
  });
}
