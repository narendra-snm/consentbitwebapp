export const runtime = 'edge';

import { proxyWorkerResponse } from '@/lib/server-api';

// Cross-domain consent group for a site (see consent-manager handlers/consentFamily.js).

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse(`/api/sites/consent-family${url.search ?? ''}`, { method: 'GET', cookies: cookie });
}

export async function POST(request: Request) {
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/sites/consent-family', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body: JSON.stringify(body),
  });
}
