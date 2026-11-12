export const runtime = 'edge';

import { proxyPrivacyApi } from '@/lib/privacy-api';

// Customize the public request page: { siteId, logo (data URL | null), color '#RRGGBB' }.
// Owner or team Admin only; the worker validates the image and colour.
export async function POST(request: Request) {
  const body = await request.text();
  return proxyPrivacyApi(request, '/api/privacy-requests/branding', { method: 'POST', body });
}
