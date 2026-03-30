'use client';

import { useState } from 'react';
import { createCheckoutSession } from '@/lib/client-api';

type PlanTier = 'free' | 'basic' | 'essential' | 'growth';

const NEXT_PLAN: Record<PlanTier, 'basic' | 'essential' | 'growth' | null> = {
  free: 'basic',
  basic: 'essential',
  essential: 'growth',
  growth: null,
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  essential: 'Essential',
  growth: 'Growth',
};

const PLAN_FEATURES: Record<string, { scans: string; pageviews: string; price: string }> = {
  basic:     { scans: '750 scans/mo',    pageviews: '100,000 pageviews/mo', price: '$9/mo' },
  essential: { scans: '5,000 scans/mo',  pageviews: '500,000 pageviews/mo', price: '$20/mo' },
  growth:    { scans: '10,000 scans/mo', pageviews: '2,000,000 pageviews/mo', price: '$56/mo' },
};

export function UpgradePlanModal({
  currentPlanId,
  organizationId,
  siteId,
  reason,
  onClose,
}: {
  currentPlanId: string;
  organizationId: string | null;
  siteId: string | null;
  reason: 'scan' | 'pageview';
  onClose: () => void;
}) {
  const current = (currentPlanId || 'free').toLowerCase() as PlanTier;
  const nextPlan = NEXT_PLAN[current] ?? null;
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    if (!nextPlan || !organizationId) return;
    if (!siteId) {
      alert('Site not found. Please refresh and try again.');
      return;
    }
    setLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const data = await createCheckoutSession({
        organizationId,
        planId: nextPlan,
        interval: 'monthly',
        siteId,
        siteName: null,
        siteDomain: null,
        successUrl: `${origin}/dashboard/post-setup?siteId=${encodeURIComponent(siteId)}`,
        cancelUrl: typeof window !== 'undefined' ? window.location.href : `${origin}/dashboard`,
      });
      window.location.assign(data.url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Checkout failed');
      setLoading(false);
    }
  }

  const reasonLabel = reason === 'scan'
    ? 'monthly scan limit'
    : 'monthly pageview limit';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-8">
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff3cd]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-center font-['DM_Sans'] text-xl font-semibold text-[#0a091f]">
          {PLAN_LABELS[current]} plan limit reached
        </h2>
        <p className="mb-6 text-center font-['DM_Sans'] text-sm text-[#4b5563]">
          You&apos;ve reached your {reasonLabel} on the{' '}
          <strong>{PLAN_LABELS[current]}</strong> plan.
          {nextPlan
            ? ` Upgrade to ${PLAN_LABELS[nextPlan]} to continue.`
            : ' You are on the highest plan. Please contact support.'}
        </p>

        {nextPlan && PLAN_FEATURES[nextPlan] && (
          <div className="mb-6 rounded-xl border border-[#e6f1fd] bg-[#f5f9ff] p-4">
            <p className="mb-2 font-['DM_Sans'] text-sm font-semibold text-[#007aff]">
              {PLAN_LABELS[nextPlan]} plan includes:
            </p>
            <ul className="space-y-1 font-['DM_Sans'] text-sm text-[#374151]">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                {PLAN_FEATURES[nextPlan].scans}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                {PLAN_FEATURES[nextPlan].pageviews}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Starting at {PLAN_FEATURES[nextPlan].price}
              </li>
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#d1d5db] bg-white px-4 py-2.5 font-['DM_Sans'] text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
          >
            Cancel
          </button>
          {nextPlan ? (
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={loading}
              className="flex-1 rounded-lg bg-[#007aff] px-4 py-2.5 font-['DM_Sans'] text-sm font-medium text-white hover:bg-[#0066d6] disabled:opacity-60"
            >
              {loading ? 'Redirecting…' : `Upgrade to ${PLAN_LABELS[nextPlan]}`}
            </button>
          ) : (
            <a
              href="mailto:support@consentbit.com"
              className="flex-1 rounded-lg bg-[#007aff] px-4 py-2.5 text-center font-['DM_Sans'] text-sm font-medium text-white hover:bg-[#0066d6]"
            >
              Contact Support
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
