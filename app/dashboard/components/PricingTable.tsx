"use client";
import { useEffect, useMemo, useState } from 'react';
import { createCheckoutSession, parseApiResponse } from '@/lib/client-api';
import { analytics } from '@/lib/analytics';
import { BLACK_FRIDAY_CODE_PLANS, couponPlanMismatch, friendlyCouponError } from '@/lib/blackFridayCoupons';
// Black Friday pricing design (remove with the offer).
import { BlackFridayPromoPill, BillingToggle, PlanPrice, TrialPill, bfStyles } from '@/components/pricing/BlackFridayPricing';
import { isBlackFridayActive } from '@/lib/blackFridayOffer';

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

  // Black Friday price display: struck list price + discounted price + stamp, only while
  // the offer runs and no manual code replaced it.
  const bfActive = isBlackFridayActive();
  const bfOff = (plan: 'basic' | 'essential' | 'growth') =>
    bfActive && !appliedCoupon ? BLACK_FRIDAY_OFFERS[plan].percentOff : 0;

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6">
      {/* Black Friday offer pill with countdown (design: "Pricing Black Friday"). */}
      <BlackFridayPromoPill />
      <div className="w-full max-w-[1292px] bg-white rounded-[29px] shadow-lg overflow-hidden">

        {/* Header — MONTHLY / YEARLY toggle + trial pill (Black Friday pricing design). */}
        <div className="bg-[#E8F3FF] py-[14px] pr-[22px] pl-[30px] flex flex-wrap items-center justify-between gap-4">
          <BillingToggle
            value={billingInterval === 'year' ? 'yearly' : 'monthly'}
            onChange={(next) => setBillingInterval(next === 'yearly' ? 'year' : 'month')}
          />
          <TrialPill />
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
              {(() => {
                const scope = BLACK_FRIDAY_CODE_PLANS[appliedCoupon.code.toUpperCase()];
                if (!scope) return null;
                const names = scope.map((id) => id.charAt(0).toUpperCase() + id.slice(1));
                return ` Valid for ${names.join(' and ')} only.`;
              })()}
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
          <div className="grid grid-cols-[160px_repeat(4,minmax(0,1fr))] min-w-[1100px] text-left">

            {/* Header Row */}
            <div></div>

            <PlanHeader
              title="Free"
              price={0}
              index={0}
              period={billingInterval}
              button={freeLoading ? 'Setting up…' : 'Take this plan'}
              disabled={freeLoading || loadingPlan !== null}
              onClick={handleFreeClick}
            />
            <PlanHeader
              title="Basic"
              price={prices.basic}
              percentOff={bfOff('basic')}
              index={1}
              period={billingInterval}
              button={loadingPlan === 'basic' ? 'Redirecting…' : '14 day free trial'}
              primary
              disabled={!organizationId || (!pendingDomain && !siteId) || loadingPlan !== null || freeLoading}
              onClick={() => goPaid('basic')}
            />
            <PlanHeader
              title="Essential"
              price={prices.essential}
              percentOff={bfOff('essential')}
              index={2}
              period={billingInterval}
              button={loadingPlan === 'essential' ? 'Redirecting…' : '14 day free trial'}
              highlight
              disabled={!organizationId || (!pendingDomain && !siteId) || loadingPlan !== null || freeLoading}
              onClick={() => goPaid('essential')}
            />
            <PlanHeader
              title="Growth"
              price={prices.growth}
              percentOff={bfOff('growth')}
              index={3}
              period={billingInterval}
              button={loadingPlan === 'growth' ? 'Redirecting…' : '14 day free trial'}
              primary
              disabled={!organizationId || (!pendingDomain && !siteId) || loadingPlan !== null || freeLoading}
              onClick={() => goPaid('growth')}
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
  /** Monthly-equivalent list price for the selected period. */
  price: number;
  /** Black Friday percent off to display (0 = plain price). */
  percentOff?: number;
  /** Column order, for the staggered strike / stamp animation. */
  index: number;
  /** Replays the price animation when the billing period changes. */
  period: 'month' | 'year';
  button: string;
  primary?: boolean;
  highlight?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

function PlanHeader({ title, price, percentOff = 0, index, period, button, primary = false, highlight = false, onClick, disabled = false }: PlanHeaderProps) {
  return (
    <div
      className={`py-7.5 px-6 flex flex-col ${
        highlight ? "bg-[#f0fff1] border border-b-0 border-[#A4BFA64D] rounded-t-[20px] relative" : ""
      }`}
    >
      {highlight && (
        <div className={`absolute -top-3 left-4 ${bfStyles.rtag}`}>Recommended</div>
      )}

      <h3 className={bfStyles.pn}>{title}</h3>

      {/* Black Friday: list price struck through, discounted price counts in, "% OFF" stamp. */}
      <PlanPrice base={price} percentOff={percentOff} index={index} animKey={period} />

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