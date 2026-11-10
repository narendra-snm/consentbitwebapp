export const runtime = 'edge';

import { proxyPrivacyApi } from '@/lib/privacy-api';

// start | complete | reject | extend | note — owner or team Admin only (checked by the worker).
export async function POST(request: Request) {
  const body = await request.text();
  return proxyPrivacyApi(request, '/api/privacy-requests/update', { method: 'POST', body });
}
