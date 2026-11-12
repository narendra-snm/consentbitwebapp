"use client";
import { useEffect, useMemo, useState } from 'react';
import { createCheckoutSession, parseApiResponse } from '@/lib/client-api';
import { analytics } from '@/lib/analytics';
import { couponPlanMismatch, friendlyCouponError } from '@/lib/blackFridayCoupons';

/**
 * Black Friday offer, applied automatically from the chosen plan at checkout. The code is shown
 * and a manual promo input is offered as a fallback; a manually validated code overrides it.
 * promotionCodeId = the Stripe promotion code for that plan; the worker re-verifies it.
 * Same table as AddNewSiteModal, the upgrade page and the checkout pages — keep them in sync.
 */
const BLACK_FRIDAY_OFFERS: Record<'basic' | 'essential' | 'growth', { code: string; percentOff: number; promotionCodeId: string }> = {
  basic: { code: 'BF20OFF', percentOff: 20, promotionCodeId: 'promo_1UakZMJwcuG9163My19Z7s03' },
  essential: { code: 'BF20OFF', percentOff: 20, promotionCodeId: 'promo_1UakZMJwcuG9163My19Z7s03' },
  growth: { code: 'BF30OFF', percentOff: 30, promotionCodeId: 'promo_1UakbBJwcuG9163MHJ5xP4EW' },
};

/** A promo code the customer validated manually; it overrides the automatic offer at checkout. */
type AppliedCoupon = {
  promotionCodeId: string;
  code: string;
  percentOff: number | null;
  amountOff: number | null;
  currency: string;
};

export function PricingTable({
  onclick,
  organizationId,
  siteId,
  pendingDomain,
}: {
  onclick: () => void | Promise<void>;
  organizationId?: string | null;
  /** Already-created siteId, or null if site is created on plan selection */
  siteId?: string | null;
  /** Domain entered in Step 1 — used to create the site when siteId is not yet set */
  pendingDomain?: string | null;
}) {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [loadingPlan, setLoadingPlan] = useState<null | 'basic' | 'essential' | 'growth'>(null);
  const [freeLoading, setFreeLoading] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  // Manual promo box is hidden until the customer asks for it; the offer applies by default.
  const [showCouponInput, setShowCouponInput] = useState(false);
  // Checkout failures (e.g. a code that does not cover the chosen plan) show here, not in an alert.
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Reset loading state if user returns via browser back button (bfcache restore).
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        setLoadingPlan(null);
        setFreeLoading(false);
      }
    }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  async function handleFreeClick() {
    setFreeLoading(true);
    // Step 8 — free plan card selected in the pricing menu.
    analytics.planSelected('free', billingInterval === 'year' ? 'annual' : 'monthly', 0, siteId ?? undefined);
    try {
      await onclick();
    } finally {
      setFreeLoading(false);
    }
  }

  const prices = useMemo(() => {
    const monthly = { basic: 9, essential: 20, growth: 56 };
    if (billingInterval === 'month') return monthly;
    // 20% off yearly, show equivalent /month
    return {
      basic: Math.round(monthly.basic * 0.8),
      essential: Math.round(monthly.essential * 0.8),
      growth: Math.round(monthly.growth * 0.8),
    };
  }, [billingInterval]);

  /**
   * Fallback for when the automatic Black Friday offer does not come through (or the customer
   * has a different code). Validated server-side against the logged-in account (session cookie),
   * so per-customer restricted codes cannot be spoofed. A rejected code leaves the offer in place.
   */
  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) {
      setCouponError('Enter a promo code.');
      return;
    }
    setCouponError(null);
    setCheckoutError(null);
    setCouponLoading(true);
    try {
      const res = await fetch(
        `/api/validate-coupon?code=${encodeURIComponent(code)}`,
        { credentials: 'include' },
      );
      const data = (await parseApiResponse(res)) as {
        valid?: boolean;
        error?: string;
        promotionCodeId?: string;
        code?: string;
        percentOff?: number | null;
        amountOff?: number | null;
        currency?: string;
      } | null;
      if (!data || !data.valid || !data.promotionCodeId) {
        setCouponError(data?.error || 'Invalid or expired promo code.');
        return;
      }
      setAppliedCoupon({
        promotionCodeId: data.promotionCodeId,
        code: data.code || code,
        percentOff: data.percentOff ?? null,
        amountOff: data.amountOff ?? null,
        currency: data.currency || 'usd',
      });
      setCouponError(null);
    } catch {
      setCouponError('Could not validate the promo code. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  }

  /** Clear the manual code and fall back to the automatic Black Friday offer. */
  function clearCoupon() {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
    setCheckoutError(null);
    setShowCouponInput(false);
  }

  async function goPaid(planId: 'basic' | 'essential' | 'growth') {
    if (!organizationId) {
      alert('Organization not loaded. Please refresh and try again.');
      return;
    }
    if (!pendingDomain && !siteId) {
      alert('No domain found. Please go back and enter your domain.');
      return;
    }
    // A manually applied Black Friday code only covers certain plans — say so here
    // instead of letting Stripe reject the session with a generic message.
    const mismatch = appliedCoupon ? couponPlanMismatch(appliedCoupon.code, planId) : null;
    if (mismatch) {
      setCheckoutError(mismatch);
      return;
    }
    setCheckoutError(null);
    try {
      setLoadingPlan(planId);
      // Step 8 + 9 — plan card selected then straight to checkout in this menu.
      const cycle = billingInterval === 'year' ? 'annual' : 'monthly';
      analytics.planSelected(planId, cycle, prices[planId], siteId ?? undefined);
      analytics.checkoutInitiated(planId, siteId ?? undefined, cycle);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const domain = pendingDomain ?? '';
      // Do NOT create the site before checkout — site is created after successful payment
      const data = await createCheckoutSession({
        organizationId,
        planId,
        interval: billingInterval === 'month' ? 'monthly' : 'yearly',
        siteId: siteId ?? null,
        siteName: domain || null,
        siteDomain: domain || null,
        successUrl: domain
          ? `${origin}/api/checkout-session-redirect?session_id={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(`${origin}/dashboard/post-setup?domain=${encodeURIComponent(domain)}`)}`
          : `${origin}/api/checkout-session-redirect?session_id={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(`${origin}/dashboard/post-setup?siteId=${encodeURIComponent(String(siteId ?? ''))}`)}`  ,
        cancelUrl: `${origin}/dashboard`,
        // A promo code the customer validated manually wins; otherwise the Black Friday
        // offer for the chosen plan. The worker re-verifies either before applying it.
        promotionCodeId: appliedCoupon
          ? appliedCoupon.promotionCodeId
          : BLACK_FRIDAY_OFFERS[planId].promotionCodeId,
      });
      window.location.assign(data.url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Checkout failed';
      setCheckoutError(friendlyCouponError(msg, planId, appliedCoupon?.code));
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="w-full  flex items-center justify-center">
      <div className="w-full max-w-[1292px] bg-white rounded-[29px] shadow-lg overflow-hidden">

        {/* Header */}
        <div className="bg-[#E6F1FD]/50 px-9 py-3.75 flex items-center justify-between">
     <div
  className="p-[1px] rounded-[22px] inline-block"
  style={{
    background:
      billingInterval === 'year'
        ? 'linear-gradient(90deg, #007AFF 0%, #F3F8FE 70%)'
        : 'linear-gradient(90deg, #F3F8FE 30.59%, #007AFF 100%)',
  }}
>
  <div className="flex items-center gap-3 bg-white rounded-[22px] relative px-1 py-1">
    
    {/* MONTHLY */}
    <button
      type="button"
      onClick={() => setBillingInterval('month')}
      className={`
        relative rounded-[22px] text-sm font-extrabold transition-all duration-200
        ${
          billingInterval === 'month'
            ? 'bg-[#007aff] text-white scale-[1.2] z-10 px-7 py-3'
            : 'text-[#848199] scale-100 px-6 py-3'
        }
      `}
    >
      MONTHLY
    </button>

    {/* YEARLY */}
    <button
      type="button"
      onClick={() => setBillingInterval('year')}
      className={`
        relative rounded-[22px] text-sm font-extrabold transition-all duration-200
        ${
          billingInterval === 'year'
            ? 'bg-[#007aff] text-white scale-[1.2] z-10 px-7 py-3'
            : 'text-[#848199] scale-100 px-6 py-3'
        }
      `}
    >
      YEARLY (20% OFF)
    </button>

  </div>
</div>

          <div className="  font-medium">
            <span className=" bg-[linear-gradient(259.32deg,_#EDEEFC_5.12%,_#78B8FF_118.29%)]  px-2.75 py-2 rounded-full ">
            FOR ALL PLANS 14 DAYS TRIAL IS AVAILABLE
          </span>
          </div>
        </div>

        {/* Black Friday offer — applied automatically at checkout for the chosen plan. The codes are
            shown, and a promo input lets the customer apply one manually (or use another code); a
            manually applied code overrides the automatic offer. */}
        <div className="mx-6 mt-5 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          {appliedCoupon && (
            <p className="text-sm font-semibold text-green-800">{appliedCoupon.code} applied</p>
          )}
          {appliedCoupon && (
            <p className="mt-1 text-xs text-green-700">
              {appliedCoupon.percentOff != null
                ? `${appliedCoupon.percentOff}% off`
                : appliedCoupon.amountOff != null
                  ? `${(appliedCoupon.amountOff / 100).toFixed(2)} ${appliedCoupon.currency.toUpperCase()} off`
                  : 'Discount applied'}
              .
            </p>
          )}

          {checkoutError && (
            <p className="mb-2 text-xs font-medium text-red-600">{checkoutError}</p>
          )}

          {!appliedCoupon && !showCouponInput && (
            <button
              type="button"
              onClick={() => setShowCouponInput(true)}
              className="text-xs font-medium text-[#007aff] underline underline-offset-2"
            >
              Have a coupon code?
            </button>
          )}

          {(showCouponInput || appliedCoupon) && (
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-[220px] max-w-full">
                  <input
                    type="text"
                    value={couponInput}
                    disabled={!!appliedCoupon || couponLoading}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !appliedCoupon) {
                        e.preventDefault();
                        void applyCoupon();
                      }
                    }}
                    placeholder="Promo code"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-[44px] w-full rounded-lg border bg-white px-3.5 text-sm font-mono uppercase tracking-wider outline-none focus:border-[#007aff] disabled:cursor-not-allowed"
                    style={{
                      paddingRight: appliedCoupon || couponInput ? 38 : 14,
                      borderColor: couponError ? '#b91c1c' : appliedCoupon ? '#15803d' : '#e5e5e5',
                      backgroundColor: appliedCoupon ? '#f8fafc' : '#ffffff',
                      color: appliedCoupon ? '#6b7280' : '#161616',
                    }}
                  />
                  {(appliedCoupon || couponInput) && (
                    <button
                      type="button"
                      aria-label="Remove promo code"
                      title="Remove promo code"
                      onClick={clearCoupon}
                      className="absolute right-[10px] top-1/2 flex h-[20px] w-[20px] -translate-y-1/2 items-center justify-center rounded-full text-[14px] leading-none"
                      style={{ backgroundColor: '#e5e5e5', color: '#161616' }}
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void applyCoupon()}
                  disabled={couponLoading || !!appliedCoupon || !couponInput.trim()}
                  className="h-[44px] shrink-0 rounded-lg bg-[#007aff] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {couponLoading ? 'Checking…' : appliedCoupon ? 'Applied' : 'Apply'}
                </button>
              </div>

              {couponError && (
                <p className="mt-1.5 flex items-start gap-1 text-xs" style={{ color: '#b91c1c' }}>
                  <span className="leading-[1.4]">⚠</span>
                  <span>{couponError}</span>
                </p>
              )}
              {!appliedCoupon && (
                <button
                  type="button"
                  onClick={clearCoupon}
                  className="mt-2 text-xs text-gray-500 underline underline-offset-2"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pricing Table */}
        <div className="px-6 pt-5 overflow-auto xl:overflow-hidden">
          <div className="grid grid-cols-[200px_220px_220px_316px_316px] text-left">

            {/* Header Row */}
            <div></div>

            <PlanHeader
              title="Free"
              price="$0"
              button={freeLoading ? 'Setting up…' : 'Take this plan'}
              disabled={freeLoading || loadingPlan !== null}
              onClick={handleFreeClick}
            />
            <PlanHeader
              title="Basic"
              price={`$${prices.basic}`}
              button={loadingPlan === 'basic' ? 'Redirecting…' : '14 day free trial'}
              primary
              disabled={!organizationId || (!pendingDomain && !siteId) || loadingPlan !== null || freeLoading}
              onClick={() => goPaid('basic')}
              offer={appliedCoupon ? null : BLACK_FRIDAY_OFFERS.basic}
            />
            <PlanHeader
              title="Essential"
              price={`$${prices.essential}`}
              button={loadingPlan === 'essential' ? 'Redirecting…' : '14 day free trial'}
              highlight
              disabled={!organizationId || (!pendingDomain && !siteId) || loadingPlan !== null || freeLoading}
              onClick={() => goPaid('essential')}
              offer={appliedCoupon ? null : BLACK_FRIDAY_OFFERS.essential}
            />
            <PlanHeader
              title="Growth"
              price={`$${prices.growth}`}
              button={loadingPlan === 'growth' ? 'Redirecting…' : '14 day free trial'}
              primary
              disabled={!organizationId || (!pendingDomain && !siteId) || loadingPlan !== null || freeLoading}
              onClick={() => goPaid('growth')}
              offer={appliedCoupon ? null : BLACK_FRIDAY_OFFERS.growth}
            />

            {/* Row 1 */}
            <Feature title="No of Domains" />
            <Cell>01</Cell>
            <Cell>01</Cell>
            <Cell highlight>01</Cell>
            <Cell>01</Cell>

            {/* Row 2 */}
            <Feature title="No of scans" />
            <Cell>100 scans</Cell>
            <Cell>750 scans</Cell>
            <Cell highlight>5000 scans</Cell>
            <Cell>
              <div className="font-bold text-[#5243c2]">10000 scans</div>
            </Cell>

            {/* Row 3 */}
            <Feature title="No of Page views" />
            <Cell>7500</Cell>
            <Cell>100,000 page views/m</Cell>
            <Cell highlight>
              <div className="font-bold text-[#5243c2]">500,000 pageviews/m</div>
            </Cell>
            <Cell>
              <div className="font-bold text-[#5243c2]">2 Million pageviews/m</div>
            </Cell>

            {/* Row 4 */}
            <Feature title="IAB / TCF" />
            <Cell gray>NIL</Cell>
            <Cell gray>NIL</Cell>
            <Cell highlight>Yes</Cell>
            <Cell>Yes</Cell>

            {/* Row 5 */}
            <Feature title="Compliance" />
            <Cell gray>GDPR/CCPA</Cell>
            <Cell gray>GDPR/CCPA</Cell>
            <Cell highlight last>GDPR+CCPA</Cell>
            <Cell>GDPR+CCPA</Cell>

          </div>
        </div>
      </div>
    </div>
  );
}

type PlanHeaderProps = {
  title: string;
  price: string;
  button: string;
  primary?: boolean;
  highlight?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  /** Black Friday code auto-applied for this plan; null/undefined hides the badge. */
  offer?: { code: string; percentOff: number } | null;
};

function PlanHeader({ title, price, button, primary = false, highlight = false, onClick, disabled = false, offer = null }: PlanHeaderProps) {
  return (
    <div
      className={`py-7.5 px-6 flex flex-col gap-4 ${
        highlight ? "bg-[#f0fff1] border border-b-0 border-[#A4BFA64D] rounded-t-[20px] relative" : ""
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-4 bg-[#4cbb66] text-white text-[17px] px-3.25 py-0.5 rounded-full">
          Recommended
        </div>
      )}

      <h3 className="text-[#007aff] text-[28px] font-extrabold mb-0.5">{title}</h3>

      <div className="flex items-baseline gap-1 mb-2.75">
        <span className="text-[#231d4f] text-4xl font-extrabold">{price}</span>
        <span className="text-gray-500 text-[base]">/month</span>
      </div>

      <button
        onClick={onClick}
        disabled={disabled || onClick == null}
        className={`py-[16.5px] px-[23.5px] rounded-lg w-fit text-[15px] cursor-pointer ${
          highlight
            ? "bg-[#4cbb66] text-white  "
            : primary
            ? "bg-[#007aff] text-white"
            : "bg-[#e0efff] text-[#007aff]"
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {button}
      </button>

      {offer && (
        <p className="text-[13px] font-semibold text-[#15803d]">
          {offer.percentOff}% off · code <span className="font-mono">{offer.code}</span>
        </p>
      )}
    </div>
  );
}

function Feature({ title }: { title: string }) {
  return (
    <div className="py-4 flex items-center px-6 border-t border-[#000000]/10 text-black text-[17px] font-medium">{title}</div>
  );
}

type CellProps = {
  children: React.ReactNode;
  highlight?: boolean;
  gray?: boolean;
  last?: boolean;
};

function Cell({ children, highlight = false, gray = false, last = false }: CellProps) {
  return (
    <div
      className={`py-5.5 px-4 border-t border-[#000000]/10 font-bold flex items-center ${
        highlight ? "bg-[#f0fff1] text-[#5243c2] border-r border-l" : gray ? "text-gray-400" : "text-[#5243c2]"
      }
      
      ${last?'rounded-b-[20px] pb-7':''}`}
    >
      <span> {children}</span>
     
    </div>
  );
}