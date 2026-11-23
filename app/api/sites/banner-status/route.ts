export const runtime = 'edge';

import { proxyWorkerResponse } from '@/lib/server-api';

// Banner display status — switch a site's ConsentBit script off/on (see consent-manager handlers/bannerStatus.js).

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse(`/api/sites/banner-status${url.search ?? ''}`, { method: 'GET', cookies: cookie });
}

export async function POST(request: Request) {
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/sites/banner-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body: JSON.stringify(body),
  });
}
