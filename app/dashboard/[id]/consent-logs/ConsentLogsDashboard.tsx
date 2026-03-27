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

/** sessionStorage-backed cache — survives tab switches AND HMR reloads in dev. */
function readConsentCache(siteId: string): ConsentHistoryResponse | null {
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`cbConsent_${siteId}`) : null;
    return raw ? (JSON.parse(raw) as ConsentHistoryResponse) : null;
  } catch { return null; }
}
function writeConsentCache(siteId: string, data: ConsentHistoryResponse) {
  try { sessionStorage.setItem(`cbConsent_${siteId}`, JSON.stringify(data)); } catch {}
}

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

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatProofDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const month = d.toLocaleString('en-US', { month: 'long' });
    const day = d.getDate();
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
    });
    return `${month} ${day}, ${year} at ${time} UTC`;
  } catch {
    return iso;
  }
}

function anonymizeIp(ip: string | null): string {
  if (!ip || !ip.trim()) return '—';
  const s = ip.trim();
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s)) {
    const parts = s.split('.');
    parts[3] = '0';
    return parts.join('.');
  }
  if (s.includes(':')) return s.split(':').slice(0, 4).join(':') + '::';
  return s;
}

function cookieDuration(expires: string | null): string {
  if (!expires || expires.toLowerCase() === 'session') return 'session';
  try {
    const d = new Date(expires);
    if (Number.isNaN(d.getTime())) return expires;
    const now = new Date();
    if (d.getTime() < now.getTime()) return 'expired';
    const days = Math.round((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    if (days <= 1) return '1 day';
    if (days < 365) return `${days} days`;
    return `${(days / 365).toFixed(1)} years`;
  } catch {
    return expires ?? 'session';
  }
}

function getAcceptedCategoriesList(categories: ConsentLog['categories']): string[] {
  const c = normalizeCategories(categories);
  if (!c) return [];
  if (c.ccpa && typeof c.ccpa.doNotSell === 'boolean') {
    return c.ccpa.doNotSell ? [] : ['All (CCPA accepted)'];
  }
  const out: string[] = [];
  if (c.essential === true) out.push('Essential');
  if (c.analytics === true) out.push('Analytics');
  if (c.marketing === true) out.push('Marketing');
  if (c.preferences === true) out.push('Preferences');
  return out;
}

function cookiesForAcceptedCategories(
  allCookies: ConsentLogCookie[],
  categories: ConsentLog['categories'],
): ConsentLogCookie[] {
  const accepted = getAcceptedCategoriesList(categories);
  if (accepted.length === 0) return allCookies;
  const set = new Set(accepted.map((x) => x.toLowerCase()));
  return allCookies.filter((c) => set.has((c.category || '').toLowerCase()));
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
  const [data, setData] = useState<ConsentHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
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
        writeConsentCache(siteId, res);
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
    const cached = readConsentCache(siteId);
    if (cached) {
      setData(cached);
      setLoading(false);
      // Refresh silently in background
      const cleanup = fetchData(false);
      return () => { void cleanup; };
    }
    const cleanup = fetchData(true);
    return () => { void cleanup; };
  }, [fetchData, siteId]);

  const consentRows = useMemo(() => {
    const list = data?.consents ?? [];
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data]);

  const cookies: ConsentLogCookie[] = data?.cookies ?? [];
  const totalEvents = data?.total ?? data?.consents?.length ?? 0;
  const cookieCount = cookies.length;
  // Site label comes from parent (session); do not hide it while consent API loads
  const displayDomain = siteDomain?.trim() || '—';

  const buildProofHtml = useCallback((rows: ConsentLog[]) => {
    const domain = displayDomain;
    const pages = rows.map((log, index) => {
      const acceptedList = getAcceptedCategoriesList(log.categories);
      const acceptedLabels = acceptedList.length ? acceptedList.join(', ') : 'None';
      const cookiesInProof = cookiesForAcceptedCategories(cookies, log.categories);
      const cookieRows =
        cookiesInProof.length === 0
          ? '<tr><td colspan="3">No cookies recorded for accepted categories.</td></tr>'
          : cookiesInProof
              .map(
                (c) =>
                  `<tr>
                    <td class="proof-td">${escapeHtml(c.name || '—')}</td>
                    <td class="proof-td">${escapeHtml(cookieDuration(c.expires))}</td>
                    <td class="proof-td">${escapeHtml(c.description || '—')}</td>
                  </tr>`,
              )
              .join('');

      return `
        <div class="proof-page">
          <h1 class="proof-title">Proof of consent</h1>
          <table class="proof-meta">
            <tr><td class="proof-label">Consented domain</td><td class="proof-value">${escapeHtml(domain)}</td></tr>
            <tr><td class="proof-label">Consent date</td><td class="proof-value">${escapeHtml(formatProofDate(log.createdAt))}</td></tr>
            <tr><td class="proof-label">Consent ID</td><td class="proof-value">${escapeHtml(log.id)}</td></tr>
            <tr><td class="proof-label">Country</td><td class="proof-value">${escapeHtml(log.country || '—')}</td></tr>
            <tr><td class="proof-label">Anonymized IP address</td><td class="proof-value">${escapeHtml(anonymizeIp(log.ipAddress))}</td></tr>
            <tr><td class="proof-label">Consent status</td><td class="proof-value">${escapeHtml(displayStatus(log.status))}</td></tr>
          </table>
          <p class="proof-categories"><strong>Accepted Categories</strong><br/>${escapeHtml(acceptedLabels)}</p>
          <table class="proof-cookie-table">
            <thead><tr><th class="proof-th">Cookie Name</th><th class="proof-th">Duration</th><th class="proof-th">Description</th></tr></thead>
            <tbody>${cookieRows}</tbody>
          </table>
          <p class="proof-footer">Page ${index + 1} of ${rows.length}</p>
        </div>
      `;
    });

    return `
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #000; font-size: 12px; }
        .proof-page { break-after: page; margin-bottom: 24px; }
        .proof-page:last-child { break-after: auto; }
        .proof-title { font-size: 18px; margin: 0 0 16px; font-weight: 700; color: #000; }
        .proof-meta { width: 100%; max-width: 520px; margin-bottom: 16px; }
        .proof-label { padding: 4px 8px 4px 0; vertical-align: top; font-weight: 600; color: #000; width: 180px; }
        .proof-value { padding: 4px 0; color: #000; }
        .proof-categories { margin: 16px 0 8px; color: #000; }
        .proof-cookie-table { border-collapse: collapse; width: 100%; margin-top: 8px; }
        .proof-th, .proof-td { border: 1px solid #333; padding: 8px; text-align: left; color: #000; }
        .proof-th { background: #f1f5f9; font-weight: 600; }
        .proof-footer { margin-top: 24px; font-size: 11px; color: #333; }
      </style>
      ${pages.length ? pages.join('') : `<div class="proof-page"><h1 class="proof-title">Proof of consent</h1><p>No consent records for this site.</p></div>`}
    `;
  }, [cookies, displayDomain]);

  const openPrintWindow = useCallback((htmlBody: string, title: string) => {
    const prevTitle = document.title;
    document.title = title;
    const win = window.open('', '_blank');
    if (!win) {
      document.title = prevTitle;
      alert('Please allow pop-ups to generate the PDF.');
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title></head><body>${htmlBody}<script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
    win.document.close();
    document.title = prevTitle;
  }, []);

  const handleDownloadRowPdf = useCallback((row: ConsentLog) => {
    openPrintWindow(buildProofHtml([row]), `Proof of Consent - ${displayDomain}`);
  }, [buildProofHtml, displayDomain, openPrintWindow]);

  return (
    <>
      <LoadingPopup
        show={loading && !data}
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
      <div className="mx-auto mt-5 max-w-[1139px] rounded-[10px] border border-[#dbe5f3] bg-white overflow-hidden">
        <div className="bg-[#e6f1fd] px-7 py-5">
          <p className="font-medium text-[16px] text-[#4b5563]" style={dm}>Site: <span className="opacity-70">{displayDomain}</span></p>
          <p className="font-medium text-[16px] text-[#4b5563] mt-1" style={dm}>
            Total consent events: {loading ? '…' : totalEvents} | Cookie inventory (for context): {loading ? '…' : `${cookieCount} Cookie${cookieCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#f7fbff]">
              <tr className="border-b border-[#e5e7eb]">
                <th className="px-4 py-3 text-left font-medium text-[16px] text-[#007aff]" style={dm}>Time (UTC)</th>
                <th className="px-4 py-3 text-left font-medium text-[16px] text-[#007aff]" style={dm}>Status</th>
                <th className="px-4 py-3 text-left font-medium text-[16px] text-[#007aff]" style={dm}>Method</th>
                <th className="px-4 py-3 text-left font-medium text-[16px] text-[#007aff]" style={dm}>Analytics / Marketing / Preferences</th>
                <th className="px-4 py-3 text-left font-medium text-[16px] text-[#007aff]" style={dm}>Download</th>
              </tr>
            </thead>
            <tbody>
              {!loading && consentRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#6b7280]" style={dm}>
                    No consent logs yet. Consent events will appear here once visitors interact with your banner.
                  </td>
                </tr>
              ) : (
                consentRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#e5e7eb] align-top hover:bg-[#fafcff]">
                    <td className="px-4 py-3 text-[14px] text-[#4b5563]" style={dm}>{formatTimeUtc(row.createdAt)}</td>
                    <td className="px-4 py-3 text-[14px] text-[#4b5563]" style={dm}>{displayStatus(row.status)}</td>
                    <td className="px-4 py-3 text-[14px] text-[#4b5563]" style={dm}>{row.consentMethod?.trim() || '—'}</td>
                    <td className="px-4 py-3 text-[14px] text-[#4b5563] min-w-[360px] whitespace-normal break-words" style={dm}>
                      {categoriesSummary(row.categories)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDownloadRowPdf(row)}
                        className="rounded-md border border-[#007aff] px-3 py-1.5 text-xs font-medium text-[#007aff] hover:bg-blue-50"
                        style={dm}
                      >
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#e5e7eb] bg-[#f9fbff] px-7 py-5">
          <p className="font-medium text-[16px] text-[#007aff]" style={dm}>Cookie inventory (set by whom, for what)</p>
          <p className="font-medium text-[14px] text-[#4b5563] mt-2" style={dm}>
            These are cookies detected for this site. Consent above shows whether the user accepted or rejected analytics/marketing.
          </p>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#d6dbe3]">
                  <th className="px-2 py-2 text-left font-semibold text-black">Cookie</th>
                  <th className="px-2 py-2 text-left font-semibold text-black">Category</th>
                  <th className="px-2 py-2 text-left font-semibold text-black">Provider</th>
                  <th className="px-2 py-2 text-left font-semibold text-black">Purpose / Description</th>
                </tr>
              </thead>
              <tbody>
                {cookies.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-3 text-[#4b5563]" style={dm}>No cookies recorded yet. Run a scan to populate.</td>
                  </tr>
                ) : (
                  cookies.map((c) => (
                    <tr key={c.id} className="border-b border-[#e5e7eb]">
                      <td className="px-2 py-3 text-[#4b5563]" style={dm}>{c.name || '—'}</td>
                      <td className="px-2 py-3 text-[#4b5563]" style={dm}>{c.category || '—'}</td>
                      <td className="px-2 py-3 text-[#4b5563]" style={dm}>{c.provider?.trim() || '—'}</td>
                      <td className="px-2 py-3 text-[#4b5563]" style={dm}>{c.description?.trim() || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
