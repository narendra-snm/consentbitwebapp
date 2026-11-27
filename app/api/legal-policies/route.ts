export const runtime = 'edge';

import { proxyPrivacyApi } from '@/lib/privacy-api';

// Legal Policies hub: status of the privacy policy, cookie policy and terms for one site.
export async function GET(request: Request) {
  const siteId = new URL(request.url).searchParams.get('siteId');
  if (!siteId) return Response.json({ success: false, error: 'siteId is required' }, { status: 400 });
  return proxyPrivacyApi(request, `/api/legal-policies?siteId=${encodeURIComponent(siteId)}`);
}
