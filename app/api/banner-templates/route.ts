export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

// Saved banner templates (colors + layout). Thin proxy to the worker, which owns the
// org membership check and the two-slot cap — nothing is enforced here.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const organizationId = url.searchParams.get('organizationId');
  const cookie = request.headers.get('cookie') || '';
  const qs = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
  return proxyWorkerResponse(`/api/banner-templates${qs}`, { method: 'GET', cookies: cookie });
}

export async function POST(request: Request) {
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  return proxyWorkerResponse('/api/banner-templates', {
    method: 'POST',
    // This route is not in the worker's PUBLIC_PATHS, so it goes through CSRF
    // validation — which is an X-Requested-With check. The browser's header doesn't
    // survive the hop through this proxy, so it has to be set again here.
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    cookies: cookie,
    body: JSON.stringify(body),
  });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
  }
  const organizationId = url.searchParams.get('organizationId');
  const cookie = request.headers.get('cookie') || '';
  const qs =
    `?id=${encodeURIComponent(id)}` +
    (organizationId ? `&organizationId=${encodeURIComponent(organizationId)}` : '');
  return proxyWorkerResponse(`/api/banner-templates${qs}`, {
    method: 'DELETE',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    cookies: cookie,
  });
}
