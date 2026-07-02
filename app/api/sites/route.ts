export const runtime = 'edge';

import { proxyWorkerResponse } from '@/lib/server-api';



export async function GET(request: Request) {
  const url = new URL(request.url);
  const qs = url.search ?? '';
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse(`/api/sites${qs}`, { method: 'GET', cookies: cookie });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/sites', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body: JSON.stringify(body),
  });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const siteId = url.searchParams.get('siteId');
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/sites', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body: JSON.stringify({ siteId }),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/sites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body: JSON.stringify(body),
  });
}
