export const runtime = 'edge';

import { proxyWorkerResponse } from '@/lib/server-api';

// Public (token-authed): the old owner clicks the emailed link. No session needed —
// the token in the body is the authorization.
export async function POST(request: Request) {
  const body = await request.json();
  return proxyWorkerResponse('/api/auth/transfer-ownership/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
