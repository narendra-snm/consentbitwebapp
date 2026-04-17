"use client";
import { useEffect, useMemo, useState } from 'react';
import { createCheckoutSession } from '@/lib/client-api';

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

  async function goPaid(planId: 'basic' | 'essential' | 'growth') {
    if (!organizationId) {
      alert('Organization not loaded. Please refresh and try again.');
      return;
    }
    if (!pendingDomain && !siteId) {
      alert('No domain found. Please go back and enter your domain.');
      return;
    }
    try {
      setLoadingPlan(planId);
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
          ? `${origin}/dashboard/post-setup?domain=${encodeURIComponent(domain)}`
          : `${origin}/dashboard/post-setup?siteId=${encodeURIComponent(String(siteId ?? ''))}`,
        cancelUrl: `${origin}/dashboard`,
      });
      window.location.assign(data.url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Checkout failed');
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

        {/* Pricing Table */}
        <div className="px-6">
          <div className="grid grid-cols-[200px_220px_220px_316px_1fr] text-left">

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
            />
            <PlanHeader
              title="Essential"
              price={`$${prices.essential}`}
              button={loadingPlan === 'essential' ? 'Redirecting…' : '14 day free trial'}
              highlight
              disabled={!organizationId || (!pendingDomain && !siteId) || loadingPlan !== null || freeLoading}
              onClick={() => goPaid('essential')}
            />
            <PlanHeader
              title="Growth"
              price={`$${prices.growth}`}
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
            <Cell>100</Cell>
            <Cell>750</Cell>
            <Cell highlight>5000 scans</Cell>
            <Cell>
              <div className="font-bold text-[#5243c2]">10000 scans</div>
              <div className="text-[13px] text-[#4B5563]">
                + $.49 for additional 10000 scans
              </div>
            </Cell>

            {/* Row 3 */}
            <Feature title="No of Page views" />
            <Cell>7500</Cell>
            <Cell>100,000 page views/m</Cell>
            <Cell highlight>
              <div className="font-bold text-[#5243c2]">500,000 pageviews/m</div>
              <div className="text-[13px] text-[#4B5563]">
                + $.49 for additional 10000 scans
              </div>
            </Cell>
            <Cell>
              <div className="font-bold text-[#5243c2]">2 Million pageviews/m</div>
              <div className="text-[13px] text-[#4B5563]">
                + $.39 for additional 10000 scans
              </div>
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
};

function PlanHeader({ title, price, button, primary = false, highlight = false, onClick, disabled = false }: PlanHeaderProps) {
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