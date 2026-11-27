export const runtime = 'edge';

import { proxyPrivacyApi } from '@/lib/privacy-api';

// Privacy policy generator: draft answers, published versions, scan summary.
// Thin proxy to the consentbit-privacy-requests worker, which owns every check.
export async function GET(request: Request) {
  const siteId = new URL(request.url).searchParams.get('siteId');
  if (!siteId) return Response.json({ success: false, error: 'siteId is required' }, { status: 400 });
  return proxyPrivacyApi(request, `/api/privacy-policy?siteId=${encodeURIComponent(siteId)}`);
}
