import { proxyWorkerResponse } from '@/lib/server-api';

export const runtime = 'edge';

export async function POST(request: Request) {
  const body = await request.json();
  return proxyWorkerResponse('/api/auth/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
