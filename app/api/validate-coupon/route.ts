export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StripeCoupon {
  id: string;
  object: 'coupon';
  valid: boolean;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  name: string | null;
  duration: 'forever' | 'once' | 'repeating' | null;
  duration_in_months: number | null;
}

interface StripePromotionCode {
  id: string;
  object: 'promotion_code';
  code: string;
  active: boolean;
  coupon: StripeCoupon;
}

interface StripeList<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

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

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('[validate-coupon] STRIPE_SECRET_KEY is not set');
      return NextResponse.json(
        { valid: false, error: 'Payment service not configured' },
        { status: 500 },
      );
    }

    const authHeader = `Bearer ${stripeKey}`;
    const stripeVersion = '2024-06-20';

    // ── Step 1: look up as a Promotion Code (user-facing code, e.g. "SAVE20") ──
    // Stripe promotion codes are case-insensitive on their end, but we uppercase
    // for safety and consistent UX.
    const promoRes = await fetch(
      `https://api.stripe.com/v1/promotion_codes?code=${encodeURIComponent(raw)}&active=true&limit=1`,
      {
        headers: {
          Authorization: authHeader,
          'Stripe-Version': stripeVersion,
        },
      },
    );

    if (promoRes.ok) {
      const promoList = (await promoRes.json()) as StripeList<StripePromotionCode>;

      if (promoList.data?.length > 0) {
        const promo = promoList.data[0];
        const coupon = promo.coupon;

        if (!promo.active || !coupon?.valid) {
          return NextResponse.json({
            valid: false,
            error: 'This coupon has expired or is no longer active',
          });
        }

        return NextResponse.json({
          valid: true,
          promotionCodeId: promo.id,   // preferred — tracks redemption count
          couponId: coupon.id,          // underlying coupon ID (fallback)
          discount: buildDiscount(coupon),
        });
      }
    }

    // ── Step 2: try as a raw Coupon ID (not a promo code) ───────────────────
    // This covers internal coupon IDs created directly in Stripe Dashboard.
    const couponRes = await fetch(
      `https://api.stripe.com/v1/coupons/${encodeURIComponent(raw)}`,
      {
        headers: {
          Authorization: authHeader,
          'Stripe-Version': stripeVersion,
        },
      },
    );

    if (couponRes.ok) {
      const coupon = (await couponRes.json()) as StripeCoupon;

      if (!coupon?.valid) {
        return NextResponse.json({
          valid: false,
          error: 'This coupon has expired or is no longer active',
        });
      }

      return NextResponse.json({
        valid: true,
        promotionCodeId: null,
        couponId: coupon.id,
        discount: buildDiscount(coupon),
      });
    }

    // Nothing found
    return NextResponse.json({
      valid: false,
      error: 'Invalid coupon code. Please check and try again.',
    });
  } catch (err) {
    console.error('[validate-coupon] unexpected error:', err);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate coupon. Please try again.' },
      { status: 500 },
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDiscount(coupon: StripeCoupon) {
  return {
    percentOff: coupon.percent_off ?? null,
    // Stripe stores amount_off in smallest currency unit (e.g. cents)
    amountOff: coupon.amount_off != null ? coupon.amount_off / 100 : null,
    currency: (coupon.currency ?? 'usd').toUpperCase(),
    name: coupon.name ?? null,
    duration: coupon.duration ?? null,
    durationInMonths: coupon.duration_in_months ?? null,
  };
}
