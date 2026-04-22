export const runtime = 'edge';




import { proxyWorkerResponse } from '@/lib/server-api';



export async function GET(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/auth/me', { method: 'GET', cookies: cookie });
}
