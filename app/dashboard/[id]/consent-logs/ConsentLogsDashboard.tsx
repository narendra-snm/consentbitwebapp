'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getConsentHistory,
  type ConsentLog,
  type ConsentLogCookie,
  type ConsentHistoryResponse,
} from '@/lib/client-api';
import LoadingPopup from '../scan/component/LoadingPopup';

const dm = { fontVariationSettings: "'opsz' 14" as const };

/** Module-level cache — survives tab switches (component unmount/remount). */
const consentLogCache: Record<string, ConsentHistoryResponse> = {};

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

const COOKIE_ROW_STEP = 62;
const LINE_AFTER_ROW = 40;
const CONSENT_ROW_START = 166;
const CONSENT_ROW_STEP = 30;

export function ConsentLogsDashboard({ siteId, siteDomain }: { siteId: string; siteDomain: string }) {
  const [data, setData] = useState<ConsentHistoryResponse | null>(consentLogCache[siteId] ?? null);
  const [loading, setLoading] = useState(!consentLogCache[siteId]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoader: boolean) => {
    let cancelled = false;
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    setLoadError(null);
    try {
      const res = await getConsentHistory(siteId, 200, 0);
      if (!cancelled) {
        setData(res);
        consentLogCache[siteId] = res;
      }
    } catch (err: unknown) {
      if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      if (!cancelled) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    return () => { cancelled = true; };
  }, [siteId]);

  useEffect(() => {
    const cleanup = fetchData(!consentLogCache[siteId]);
    return () => { void cleanup; };
  }, [fetchData, siteId]);

  const consentRows = useMemo(() => {
    const list = data?.consents ?? [];
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data]);

  const cookies: ConsentLogCookie[] = data?.cookies ?? [];
  const totalEvents = data?.total ?? data?.consents?.length ?? 0;
  const cookieCount = cookies.length;

  const consentRowsCount = loading ? 1 : Math.max(consentRows.length, 1);
  const consentSectionLineTop = CONSENT_ROW_START + (consentRowsCount - 1) * CONSENT_ROW_STEP + 43;
  const cookieHeaderTop = consentSectionLineTop + 17;
  const cookieSubTop = consentSectionLineTop + 50;
  const cookieTableHeaderTop = consentSectionLineTop + 112;
  const cookieTableLineTop = consentSectionLineTop + 143;
  const cookieRowStart = consentSectionLineTop + 173;

  const containerHeight = useMemo(() => {
    const n = Math.max(cookies.length, 1);
    const lastRowTop = cookieRowStart + (n - 1) * COOKIE_ROW_STEP;
    const lastLineTop = lastRowTop + LINE_AFTER_ROW;
    return Math.max(658, lastLineTop + 40);
  }, [cookieRowStart, cookies.length]);

  // Site label comes from parent (session); do not hide it while consent API loads
  const displayDomain = siteDomain?.trim() || '—';

  return (
    <>
      <LoadingPopup
        show={loading}
        title="Loading…"
        subtitle={`Fetching consent logs for "${displayDomain}"`}
      />
      {loadError ? (
        <div className="mx-auto mb-2 max-w-[1139px] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {loadError}
        </div>
      ) : null}
      {/* Refresh button */}
      <div className="mx-auto mb-3 max-w-[1139px] flex justify-end">
        <button
          type="button"
          onClick={() => void fetchData(false)}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 rounded-lg border border-[#007aff] px-3 py-1.5 text-xs font-medium text-[#007aff] hover:bg-blue-50 disabled:opacity-50 transition-colors"
          style={dm}
        >
          <svg
            width="13" height="13" viewBox="0 0 16 16" fill="none"
            className={refreshing ? 'animate-spin' : ''}
          >
            <path d="M13.65 2.35A8 8 0 1 0 15 8h-2a6 6 0 1 1-1.06-3.39L10 6h5V1l-1.35 1.35Z" fill="#007aff"/>
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
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

      {/* Column headers — only when there are rows */}
      {consentRows.length > 0 && <>
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
      </>}

      {/* Consent rows */}
      {!loading && consentRows.length === 0 ? (
        <div className="absolute left-0 right-0 flex flex-col items-center gap-2 pt-16 text-center" style={{ top: '116px' }}>
          <p className="text-sm text-[#4b5563]" style={dm}>No consent logs yet.</p>
          <p className="text-xs text-[#9ca3af]" style={dm}>Consent events will appear here once visitors interact with your banner.</p>
        </div>
      ) : consentRows.length > 0 ? (
        consentRows.map((row, i) => {
          const top = CONSENT_ROW_START + i * CONSENT_ROW_STEP;
          return (
            <div key={row.id}>
              <p
                className="absolute left-[28px] whitespace-nowrap font-medium leading-[normal] text-[15px] text-[#4b5563]"
                style={{ ...dm, top: `${top}px` }}
              >
                {formatTimeUtc(row.createdAt)}
              </p>
              <p
                className="absolute left-[259px] whitespace-nowrap font-medium leading-[normal] text-[15px] text-[#4b5563]"
                style={{ ...dm, top: `${top}px` }}
              >
                {displayStatus(row.status)}
              </p>
              <p
                className="absolute left-[426px] whitespace-nowrap font-medium leading-[normal] text-[15px] text-[#4b5563]"
                style={{ ...dm, top: `${top}px` }}
              >
                {row.consentMethod?.trim() || '—'}
              </p>
              <p
                className="absolute left-[600px] w-[537px] truncate font-medium leading-[normal] text-[15px] text-[#4b5563]"
                style={{ ...dm, top: `${top}px` }}
                title={categoriesSummary(row.categories)}
              >
                {categoriesSummary(row.categories)}
              </p>
            </div>
          );
        })
      ) : null}

      {/* Only show cookie inventory section when there are consent rows or cookies */}
      {(!loading && (consentRows.length > 0 || cookies.length > 0)) && <>
      <HLine left={0} top={consentSectionLineTop} width={1137} />

      {/* Cookie inventory header */}
      <p
        className="absolute left-[28px] whitespace-nowrap font-medium leading-[normal] tracking-[-0.32px] text-[16px] text-[#007aff]"
        style={{ ...dm, top: `${cookieHeaderTop}px` }}
      >
        Cookie inventory (set by whom, for what)
      </p>
      <p
        className="absolute left-[28px] whitespace-nowrap font-medium leading-[normal] text-[16px] text-[#4b5563]"
        style={{ ...dm, top: `${cookieSubTop}px` }}
      >
        These are cookies detected for this site. Consent above shows whether the user accepted or rejected
        analytics/marketing
      </p>

      {/* Table headers */}
      <p
        className="absolute left-[28px] whitespace-nowrap font-semibold leading-[normal] text-[17px] text-black"
        style={{ ...dm, top: `${cookieTableHeaderTop}px` }}
      >
        Cookie
      </p>
      <p
        className="absolute left-[259px] whitespace-nowrap font-semibold leading-[normal] text-[17px] text-black"
        style={{ ...dm, top: `${cookieTableHeaderTop}px` }}
      >
        Category
      </p>
      <p
        className="absolute left-[441px] whitespace-nowrap font-semibold leading-[normal] text-[17px] text-black"
        style={{ ...dm, top: `${cookieTableHeaderTop}px` }}
      >
        Provider
      </p>
      <p
        className="absolute left-[600px] whitespace-nowrap font-semibold leading-[normal] text-[17px] text-black"
        style={{ ...dm, top: `${cookieTableHeaderTop}px` }}
      >
        Purpose / Description
      </p>

      <HLine left={28} top={cookieTableLineTop} width={1111} />

      {cookies.length === 0 ? (
        <p
          className="absolute left-[28px] max-w-[1000px] font-medium leading-[normal] text-[16px] text-[#4b5563]"
          style={{ ...dm, top: `${cookieRowStart}px` }}
        >
          No cookies recorded yet. Run a scan to populate.
        </p>
      ) : (
        cookies.map((c, i) => {
          const topPx = cookieRowStart + i * COOKIE_ROW_STEP;
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

      {cookies.length > 0 ? (
        <HLine
          left={28}
          top={cookieRowStart + (cookies.length - 1) * COOKIE_ROW_STEP + LINE_AFTER_ROW}
          width={1111}
        />
      ) : null}
      </>}
    </div>
    </>
  );
}
