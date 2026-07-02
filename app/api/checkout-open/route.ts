export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

// POST /api/checkout-open
//
// The Webflow Designer extension opens checkout by POSTing the context in the
// request BODY (an auto-submitting form in a new tab) instead of putting a token
// or params in the URL — Webflow app review disallows that. We read the body,
// stash it in a short-lived, same-origin cookie, and 303-redirect to a clean
// /checkoutplan URL. The checkout page reads that cookie and clears it.
//
// The body is either { t: <opaque token> } (the normal path) or the raw context
// fields (platform, version, platformId, domain, interval, plan) when token
// creation failed upstream. Either way, nothing sensitive lands in the URL.
export async function POST(request: NextRequest) {
  let ctx: Record<string, string> = {};
  try {
    const form = await request.formData();
    for (const [k, v] of form.entries()) {
      if (typeof v === 'string' && v.length) ctx[k] = v;
    }
  } catch {
    ctx = {};
  }

  const dest = new URL('/checkoutplan', request.url);
  const res = NextResponse.redirect(dest, 303);
  res.cookies.set('cb_checkout', JSON.stringify(ctx), {
    httpOnly: false, // the client checkout page reads + clears it
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 300, // 5 minutes — consumed on the very next page load
  });
  return res;
}

// A direct GET (e.g. a refresh) just bounces to the checkout page.
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/checkoutplan', request.url), 303);
}
