import { proxyWorkerResponse } from '@/lib/server-api';



export async function PATCH(request: Request) {
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/auth/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body: JSON.stringify(body),
  });
}
