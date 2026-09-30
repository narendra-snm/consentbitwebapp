import { NextRequest, NextResponse } from 'next/server';

// CSRF: lib/server-api.ts adds `X-Requested-With` to every proxied call, so the
// worker's header-based CSRF guard can't tell a forged form from the app. Browsers
// always send `Origin` on POST/PUT/PATCH/DELETE, so refuse state-changing API calls
// that come from another site.
//   • /api/checkout-open and /api/checkout-token are exempt: they exist to be called
//     cross-site by the Designer extension, and forward no session cookie, so there is
//     nothing for a forged request to ride on.
//   • No Origin header (curl, server-to-server) passes — CSRF is a browser attack, and
//     the worker still checks the session on every route.
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CROSS_SITE_POST_OK = new Set(['/api/checkout-open', '/api/checkout-token']);

function crossSiteWrite(request: NextRequest): boolean {
  if (!MUTATING.has(request.method)) return false;
  if (CROSS_SITE_POST_OK.has(request.nextUrl.pathname)) return false;
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return !!origin; // "null" = sandboxed/opaque → refuse
  const host = request.headers.get('host') || request.nextUrl.host;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  if (crossSiteWrite(request)) {
    return NextResponse.json(
      { success: false, error: 'Cross-site request blocked.', code: 'CROSS_SITE_BLOCKED' },
      { status: 403 },
    );
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
