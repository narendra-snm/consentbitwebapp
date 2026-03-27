'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  getConsentHistory,
  type ConsentLog,
  type ConsentLogCookie,
  type ConsentHistoryResponse,
} from '@/lib/client-api';
import LoadingPopup from '../scan/component/LoadingPopup';

const dm = { fontVariationSettings: "'opsz' 14" as const };

function normalizeCategories(categories: ConsentLog['categories']): ConsentLog['categories'] {
  if (!categories || typeof categories !== 'object') return categories;
  const inner = (categories as { categories?: ConsentLog['categories'] }).categories;
  return typeof inner === 'object' && inner !== null ? inner : categories;
}

function categoriesSummary(categories: ConsentLog['categories']): string {
  const c = normalizeCategories(categories);
  if (!c) return '—';
  if (c.ccpa && typeof c.ccpa.doNotSell === 'boolean') {
    return c.ccpa.doNotSell ? 'Do Not Sell: Yes' : 'Do Not Sell: No';
  }
  const parts: string[] = [];
  parts.push(c.essential === true ? 'Essential: Accepted' : c.essential === false ? 'Essential: Rejected' : 'Essential: —');
  parts.push(c.analytics === true ? 'Analytics: Accepted' : c.analytics === false ? 'Analytics: Rejected' : 'Analytics: —');
  parts.push(c.marketing === true ? 'Marketing: Accepted' : c.marketing === false ? 'Marketing: Rejected' : 'Marketing: —');
  parts.push(c.preferences === true ? 'Preferences: Accepted' : c.preferences === false ? 'Preferences: Rejected' : 'Preferences: —');
  return parts.join(', ');
}

function formatTimeUtc(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function displayStatus(status: string | null) {
  if (!status) return '—';
  const s = status.toLowerCase();
  if (s === 'given') return 'Given';
  if (s === 'rejected') return 'Rejected';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function ConsentLogsDashboard({ siteId, siteDomain }: { siteId: string; siteDomain: string }) {
  const [data, setData] = useState<ConsentHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getConsentHistory(siteId, 200, 0)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const consentRows = useMemo(() => {
    const list = data?.consents ?? [];
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data]);

  const cookies: ConsentLogCookie[] = data?.cookies ?? [];
  const totalEvents = data?.total ?? data?.consents?.length ?? 0;
  const cookieCount = cookies.length;
  const displayDomain = siteDomain?.trim() || '—';

  return (
    <>
      <LoadingPopup
        show={loading}
        title="Loading..."
        subtitle={`Loading consent logs for "${displayDomain}"`}
      />
      {loadError ? (
        <div className="mx-auto mb-2 max-w-[1139px] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {loadError}
        </div>
      ) : null}
      
      <div
        className="mx-auto mt-5 max-w-[1139px] rounded-[10px] font-['DM_Sans',sans-serif]"
        style={{ ...dm, minHeight: '658px' }}
      >
        {/* Blue header section */}
        <div className=" rounded-[10px] bg-[#e6f1fd]" >

        {/* Site info & Total events */}
        <div className="mx-7 mb-10 flex flex-col gap-6 py-6.25">
          <div className="flex items-center gap-2 text-base font-medium text-[#4b5563]">
            <span>Site</span>
            <span className="opacity-60">{displayDomain}</span>
          </div>
          
          <div className="flex items-center gap-4 text-base font-medium text-[#4b5563]">
            <span>Total consent events: {loading ? '…' : totalEvents}</span>
            <span className="opacity-60">
              | Cookie inventory (for context): {loading ? '…' : `${cookieCount} Cookie${cookieCount !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
</div>
        {/* Consent History Section */}
        <div className="mx-7">
          <div className="mb-4 flex gap-20 border-b border-black/10 pb-2">
            <h3 className="text-base font-medium tracking-[-0.32px] text-[#007aff]">Time (UTC)</h3>
            <h3 className="text-base font-medium tracking-[-0.32px] text-[#007aff]">Status</h3>
            <h3 className="text-base font-medium tracking-[-0.32px] text-[#007aff]">Method</h3>
            <h3 className="text-base font-medium tracking-[-0.32px] text-[#007aff] w-[537px]">
              Analytics / Marketing / Preferences
            </h3>
          </div>

          <div className="space-y-3 border-b border-black/10 pb-10">
            {loading ? (
              <ConsentRowPlaceholder />
            ) : consentRows.length === 0 ? (
              <ConsentRowEmpty />
            ) : (
              consentRows.map((row) => (
                <ConsentRow key={row.id} row={row} />
              ))
            )}
          </div>
        </div>

        {/* Cookie Inventory Section */}
        <div className="mx-7 mt-12">
          <div className="mb-2">
            <h3 className="text-base font-medium tracking-[-0.32px] text-[#007aff]">
              Cookie inventory (set by whom, for what)
            </h3>
            <p className="text-base text-[#4b5563]">
              These are cookies detected for this site. Consent above shows whether the user accepted or rejected
              analytics/marketing
            </p>
          </div>

          <div className="border-b border-black/10 pb-3">
            <div className="mb-4 flex gap-8">
              <h4 className="w-[231px] font-semibold text-lg text-black">Cookie</h4>
              <h4 className="w-[182px] font-semibold text-lg text-black">Category</h4>
              <h4 className="w-[159px] font-semibold text-lg text-black">Provider</h4>
              <h4 className="w-[537px] font-semibold text-lg text-black">Purpose / Description</h4>
            </div>
          </div>

          <div className="space-y-4 pb-8">
            {loading ? (
              <CookieRowLoading />
            ) : cookies.length === 0 ? (
              <CookieRowEmpty />
            ) : (
              cookies.map((cookie, i) => (
                <CookieRow key={cookie.id} cookie={cookie} isLast={i === cookies.length - 1} />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Consent Row Components
function ConsentRow({ row }: { row: ConsentLog }) {
  return (
    <div className="flex items-start gap-20 text-sm font-medium text-[#4b5563]">
      <span className="w-[231px] whitespace-nowrap">{formatTimeUtc(row.createdAt)}</span>
      <span className="w-[167px] whitespace-nowrap">{displayStatus(row.status)}</span>
      <span className="w-[174px] whitespace-nowrap">{row.consentMethod?.trim() || '—'}</span>
      <span className="w-[537px] truncate" title={categoriesSummary(row.categories)}>
        {categoriesSummary(row.categories)}
      </span>
    </div>
  );
}

function ConsentRowPlaceholder() {
  return (
    <div className="flex items-start gap-20 text-sm font-medium text-[#4b5563]">
      <span className="w-[231px] whitespace-nowrap">…</span>
      <span className="w-[167px] whitespace-nowrap">…</span>
      <span className="w-[174px] whitespace-nowrap">…</span>
      <span className="w-[537px]">…</span>
    </div>
  );
}

function ConsentRowEmpty() {
  return (
    <div className="flex items-start gap-20 text-sm font-medium text-[#4b5563]">
      <span className="w-[231px] whitespace-nowrap">—</span>
      <span className="w-[167px] whitespace-nowrap">—</span>
      <span className="w-[174px] whitespace-nowrap">—</span>
      <span className="w-[537px]">—</span>
    </div>
  );
}

// Cookie Row Components
function CookieRow({ cookie, isLast }: { cookie: ConsentLogCookie; isLast: boolean }) {
  return (
    <div className="flex items-start gap-8 border-b border-black/10 pb-5 last:border-b-0 last:pb-0">
      <span className="w-[231px] whitespace-nowrap text-base font-medium text-[#4b5563]">
        {cookie.name || '—'}
      </span>
      <span className="w-[182px] whitespace-nowrap text-base font-medium text-[#4b5563]">
        {cookie.category || '—'}
      </span>
      <span 
        className="w-[159px] max-w-[140px] truncate text-base font-medium text-[#4b5563]" 
        title={cookie.provider ?? ''}
      >
        {cookie.provider?.trim() || '—'}
      </span>
      <span className="w-[537px] text-sm font-medium text-[#4b5563]">
        {cookie.description?.trim() || '—'}
      </span>
    </div>
  );
}

function CookieRowLoading() {
  return (
    <div className="text-base font-medium text-[#4b5563]">
      Loading cookies…
    </div>
  );
}

function CookieRowEmpty() {
  return (
    <div className="max-w-[1000px] text-base font-medium text-[#4b5563]">
      No cookies recorded yet. Run a scan to populate.
    </div>
  );
}