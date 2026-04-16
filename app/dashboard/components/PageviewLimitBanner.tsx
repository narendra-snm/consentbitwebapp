'use client';

import { useEffect, useState } from 'react';
import { getBillingUsage } from '@/lib/client-api';
import { UpgradePlanModal } from './UpgradePlanModal';
import { useDashboardSession } from '../DashboardSessionProvider';

export function PageviewLimitBanner() {
  const { authenticated, activeOrganizationId, activeSiteId, effectivePlanId } =
    useDashboardSession();

  const [overLimit, setOverLimit] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!authenticated || !activeOrganizationId) return;

    getBillingUsage(activeOrganizationId)
      .then((data) => {
        if (data.pageviewsLimit > 0 && data.pageviewsUsed >= data.pageviewsLimit) {
          setOverLimit(true);
          setUsage({ used: data.pageviewsUsed, limit: data.pageviewsLimit });
        }
      })
      .catch(() => {/* silently ignore — banner is non-critical */});
  }, [authenticated, activeOrganizationId]);

  if (!overLimit || dismissed) return null;

  return (
    <>
      <div className="w-full bg-[#fff3cd] border-b border-[#ffc107] px-4 py-3 flex items-center justify-between gap-3 z-40">
        <div className="flex items-center gap-3 min-w-0">
          {/* Warning icon */}
          <svg
            className="shrink-0"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#b45309"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-sm font-medium text-[#78350f] truncate">
            You&apos;ve reached your monthly pageview limit
            {usage ? ` (${usage.used.toLocaleString()} / ${usage.limit.toLocaleString()})` : ''}.
            {' '}Pageviews are no longer being tracked until you upgrade.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-md bg-[#b45309] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#92400e] transition-colors"
          >
            Upgrade Plan
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-[#92400e] hover:text-[#78350f] p-0.5"
            aria-label="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {showModal && (
        <UpgradePlanModal
          currentPlanId={effectivePlanId}
          organizationId={activeOrganizationId}
          siteId={activeSiteId}
          reason="pageview"
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
