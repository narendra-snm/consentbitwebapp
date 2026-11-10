export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

// Dashboard bell: "your consent records are about to be hidden / removed".
export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get('siteId');
  if (!siteId) {
    return NextResponse.json({ success: false, error: 'siteId is required' }, { status: 400 });
  }
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse(
    `/api/consent-retention-notice?siteId=${encodeURIComponent(siteId)}`,
    { method: 'GET', cookies: cookie },
  );
}
