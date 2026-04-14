import { NextRequest } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') || '';
  const { search } = new URL(request.url);
  return proxyWorkerResponse(`/api/checkout-session${search}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
  });
}
