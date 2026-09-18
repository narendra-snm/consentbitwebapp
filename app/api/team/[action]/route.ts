export const runtime = 'edge';

import { proxyWorkerResponse } from '@/lib/server-api';

// /api/team/{invite,update,remove,resend,accept} (POST) and /api/team/invite-info (GET).
// Only these names are forwarded, so this route can't be used to reach other worker paths.
const POST_ACTIONS = new Set(['invite', 'update', 'remove', 'resend', 'accept']);
const GET_ACTIONS = new Set(['invite-info']);

function actionFrom(request: Request): string {
  return new URL(request.url).pathname.split('/').filter(Boolean).pop() || '';
}

export async function GET(request: Request) {
  const action = actionFrom(request);
  if (!GET_ACTIONS.has(action)) {
    return Response.json({ success: false, error: 'Not Found' }, { status: 404 });
  }
  const url = new URL(request.url);
  return proxyWorkerResponse(`/api/team/${action}?${url.searchParams.toString()}`, {
    method: 'GET',
    cookies: request.headers.get('cookie') || '',
  });
}

export async function POST(request: Request) {
  const action = actionFrom(request);
  if (!POST_ACTIONS.has(action)) {
    return Response.json({ success: false, error: 'Not Found' }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  return proxyWorkerResponse(`/api/team/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cookies: request.headers.get('cookie') || '',
    body: JSON.stringify(body),
  });
}
