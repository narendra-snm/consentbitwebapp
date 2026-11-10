export const runtime = 'edge';

import { proxyPrivacyApi } from '@/lib/privacy-api';

// The current published policy as an HTML fragment, for "Copy HTML" in the dashboard.
export async function GET(request: Request) {
  const siteId = new URL(request.url).searchParams.get('siteId');
  if (!siteId) return Response.json({ success: false, error: 'siteId is required' }, { status: 400 });
  return proxyPrivacyApi(request, `/api/privacy-policy/html?siteId=${encodeURIComponent(siteId)}`);
}
