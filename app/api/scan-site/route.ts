export const runtime = 'edge';

import { proxyWorkerResponse } from '@/lib/server-api';



export async function POST(request: Request) {
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  // Consented scan: accepts the ConsentBit banner during the scan so consent-gated
  // tags fire and their post-consent cookies are captured (same response shape).
  return proxyWorkerResponse('/api/scan-site-consented', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookies: cookie,
    body: JSON.stringify(body),
  });
}
