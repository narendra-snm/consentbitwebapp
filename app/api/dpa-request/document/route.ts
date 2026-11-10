export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { serverFetch } from '@/lib/server-api';

// GET /api/dpa-request/document?id=<requestId> → the signed DPA PDF ConsentBit
// published for the caller's request.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return new Response('id required', { status: 400 });
  const cookie = request.headers.get('cookie') || '';
  const res = await serverFetch(`/api/dpa-request?document=${encodeURIComponent(id)}`, {
    method: 'GET',
    cookies: cookie,
  });
  const body = await res.arrayBuffer();
  return new Response(body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/pdf',
      'Content-Disposition': res.headers.get('Content-Disposition') || 'attachment; filename="ConsentBit-DPA.pdf"',
      'Cache-Control': 'private, no-store',
    },
  });
}
