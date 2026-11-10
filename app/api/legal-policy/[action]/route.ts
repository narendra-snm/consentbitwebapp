export const runtime = 'edge';

import { proxyPrivacyApi } from '@/lib/privacy-api';

const ACTIONS = new Set(['save', 'preview', 'publish']);

// save | preview | publish — body { siteId, kind, answers }. Owner/Admin and plan checks are in the worker.
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!ACTIONS.has(action)) return Response.json({ success: false, error: 'Not Found' }, { status: 404 });
  const body = await request.text();
  return proxyPrivacyApi(request, `/api/legal-policy/${action}`, { method: 'POST', body });
}
