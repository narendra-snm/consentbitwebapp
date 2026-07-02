export const runtime = 'edge';

import { proxyWorkerResponse } from '@/lib/server-api';



export async function POST(request: Request) {
  const body = await request.json();
  const cookie = request.headers.get('Cookie') || '';
  return proxyWorkerResponse('/api/onboarding/first-setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body: JSON.stringify(body),
  });
}
