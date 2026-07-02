export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { serverFetch } from '@/lib/server-api';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const siteId = searchParams.get('siteId');
  if (!siteId) return new Response('siteId required', { status: 400 });

  const params = new URLSearchParams({ siteId });
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const webappOrigin = searchParams.get('webappOrigin') || new URL(request.url).origin;
  if (year) params.set('year', year);
  if (month) params.set('month', month);
  params.set('webappOrigin', webappOrigin);

  const cookie = request.headers.get('cookie') || '';
  const res = await serverFetch(`/api/consent-csv?${params.toString()}`, {
    method: 'GET',
    cookies: cookie,
  });

  const body = await res.arrayBuffer();
  return new Response(body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/vnd.ms-excel',
      'Content-Disposition': res.headers.get('Content-Disposition') || `attachment; filename="consent_${siteId}.xls"`,
    },
  });
}
