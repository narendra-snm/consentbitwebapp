export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

// Profile → MCP access → Disconnect one AI client.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/mcp-access/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cookies: cookie,
  });
}
