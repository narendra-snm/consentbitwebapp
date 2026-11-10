export const runtime = 'edge';

import { proxyPrivacyApi } from '@/lib/privacy-api';

// The current published cookie policy or terms as an HTML fragment, for "Copy HTML".
export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteId = url.searchParams.get('siteId');
  const kind = url.searchParams.get('kind');
  if (!siteId || !kind) return Response.json({ success: false, error: 'siteId and kind are required' }, { status: 400 });
  return proxyPrivacyApi(request, `/api/legal-policy/html?siteId=${encodeURIComponent(siteId)}&kind=${encodeURIComponent(kind)}`);
}
