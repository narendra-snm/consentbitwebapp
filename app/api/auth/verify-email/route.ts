export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

/** Confirms an emailed verification token. No session needed — the token is the proof. */
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyWorkerResponse('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
