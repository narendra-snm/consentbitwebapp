export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const siteId = searchParams.get('siteId');
  const visitorId = searchParams.get('visitorId');

  if (!siteId || !visitorId) {
    return new Response('siteId and visitorId required', { status: 400 });
  }

  const params = new URLSearchParams({ siteId, visitorId });
  const token = searchParams.get('token');
  if (token) params.set('token', token);
  const cookie = request.headers.get('cookie') || '';

  const res = await serverFetch(`/api/legacy-consent-pdf?${params.toString()}`, {
    method: 'GET',
    cookies: cookie,
  });

  const body = await res.arrayBuffer();
  return new Response(body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/pdf',
      'Content-Disposition': res.headers.get('Content-Disposition') || `attachment; filename="consent_${visitorId.slice(0, 8)}.pdf"`,
    },
  });
}
