export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { serverFetchJson } from '@/lib/server-api';

// ─── Handler ─────────────────────────────────────────────────────────────────
//
// Thin proxy to the Cloudflare Worker's /api/validate-coupon handler.
// The Stripe secret lives ONLY on the worker — this route holds no keys.
// It preserves the browser contract (POST { couponCode } → nested { discount })
// while the worker returns a flat shape, so we map flat → nested here.

interface WorkerCouponResponse {
  valid: boolean;
  error?: string;
  promotionCodeId?: string | null;
  couponId?: string | null;
  name?: string | null;
  percentOff?: number | null;
  amountOff?: number | null;   // Stripe amount_off — in smallest currency unit (cents)
  currency?: string | null;
  duration?: 'forever' | 'once' | 'repeating' | null;
  durationInMonths?: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { couponCode?: string };
    const raw = (body?.couponCode ?? '').trim();

    if (!raw) {
      return NextResponse.json(
        { valid: false, error: 'Coupon code is required' },
        { status: 400 },
      );
    }

    console.log('[validate-coupon proxy] forwarding to worker', { code: raw });

    // Worker route is GET /api/validate-coupon?code=...  (Stripe secret lives there)
    const { data, status } = await serverFetchJson(
      `/api/validate-coupon?code=${encodeURIComponent(raw)}`,
      { method: 'GET' },
    );

    const w = (data ?? {}) as WorkerCouponResponse;
    console.log('[validate-coupon proxy] worker responded', { status, valid: w.valid, couponId: w.couponId ?? null });

    if (!w.valid) {
      return NextResponse.json({
        valid: false,
        error: w.error || 'Invalid coupon code. Please check and try again.',
      });
    }

    return NextResponse.json({
      valid: true,
      promotionCodeId: w.promotionCodeId ?? null,
      couponId: w.couponId ?? null,
      discount: {
        percentOff: w.percentOff ?? null,
        // Worker returns amount_off in cents; the UI shows whole currency units.
        amountOff: w.amountOff != null ? w.amountOff / 100 : null,
        currency: (w.currency ?? 'usd').toUpperCase(),
        name: w.name ?? null,
        duration: w.duration ?? null,
        durationInMonths: w.durationInMonths ?? null,
      },
    }, { status: status >= 500 ? 502 : 200 });
  } catch (err) {
    console.error('[validate-coupon] proxy error:', err);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate coupon. Please try again.' },
      { status: 500 },
    );
  }
}
