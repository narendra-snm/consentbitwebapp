export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';



export async function POST(request: NextRequest) {
  const cookie = request.headers.get('cookie') || '';
  const body = await request.json();
  const base = process.env.PRODUCTION_API_BASE || 'https://manager.consentbit.com (default)';
  console.error('[create-checkout-session] proxying to:', base);
  return proxyWorkerResponse('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cookies: cookie,
  });
}
