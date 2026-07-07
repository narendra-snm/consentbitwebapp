export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

// POST /api/checkout-open
//
// The Webflow Designer extension opens checkout by POSTing the context in the
// request BODY (an auto-submitting form in a new tab) instead of putting a token
// or params in the URL — Webflow app review disallows that. We read the body,
// stash it in a short-lived, same-origin cookie, and 303-redirect to a clean
// checkout URL. The checkout page reads that cookie and clears it.
//
// The destination depends on WHERE the plugin opened checkout from, sent as a
// `dest` form field:
//   • upgrade / plan-select → /checkout-plan (read-only: shows the plan already
//                                             chosen in the plugin) — DEFAULT
//   • interactive picker    → /checkoutplan  (kept in the allow-list for back-compat)
// Anything else falls back to /checkout-plan.
//
// The rest of the body is either { t: <opaque token> } (the normal path) or the
// raw context fields (platform, version, platformId, domain, interval, plan)
// when token creation failed upstream. Either way, nothing sensitive lands in
// the URL.

const DEST_ALLOW = new Set(['checkout-plan', 'checkoutplan']);
const DEFAULT_DEST = 'checkout-plan';

function resolveDest(raw: string | undefined): string {
  return raw && DEST_ALLOW.has(raw) ? raw : DEFAULT_DEST;
}

export async function POST(request: NextRequest) {
  const ctx: Record<string, string> = {};
  let destField: string | undefined;
  try {
    const form = await request.formData();
    for (const [k, v] of form.entries()) {
      if (typeof v !== 'string' || !v.length) continue;
      // `dest` selects the checkout page — it's routing metadata, not checkout
      // context, so keep it out of the cookie handed to the page.
      if (k === 'dest') { destField = v; continue; }
      ctx[k] = v;
    }
  } catch {
    /* empty context — page falls back to its defaults */
  }

  const dest = new URL(`/${resolveDest(destField)}`, request.url);
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

// A direct GET (e.g. a refresh) just bounces to the checkout page. Honour a
// ?dest= query when present, else fall back to the default checkout-plan page.
export async function GET(request: NextRequest) {
  const raw = new URL(request.url).searchParams.get('dest') || undefined;
  return NextResponse.redirect(new URL(`/${resolveDest(raw)}`, request.url), 303);
}
