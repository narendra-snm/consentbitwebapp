export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

// /mcp/authorize page → the pending AI-client connection request (GET) and the
// owner's Allow / Deny answer (POST).
export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') || '';
  const nonce = request.nextUrl.searchParams.get('nonce') || '';
  return proxyWorkerResponse(`/api/mcp-access/authorize?nonce=${encodeURIComponent(nonce)}`, {
    method: 'GET',
    cookies: cookie,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/mcp-access/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cookies: cookie,
  });
}
