export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

// ─── Handler ─────────────────────────────────────────────────────────────────
//
// Thin proxy to the Worker's GET /api/validate-coupon.
//
// This route exists for one reason: the `sid` session cookie is host-only for the
// worker's origin and SameSite=Lax, so a browser fetch straight to
// manager.consentbit.com arrives WITHOUT it. The worker then can't identify the
// caller, and per-customer restricted promo codes are refused for everyone.
// Proxying server-side lets us forward the cookie explicitly, exactly as the other
// authenticated routes (billing, subscriptions, create-checkout-session) already do.
//
// The base64 envelope is passed through untouched — callers decode it client-side.

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') || '';
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get('code') || '').trim();
  // Advisory identity hint for guest checkout, which has no session cookie.
  // The worker prefers the session and re-checks at payment time.
  const email = (searchParams.get('email') || '').trim();

  const qs = new URLSearchParams({ code });
  if (email) qs.set('email', email);

  return proxyWorkerResponse(`/api/validate-coupon?${qs.toString()}`, {
    method: 'GET',
    cookies: cookie,
  });
}