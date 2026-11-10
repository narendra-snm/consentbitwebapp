export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

// Profile → MCP access. The sid cookie identifies the account owner.
export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/mcp-access', { method: 'GET', cookies: cookie });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/mcp-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cookies: cookie,
  });
}
