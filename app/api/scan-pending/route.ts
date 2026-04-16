import { proxyWorkerResponse } from '@/lib/server-api';



export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId') || '';
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse(`/api/scan-pending?siteId=${encodeURIComponent(siteId)}`, {
    method: 'GET',
    cookies: cookie,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/scan-pending', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body: JSON.stringify(body),
  });
}
