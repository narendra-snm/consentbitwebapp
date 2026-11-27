export const runtime = 'edge';

import { proxyPrivacyApi } from '@/lib/privacy-api';

// One request's audit trail (submitted, verified, started, …).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteId = url.searchParams.get('siteId');
  const id = url.searchParams.get('id');
  if (!siteId || !id) return Response.json({ success: false, error: 'siteId and id are required' }, { status: 400 });
  const params = new URLSearchParams({ siteId, id });
  return proxyPrivacyApi(request, `/api/privacy-requests/events?${params.toString()}`);
}
