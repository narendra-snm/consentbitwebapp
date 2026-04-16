import { proxyWorkerResponse } from '@/lib/server-api';

export const runtime = 'edge';

export async function GET(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/auth/me', { method: 'GET', cookies: cookie });
}
