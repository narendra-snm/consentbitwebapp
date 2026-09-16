export const runtime = 'edge';

import { proxyWorkerResponse } from '@/lib/server-api';

// Team overview for Profile → Team. The sid cookie identifies the owner/admin.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookie = request.headers.get('cookie') || '';
  const qs = url.searchParams.toString();
  return proxyWorkerResponse(`/api/team${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    cookies: cookie,
  });
}
