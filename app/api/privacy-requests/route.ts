export const runtime = 'edge';

import { proxyPrivacyApi } from '@/lib/privacy-api';

// A site's privacy requests (list + public form link). Thin proxy to the
// consentbit-privacy-requests worker, which owns every check.
export async function GET(request: Request) {
  const siteId = new URL(request.url).searchParams.get('siteId');
  if (!siteId) return Response.json({ success: false, error: 'siteId is required' }, { status: 400 });
  return proxyPrivacyApi(request, `/api/privacy-requests?siteId=${encodeURIComponent(siteId)}`);
}
