'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  getConsentHistory,
  type ConsentLog,
  type ConsentLogCookie,
  type ConsentHistoryResponse,
} from '@/lib/client-api';

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

function splitSummaryTwoLines(summary: string): [string, string] {
  if (summary === '—') return ['—', ''];
  const parts = summary.split(', ');
  if (parts.length <= 2) return [summary, ''];
  const mid = Math.ceil(parts.length / 2);
  return [parts.slice(0, mid).join(', '), parts.slice(mid).join(', ')];
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

function HLine({ left, top, width }: { left: number; top: number; width: number }) {
  return (
    <div className="absolute h-0" style={{ left: `${left}px`, top: `${top}px`, width: `${width}px` }}>
      <div className="absolute inset-[-1px_0_0_0]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox={`0 0 ${width} 1`}>
          <line opacity="0.1" stroke="black" x2={width} y1="0.5" y2="0.5" />
        </svg>
      </div>
    </div>
  );
}

const COOKIE_ROW_START = 382;
const COOKIE_ROW_STEP = 62;
const LINE_AFTER_ROW = 40;

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

  const latestConsent = useMemo(() => {
    const list = data?.consents ?? [];
    if (list.length === 0) return null;
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [data]);

  const cookies: ConsentLogCookie[] = data?.cookies ?? [];
  const totalEvents = data?.total ?? data?.consents?.length ?? 0;
  const cookieCount = cookies.length;

  const [line1, line2] = useMemo(() => {
    if (!latestConsent) return ['—', ''] as [string, string];
    return splitSummaryTwoLines(categoriesSummary(latestConsent.categories));
  }, [latestConsent]);

  const containerHeight = useMemo(() => {
    const n = Math.max(cookies.length, 1);
    const lastRowTop = COOKIE_ROW_START + (n - 1) * COOKIE_ROW_STEP;
    const lastLineTop = lastRowTop + LINE_AFTER_ROW;
    return Math.max(658, lastLineTop + 40);
  }, [cookies.length]);

  // Site label comes from parent (session); do not hide it while consent API loads
  const displayDomain = siteDomain?.trim() || '—';

  return (
    <>
      {loadError ? (
        <div className="mx-auto mb-2 max-w-[1139px] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {loadError}
        </div>
      ) : null}
      <div
        className="relative mx-auto mt-5 max-w-[1139px]"
        style={{ fontFamily: "'DM Sans', sans-serif", minHeight: containerHeight }}
      >
      {/* Blue header section */}
      <div className="absolute left-0 top-0 h-[116px] w-[1139px] rounded-[10px] bg-[#e6f1fd]" />

      {/* Site label */}
      <p
        className="absolute left-[28px] top-[25px] whitespace-nowrap font-medium leading-[normal] text-[16px] text-[#4b5563]"
        style={dm}
      >
        Site
      </p>
      <p
        className="absolute left-[63px] top-[25px] whitespace-nowrap font-medium leading-[normal] text-[16px] text-[#4b5563] opacity-60"
        style={dm}
      >
        : {displayDomain}
      </p>

      {/* Total consent events */}
      <p
        className="absolute left-[28px] top-[67px] whitespace-nowrap font-medium leading-[normal] text-[16px] text-[#4b5563]"
        style={dm}
      >
        Total consent events: {loading ? '…' : totalEvents} | Cookie inventory (for context):
      </p>
      <p
        className="absolute left-[523px] top-[67px] whitespace-nowrap font-medium leading-[normal] text-[16px] text-[#4b5563] opacity-60"
        style={dm}
      >
        : {loading ? '…' : `${cookieCount} Cookie${cookieCount !== 1 ? 's' : ''}`}
      </p>

      {/* Column headers */}
      <p
        className="absolute left-[28px] top-[137px] whitespace-nowrap font-medium leading-[normal] tracking-[-0.32px] text-[16px] text-[#007aff]"
        style={dm}
      >
        Time (UTC)
      </p>
      <p
        className="absolute left-[259px] top-[137px] whitespace-nowrap font-medium leading-[normal] tracking-[-0.32px] text-[16px] text-[#007aff]"
        style={dm}
      >
        Status
      </p>
      <p
        className="absolute left-[426px] top-[137px] whitespace-nowrap font-medium leading-[normal] tracking-[-0.32px] text-[16px] text-[#007aff]"
        style={dm}
      >
        Method
      </p>
      <p
        className="absolute left-[600px] top-[137px] whitespace-nowrap font-medium leading-[normal] tracking-[-0.32px] text-[16px] text-[#007aff]"
        style={dm}
      >
        Analytics / Marketing / Preferences
      </p>

      {/* Latest consent row */}
      <p
        className="absolute left-[28px] top-[166px] whitespace-nowrap font-medium leading-[normal] text-[15px] text-[#4b5563]"
        style={dm}
      >
        {loading ? '…' : latestConsent ? formatTimeUtc(latestConsent.createdAt) : '—'}
      </p>
      <p
        className="absolute left-[259px] top-[166px] whitespace-nowrap font-medium leading-[normal] text-[15px] text-[#4b5563]"
        style={dm}
      >
        {loading ? '…' : latestConsent ? displayStatus(latestConsent.status) : '—'}
      </p>
      <p
        className="absolute left-[426px] top-[166px] whitespace-nowrap font-medium leading-[normal] text-[15px] text-[#4b5563]"
        style={dm}
      >
        {loading ? '…' : latestConsent?.consentMethod?.trim() || '—'}
      </p>
      <div
        className="absolute left-[600px] top-[166px] w-[537px] font-medium leading-[normal] text-[15px] text-[#4b5563]"
        style={dm}
      >
        {loading ? (
          <p className="mb-0">…</p>
        ) : (
          <>
            <p className="mb-0">{line1}</p>
            {line2 ? <p>{line2}</p> : null}
          </>
        )}
      </div>

      <HLine left={0} top={209} width={1137} />

      {/* Cookie inventory header */}
      <p
        className="absolute left-[28px] top-[226px] whitespace-nowrap font-medium leading-[normal] tracking-[-0.32px] text-[16px] text-[#007aff]"
        style={dm}
      >
        Cookie inventory (set by whom, for what)
      </p>
      <p
        className="absolute left-[28px] top-[259px] whitespace-nowrap font-medium leading-[normal] text-[16px] text-[#4b5563]"
        style={dm}
      >
        These are cookies detected for this site. Consent above shows whether the user accepted or rejected
        analytics/marketing
      </p>

      {/* Table headers */}
      <p
        className="absolute left-[28px] top-[321px] whitespace-nowrap font-semibold leading-[normal] text-[17px] text-black"
        style={dm}
      >
        Cookie
      </p>
      <p
        className="absolute left-[259px] top-[321px] whitespace-nowrap font-semibold leading-[normal] text-[17px] text-black"
        style={dm}
      >
        Category
      </p>
      <p
        className="absolute left-[441px] top-[321px] whitespace-nowrap font-semibold leading-[normal] text-[17px] text-black"
        style={dm}
      >
        Provider
      </p>
      <p
        className="absolute left-[600px] top-[321px] whitespace-nowrap font-semibold leading-[normal] text-[17px] text-black"
        style={dm}
      >
        Purpose / Description
      </p>

      <HLine left={28} top={352} width={1111} />

      {loading ? (
        <p
          className="absolute left-[28px] top-[382px] font-medium leading-[normal] text-[16px] text-[#4b5563]"
          style={dm}
        >
          Loading cookies…
        </p>
      ) : cookies.length === 0 ? (
        <p
          className="absolute left-[28px] top-[382px] max-w-[1000px] font-medium leading-[normal] text-[16px] text-[#4b5563]"
          style={dm}
        >
          No cookies recorded yet. Run a scan to populate.
        </p>
      ) : (
        cookies.map((c, i) => {
          const topPx = COOKIE_ROW_START + i * COOKIE_ROW_STEP;
          const lineTop = topPx + LINE_AFTER_ROW;
          const topStyle: CSSProperties = { ...dm, top: `${topPx}px` };
          const descStyle: CSSProperties = { ...dm, top: `${topPx + 1}px` };
          return (
            <div key={c.id}>
              <p
                className="absolute left-[28px] whitespace-nowrap font-medium leading-[normal] text-[16px] text-[#4b5563]"
                style={topStyle}
              >
                {c.name || '—'}
              </p>
              <p
                className="absolute left-[259px] whitespace-nowrap font-medium leading-[normal] text-[16px] text-[#4b5563]"
                style={topStyle}
              >
                {c.category || '—'}
              </p>
              <p
                className="absolute left-[441px] max-w-[140px] truncate font-medium leading-[normal] text-[16px] text-[#4b5563]"
                style={topStyle}
                title={c.provider ?? ''}
              >
                {c.provider?.trim() || '—'}
              </p>
              <p
                className="absolute left-[600px] w-[537px] font-medium leading-[normal] text-[15px] text-[#4b5563]"
                style={descStyle}
              >
                {c.description?.trim() || '—'}
              </p>
              {i < cookies.length - 1 ? <HLine left={28} top={lineTop} width={1111} /> : null}
            </div>
          );
        })
      )}

      {!loading && cookies.length > 0 ? (
        <HLine
          left={28}
          top={COOKIE_ROW_START + (cookies.length - 1) * COOKIE_ROW_STEP + LINE_AFTER_ROW}
          width={1111}
        />
      ) : null}
    </div>
    </>
  );
}
