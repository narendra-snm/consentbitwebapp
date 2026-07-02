export const runtime = 'edge';

import { proxyWorkerResponse } from '@/lib/server-api';



export async function POST(request: Request) {
  const body = await request.json();
  return proxyWorkerResponse(
    '/api/auth/verify-code',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    { forwardSetCookie: true, requestUrl: request.url },
  );
}
