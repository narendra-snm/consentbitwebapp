'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  getConsentHistory,
  getLegacyConsentMonthly,
  type ConsentLog,
  type ConsentLogCookie,
  type ConsentHistoryResponse,
  type CustomCookieRule,
  type ConsentLogCookieRule,
} from '@/lib/client-api';
import LoadingPopup from '../scan/component/LoadingPopup';
const svgPaths={
p1b96c400: "M9.32 11.68L11.88 14.24L14.44 11.68",
p2b261b00: "M20 12.18C20 16.6 17 20.18 12 20.18C7 20.18 4 16.6 4 12.18",
p35887140: "M12 8.10511C12.0024 7.33074 11.8482 6.56362 11.5464 5.84827C11.2447 5.13291 10.8013 4.48358 10.242 3.93797C9.30238 3.01009 8.07248 2.41963 6.75005 2.26153V0L3.0001 2.94758L6.75005 5.89516V3.75006C7.67166 3.8996 8.52218 4.32981 9.18151 4.97994C9.60087 5.38933 9.93335 5.87644 10.1597 6.41303C10.386 6.94962 10.5017 7.52501 10.5 8.10585V8.10732C10.5 8.35049 10.4752 8.58999 10.4355 8.82727C10.4302 8.85895 10.4272 8.89211 10.4212 8.9238C10.2881 9.60334 9.99594 10.2431 9.56776 10.7926C9.44776 10.9466 9.31951 11.0962 9.18076 11.2325C9.01132 11.3971 8.82874 11.5482 8.63477 11.6842C8.12618 12.0501 7.54397 12.3051 6.92704 12.4322C6.82054 12.4543 6.7133 12.469 6.60455 12.483C6.55805 12.4896 6.51305 12.4985 6.46655 12.5029C5.99093 12.5508 5.51062 12.5252 5.04307 12.427L4.72507 13.8676C5.34925 13.9991 5.99064 14.0329 6.62555 13.9678C6.6773 13.9627 6.72905 13.9524 6.7808 13.9457C6.93454 13.9266 7.08754 13.9045 7.23829 13.8735L7.27804 13.8669L7.27729 13.8632C7.83736 13.7453 8.377 13.5479 8.87927 13.2774L8.90102 13.2641C9.166 13.1188 9.41924 12.9538 9.65851 12.7704C9.861 12.6164 10.0575 12.4535 10.2412 12.273C10.4272 12.091 10.5937 11.895 10.752 11.6945C10.7677 11.6739 10.7887 11.6555 10.8045 11.6348L10.8 11.6319C11.1441 11.1828 11.4202 10.6872 11.6197 10.1603L11.6257 10.1625C11.6475 10.105 11.6632 10.0461 11.6827 9.98788C11.7105 9.90682 11.739 9.82502 11.763 9.74249C11.793 9.63932 11.8177 9.53542 11.8417 9.43078C11.8582 9.35783 11.8777 9.28709 11.8912 9.2134C11.9152 9.08739 11.9332 8.95991 11.9482 8.83316C11.9557 8.77716 11.9655 8.72263 11.9707 8.66589C11.988 8.4824 11.9985 8.29744 11.9985 8.111C11.9985 8.111 12 8.10806 12 8.10511ZM2.39786 10.7565L1.19787 11.6415C1.71396 12.3166 2.37085 12.8756 3.1246 13.2811L3.84534 11.9885C3.2787 11.6843 2.78509 11.2642 2.39786 10.7565ZM1.50012 8.10585C1.50012 7.999 1.50387 7.89436 1.51137 7.78972L0.0158911 7.68434C-0.0468591 8.52858 0.0767061 9.37617 0.378136 10.1692L1.78287 9.65259C1.59498 9.15784 1.4992 8.63391 1.50012 8.10585Z",
}

const dm: CSSProperties = { fontVariationSettings: "'opsz' 14" };

function readConsentCache(siteId: string): ConsentHistoryResponse | null {
  try {
    const raw =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(`cbConsent_${siteId}`)
        : null;
    return raw ? (JSON.parse(raw) as ConsentHistoryResponse) : null;
  } catch {
    return null;
  }
}

function writeConsentCache(siteId: string, data: ConsentHistoryResponse) {
  try {
    sessionStorage.setItem(`cbConsent_${siteId}`, JSON.stringify(data));
  } catch {}
}

function normalizeCategories(
  categories: ConsentLog['categories'],
): ConsentLog['categories'] {
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
  parts.push(
    c.essential === true
      ? 'Essential: Accepted'
      : c.essential === false
        ? 'Essential: Rejected'
        : 'Essential: —',
  );
  parts.push(
    c.analytics === true
      ? 'Analytics: Accepted'
      : c.analytics === false
        ? 'Analytics: Rejected'
        : 'Analytics: —',
  );
  parts.push(
    c.marketing === true
      ? 'Marketing: Accepted'
      : c.marketing === false
        ? 'Marketing: Rejected'
        : 'Marketing: —',
  );
  parts.push(
    c.preferences === true
      ? 'Preferences: Accepted'
      : c.preferences === false
        ? 'Preferences: Rejected'
        : 'Preferences: —',
  );

  return parts.join(', ');
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

/**
 * Map custom cookie rule category labels (from dashboard) to the consent key names
 * used by getAcceptedCategoriesList so we can filter them the same way.
 * e.g. 'necessary' → 'essential', 'advertisement' → 'marketing'
 */
function normalizeCustomRuleCategory(cat: string): string {
  const c = (cat || '').toLowerCase();
  if (c === 'necessary') return 'essential';
  if (c === 'advertisement') return 'marketing';
  if (c === 'functional' || c === 'performance') return 'preferences';
  return c;
}

function customRulesForAcceptedCategories(
  rules: ConsentLogCookieRule[],
  categories: ConsentLog['categories'],
): ConsentLogCookieRule[] {
  const c = normalizeCategories(categories);
  if (!c) return [];
  // CCPA accepted (doNotSell = false) → show all custom rules
  if (c.ccpa && c.ccpa.doNotSell === false) return rules;
  // CCPA rejected / no consent yet → show none
  if (c.ccpa) return [];
  return rules.filter((r) => {
    const mapped = normalizeCustomRuleCategory(r.category);
    if (mapped === 'essential') return true;
    if (mapped === 'analytics') return !!c.analytics;
    if (mapped === 'marketing') return !!c.marketing;
    if (mapped === 'preferences') return !!c.preferences;
    return false;
  });
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
  if (s === 'given') return 'Accepted';
  if (s === 'rejected') return 'Rejected';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function detectMethod(log: ConsentLog): string {
  const method = (log.consentMethod ?? '').toLowerCase();
  if (method.includes('iab') || method.includes('tcf')) return 'IAB/GDPR';
  if (method.includes('ccpa') || method.includes('usp')) return 'CCPA';
  if (method.includes('gdpr')) return 'GDPR';
  const c = normalizeCategories(log.categories);
  if (c && c.ccpa) return 'CCPA';
  return 'GDPR';
}

function MethodBadge({ method }: { method: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    GDPR: { bg: '#e6f1fd', text: '#1d4ed8' },
    CCPA: { bg: '#fde8cc', text: '#9a5000' },
    'IAB/GDPR': { bg: '#ede9fe', text: '#6d28d9' },
  };
  const s = styles[method] ?? { bg: '#f3f4f6', text: '#374151' };
  return (
    <span
      style={{ background: s.bg, color: s.text, fontFamily: 'DM Sans, sans-serif' }}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
    >
      {method}
    </span>
  );
}

function PaginationBar({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 mt-3">
      <button
        type="button"
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        className="px-3 py-1 rounded-md text-xs font-medium border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ‹
      </button>
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
            p === current
              ? 'bg-[#2563eb] border-[#2563eb] text-white'
              : 'border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f3f4f6]'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={current === total}
        onClick={() => onChange(current + 1)}
        className="px-3 py-1 rounded-md text-xs font-medium border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ›
      </button>
    </div>
  );
}

function ImportIcon() {
  return (
    <div className="size-[24px] shrink-0">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 24 24"
      >
        <g>
          <path
            d={svgPaths.p1b96c400}
            stroke="var(--stroke-0, #007AFF)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.5"
          />
          <path
            d="M11.88 4V14.17"
            stroke="var(--stroke-0, #007AFF)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.5"
          />
          <path
            d={svgPaths.p2b261b00}
            stroke="var(--stroke-0, #007AFF)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.5"
          />
        </g>
      </svg>
    </div>
  );
}

function DownloadPdfButton({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="bg-[#e6f1fd] flex items-center gap-[5px] h-[33px] justify-center px-[8px] py-[8px] rounded-[8px] min-w-[126px] hover:bg-[#d7eafb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ImportIcon />
      <p
        className="font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap"
        style={dm}
      >
        Download PDF
      </p>
    </button>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <div className={`flex-none h-[14px] w-[12px] ${spinning ? 'animate-spin' : ''}`}>
      <svg
        className="block size-full -scale-y-100 rotate-180"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 12 14"
      >
        <path d={svgPaths.p35887140} fill="#007AFF" />
      </svg>
    </div>
  );
}

export function ConsentLogsDashboard({
  siteId,
  siteDomain,
  legacyDomain,
  isLegacy = false,
}: {
  siteId: string;
  siteDomain: string;
  legacyDomain?: string;
  isLegacy?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<ConsentHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [consentPage, setConsentPage] = useState(1);
  const [cookiePage, setCookiePage] = useState(1);
  const CONSENT_PAGE_SIZE = 10;
  const COOKIE_PAGE_SIZE = 10;

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;

    setData(null);
    setLoading(true);
    setLoadError(null);

    const doFetch = async () => {
      try {
        const res = isLegacy
          ? await getLegacyConsentMonthly(siteId, selectedYear, selectedMonth, legacyDomain || siteDomain)
          : await getConsentHistory(siteId, 500, 0, selectedYear, selectedMonth);
        if (!active) return;
        setData(res);
        writeConsentCache(`${siteId}_${selectedYear}_${selectedMonth}`, res);
      } catch (err: unknown) {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (active) setLoading(false);
      }
    };

    void doFetch();

    return () => { active = false; };
  }, [siteId, isLegacy, selectedYear, selectedMonth]);

  const handleRefresh = useCallback(() => {
    setData(null);
    setLoading(true);
    setLoadError(null);

    const doFetch = async () => {
      try {
        const res = isLegacy
          ? await getLegacyConsentMonthly(siteId, selectedYear, selectedMonth, legacyDomain || siteDomain)
          : await getConsentHistory(siteId, 500, 0, selectedYear, selectedMonth);
        setData(res);
        writeConsentCache(`${siteId}_${selectedYear}_${selectedMonth}`, res);
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    void doFetch();
  }, [siteId, isLegacy, selectedYear, selectedMonth]);

  const consentRows = useMemo(() => {
    const list = data?.consents ?? [];
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [data]);

  const consentTotalPages = Math.max(1, Math.ceil(consentRows.length / CONSENT_PAGE_SIZE));
  const pagedConsentRows = consentRows.slice((consentPage - 1) * CONSENT_PAGE_SIZE, consentPage * CONSENT_PAGE_SIZE);

  const cookies: ConsentLogCookie[] = data?.cookies ?? [];
  const cookieTotalPages = Math.max(1, Math.ceil(cookies.length / COOKIE_PAGE_SIZE));
  const pagedCookies = cookies.slice((cookiePage - 1) * COOKIE_PAGE_SIZE, cookiePage * COOKIE_PAGE_SIZE);
  const customCookieRules: ConsentLogCookieRule[] = data?.customCookieRules ?? [];
  const totalEvents = data?.total ?? data?.consents?.length ?? 0;
  const cookieCount = cookies.length;
  const displayDomain = mounted ? (siteDomain?.trim() || '—') : '—';

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const isCurrentPeriod =
    selectedYear === String(now.getFullYear()) &&
    selectedMonth === String(now.getMonth() + 1).padStart(2, '0');
  const selectedMonthName = MONTH_NAMES[parseInt(selectedMonth, 10) - 1];

  const buildProofHtml = useCallback(
    (rows: ConsentLog[]) => {
      const domain = displayDomain;
      const logoSrc =
        typeof window !== 'undefined'
          ? `${window.location.origin}/images/ConsentBit-logo-Dark.png`
          : '/images/ConsentBit-logo-Dark.png';

      const pages = rows.map((log, index) => {
        const acceptedList = getAcceptedCategoriesList(log.categories);
        const acceptedLabels = acceptedList.length ? acceptedList.join(', ') : 'None';
        const cookiesInProof = cookiesForAcceptedCategories(cookies, log.categories);
        const customRulesInProof = customRulesForAcceptedCategories(customCookieRules, log.categories);

        const cookieRows = (() => {
          const scannedRows = cookiesInProof.map(
            (c) => `
              <tr>
                <td class="proof-td">${escapeHtml(c.name || '—')}</td>
                <td class="proof-td">${escapeHtml(cookieDuration(c.expires))}</td>
                <td class="proof-td">${escapeHtml(c.description || '—')}</td>
              </tr>
            `,
          );
          const customRows = customRulesInProof.map(
            (r) => `
              <tr>
                <td class="proof-td">${escapeHtml(r.name || '—')} <span style="font-size:10px;color:#6b7280">(custom)</span></td>
                <td class="proof-td">${escapeHtml(r.duration || '—')}</td>
                <td class="proof-td">${escapeHtml(r.description || '—')}</td>
              </tr>
            `,
          );
          const allRows = [...scannedRows, ...customRows];
          return allRows.length === 0
            ? '<tr><td class="proof-td" colspan="3">No cookies recorded for accepted categories.</td></tr>'
            : allRows.join('');
        })();

        return `
          <div class="proof-page">
            <header class="proof-header">
              <h1 class="proof-title">Proof of consent</h1>
              <div class="proof-brand">
                <img class="proof-logo" src="${escapeHtml(logoSrc)}" alt="Consentbit" width="170" height="22" />
              </div>
            </header>

            <table class="proof-meta" role="presentation">
              <tr><td class="proof-label">Consented domain</td><td class="proof-value">${escapeHtml(domain)}</td></tr>
              <tr><td class="proof-label">Consent date</td><td class="proof-value">${escapeHtml(formatProofDate(log.createdAt))}</td></tr>
              <tr><td class="proof-label">Consent ID</td><td class="proof-value">${escapeHtml(log.id)}</td></tr>
              <tr><td class="proof-label">Country</td><td class="proof-value">${escapeHtml(log.country || '—')}</td></tr>
              <tr><td class="proof-label">Anonymized IP address</td><td class="proof-value">${escapeHtml(anonymizeIp(log.ipAddress))}</td></tr>
              <tr><td class="proof-label">Consent status</td><td class="proof-value">${escapeHtml(displayStatus(log.status))}</td></tr>
            </table>

            <div class="proof-categories-wrap">
              <p class="proof-categories-title">Accepted Categories</p>
              <p class="proof-categories-line">${escapeHtml(acceptedLabels)}</p>
            </div>

            <table class="proof-cookie-table">
              <thead>
                <tr>
                  <th class="proof-th">Cookie Name</th>
                  <th class="proof-th">Duration</th>
                  <th class="proof-th">Description</th>
                </tr>
              </thead>
              <tbody>${cookieRows}</tbody>
            </table>

            <p class="proof-footer">Page ${index + 1} of ${rows.length}</p>
          </div>
        `;
      });

      return `
        <style>
          @page { margin: 16mm 14mm; }
          body {
            margin: 0;
            padding: 24px 28px 32px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            font-size: 12px;
            line-height: 1.45;
            background: #fff;
          }
          .proof-page { break-after: page; margin-bottom: 32px; }
          .proof-page:last-child { break-after: auto; margin-bottom: 0; }

          .proof-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 20px;
            padding-bottom: 14px;
            border-bottom: 1px solid #dbe5f3;
          }
          .proof-title {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #007aff;
          }
          .proof-brand { flex-shrink: 0; padding-top: 2px; }
          .proof-logo { display: block; height: 22px; width: auto; max-width: 170px; }

          .proof-meta {
            width: 100%;
            max-width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
          }
          .proof-label {
            padding: 6px 12px 6px 0;
            vertical-align: top;
            font-weight: 600;
            color: #374151;
            width: 200px;
          }
          .proof-value {
            padding: 6px 0;
            color: #111827;
            word-break: break-word;
          }

          .proof-categories-wrap {
            border: 1px solid #93c5fd;
            border-radius: 8px;
            background: linear-gradient(180deg, #f0f7ff 0%, #ffffff 48%);
            padding: 12px 14px 14px;
            margin: 0 0 14px;
          }
          .proof-categories-title {
            margin: 0 0 6px;
            font-size: 14px;
            font-weight: 700;
            color: #007aff;
          }
          .proof-categories-line {
            margin: 0;
            color: #374151;
            font-size: 12px;
          }

          .proof-cookie-table {
            border-collapse: collapse;
            width: 100%;
            border: 1px solid #93c5fd;
            border-radius: 8px;
            overflow: hidden;
          }
          .proof-th, .proof-td {
            border: 1px solid #bfdbfe;
            padding: 10px 12px;
            text-align: left;
            vertical-align: top;
          }
          .proof-th {
            background: #e6f1fd;
            color: #1e3a5f;
            font-weight: 600;
            font-size: 12px;
          }
          .proof-td {
            color: #111827;
            font-size: 11.5px;
          }
          .proof-footer {
            margin-top: 20px;
            font-size: 11px;
            color: #6b7280;
          }
        </style>
        ${
          pages.length
            ? pages.join('')
            : `<div class="proof-page"><header class="proof-header"><h1 class="proof-title">Proof of consent</h1><div class="proof-brand"><img class="proof-logo" src="${escapeHtml(
                logoSrc,
              )}" alt="Consentbit" width="170" height="22" /></div></header><p>No consent records for this site.</p></div>`
        }
      `;
    },
    [cookies, customCookieRules, displayDomain],
  );

  const openPrintWindow = useCallback((htmlBody: string, title: string) => {
    const prevTitle = document.title;
    document.title = title;

    const win = window.open('', '_blank');
    if (!win) {
      document.title = prevTitle;
      alert('Please allow pop-ups to generate the PDF.');
      return;
    }

    win.document.write(
      `<!DOCTYPE html><html><head><title>${escapeHtml(
        title,
      )}</title></head><body>${htmlBody}<script>window.onload=function(){window.print();window.close();}<\/script></body></html>`,
    );
    win.document.close();
    document.title = prevTitle;
  }, []);

  const handleDownloadRowPdf = useCallback(
    (row: ConsentLog) => {
      const apiPath = isLegacy
        ? `/api/legacy-consent-pdf?siteId=${encodeURIComponent(siteId)}&visitorId=${encodeURIComponent(row.id)}`
        : `/api/consent-pdf?siteId=${encodeURIComponent(siteId)}&consentId=${encodeURIComponent(row.id)}`;
      const a = document.createElement('a');
      a.href = apiPath;
      a.download = `consent_${row.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
    },
    [isLegacy, siteId],
  );

  const downloadCsv = useCallback(() => {
    const params = new URLSearchParams({ siteId, year: selectedYear, month: selectedMonth });
    const apiPath = isLegacy
      ? `/api/legacy-consent-csv?${params.toString()}`
      : `/api/consent-csv?${params.toString()}`;
    const a = document.createElement('a');
    a.href = apiPath;
    a.download = '';
    a.click();
  }, [siteId, isLegacy, selectedYear, selectedMonth]);

  return (
    <>
      <LoadingPopup
        show={loading && !data}
        title="Loading…"
        subtitle={`Fetching consent logs for "${displayDomain}"`}
      />

      {loadError ? (
        <div className="mx-auto mb-3 max-w-[1259px] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {loadError}
        </div>
      ) : null}

      <div className="w-full min-h-screen bg-white p-8 pt-5">
        <div className="max-w-[1259px] mx-auto">
          <div className="bg-[#fbfbfb] border border-[#ebebeb] rounded-[10px]  pt-[20px] pb-[20px]">
            <div className="flex items-start justify-between gap-6 flex-wrap mb-[31px] pl-[21px] pr-7.5">
              <div className="flex flex-wrap items-center gap-[60px]">
                <div>
                  <div className="flex items-center gap-2 mb-[11px]">
                    <h1 className="font-['DM_Sans'] font-semibold text-[14px] text-black" style={dm}>
                      Site: {displayDomain}
                    </h1>
                    {isLegacy && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 whitespace-nowrap">
                        Legacy data
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-[107px]">
                  <div>
                    <p
                      className="font-['DM_Sans'] font-medium text-[#007aff] text-[26px] mb-[5px]"
                      style={dm}
                    >
                      {loading ? '...' : totalEvents}
                    </p>
                    <p
                      className="font-['DM_Sans'] font-normal text-[16px] text-black"
                      style={dm}
                    >
                      Total consent events
                    </p>
                  </div>

                  <div>
                    <p
                      className="font-['DM_Sans'] font-medium text-[#007aff] text-[26px] mb-[5px]"
                      style={dm}
                    >
                      {loading ? '...' : cookieCount}
                    </p>
                    <p
                      className="font-['DM_Sans'] font-normal text-[16px] text-black"
                      style={dm}
                    >
                      Cookie Inventory
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-[18px] flex-wrap">
                {/* Month / Year picker */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setConsentPage(1);
                    }}
                    disabled={loading}
                    className="h-9 px-2 rounded-lg border border-[#d1d5db] bg-white text-[13px] font-['DM_Sans'] text-[#0a091f] focus:outline-none focus:ring-2 focus:ring-[#007aff] disabled:opacity-50"
                  >
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((name, i) => (
                      <option key={name} value={String(i + 1).padStart(2, '0')}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      setConsentPage(1);
                    }}
                    disabled={loading}
                    className="h-9 px-2 rounded-lg border border-[#d1d5db] bg-white text-[13px] font-['DM_Sans'] text-[#0a091f] focus:outline-none focus:ring-2 focus:ring-[#007aff] disabled:opacity-50"
                  >
                    {Array.from({ length: 4 }, (_, i) => String(now.getFullYear() - i)).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-1 disabled:opacity-50"
              >
                <p
                  className="font-['DM_Sans'] font-medium text-[#007aff] text-[15px] tracking-[-0.3px]"
                  style={dm}
                >
                  {loading ? 'Loading…' : 'Refresh'}
                </p>
                <RefreshIcon spinning={loading} />
              </button>
              </div>
            </div>

            <div className="w-full h-px bg-black/10 mb-[4px]" />

            <div className="overflow-x-auto px-2">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-[#f2f7ff]">
                    <th
                      className="h-[46px] px-[16px] text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-[#9fbce4] rounded-l-[5px] whitespace-nowrap"
                      style={dm}
                    >
                      Time (UTC)
                    </th>
                    <th
                      className="h-[46px] px-[16px] text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-[#9fbce4]"
                      style={dm}
                    >
                      Status
                    </th>
                    <th
                      className="h-[46px] px-[16px] text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-[#9fbce4]"
                      style={dm}
                    >
                      Method
                    </th>
                    <th
                      className="h-[46px] px-[16px] text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-[#9fbce4] min-w-[420px]"
                      style={dm}
                    >
                      Analytics / Marketing / Preferences
                    </th>
                    <th
                      className="h-[46px] px-[16px] text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-[#9fbce4] rounded-r-[5px] whitespace-nowrap"
                      style={dm}
                    >
                      Download
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {!loading && consentRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-[16px] py-[24px] text-center font-['DM_Sans'] text-[14px] text-[#4b5563]"
                        style={dm}
                      >
                        {isCurrentPeriod
                          ? 'No consent logs yet. Consent events will appear here once visitors interact with your banner.'
                          : `No consent data found for ${selectedMonthName} ${selectedYear}.`}
                      </td>
                    </tr>
                  ) : (
                    pagedConsentRows.map((row) => (
                      <tr key={row.id} className="border-b border-black/10">
                        <td
                          className="px-[16px] py-[9px] font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-black/10"
                          style={dm}
                        >
                          {formatTimeUtc(row.createdAt)}
                        </td>
                        <td
                          className="px-[16px] py-[9px] font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-black/10"
                          style={dm}
                        >
                          {displayStatus(row.status)}
                        </td>
                        <td
                          className="px-[16px] py-[9px] whitespace-nowrap border-b border-black/10"
                        >
                          <MethodBadge method={detectMethod(row)} />
                        </td>
                        <td
                          className="px-[16px] py-[9px] font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-black/10"
                          style={dm}
                        >
                          <div className="min-w-[420px] whitespace-normal break-words">
                            {categoriesSummary(row.categories)}
                          </div>
                        </td>
                        <td className="px-[16px] py-[9px] border-b border-black/10">
                          <DownloadPdfButton onClick={() => handleDownloadRowPdf(row)} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar current={consentPage} total={consentTotalPages} onChange={(p) => setConsentPage(p)} />

            {/* Export CSV — available for both legacy and webapp users */}
            {consentRows.length > 0 && (
              <div className="flex justify-end px-2 mt-3">
                <button
                  type="button"
                  onClick={downloadCsv}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#007aff] text-white text-sm font-medium hover:bg-[#0066d6] transition-colors"
                >
                  <ImportIcon />
                  <span>Export CSV</span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-[59px]">
            <h2
              className="font-['DM_Sans'] font-semibold text-[20px] text-black mb-[11px]"
              style={dm}
            >
              Cookie inventory (set by whom, for what)
            </h2>

            <p
              className="font-['DM_Sans'] font-normal text-[#4b5563] text-[16px] mb-[18px]"
              style={dm}
            >
              These are cookies detected for this site. Consent above shows whether the user
              accepted or rejected analytics/marketing.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-[#f2f7ff]">
                    <th
                      className="min-h-[46px] px-[16px] py-4.5 text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-[#9fbce4] rounded-l-[5px] whitespace-nowrap"
                      style={dm}
                    >
                      Cookie
                    </th>
                    <th
                      className="min-h-[46px] px-[16px] py-4.5 text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-[#9fbce4]"
                      style={dm}
                    >
                      Category
                    </th>
                    <th
                      className="min-h-[46px] px-[16px] py-4.5 text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-[#9fbce4]"
                      style={dm}
                    >
                      Provider
                    </th>
                    <th
                      className="min-h-[46px] px-[16px] py-4.5  text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-[#9fbce4] min-w-[420px]"
                      style={dm}
                    >
                      Purpose / Description
                    </th>
                    {/* <th
                      className="h-[46px] px-[16px] text-left font-['DM_Sans'] font-medium text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-[#9fbce4] rounded-r-[5px] whitespace-nowrap"
                      style={dm}
                    >
                      Download
                    </th> */}
                  </tr>
                </thead>

                <tbody>
                  {cookies.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-[16px] py-[24px] font-['DM_Sans'] text-[14px] text-[#4b5563]"
                        style={dm}
                      >
                        No cookies recorded yet. Run a scan to populate.
                      </td>
                    </tr>
                  ) : (
                    pagedCookies.map((cookie) => (
                      <tr key={cookie.id}>
                        <td
                          className="px-[16px] py-4.5 font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-black/10"
                          style={dm}
                        >
                          {cookie.name || '—'}
                        </td>
                        <td
                          className="px-[16px] py-4.5 font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-black/10"
                          style={dm}
                        >
                          {cookie.category || '—'}
                        </td>
                        <td
                          className="px-[16px] py-4.5 font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] whitespace-nowrap border-b border-black/10"
                          style={dm}
                        >
                          {cookie.provider?.trim() || 'Not available'}
                        </td>
                        <td
                          className="px-[16px] py-4.5 font-['DM_Sans'] font-light text-[#0a091f] text-[14px] tracking-[-0.7px] border-b border-black/10"
                          style={dm}
                        >
                          <div className="min-w-[420px] whitespace-normal break-words">
                            {cookie.description?.trim() || 'Not available'}
                          </div>
                        </td>
                        {/* <td className="px-[16px] py-[9px] border-b border-black/10">
                          <DownloadPdfButton
                            onClick={() =>
                              alert(
                                `Cookie PDF download is not implemented in the original working version for "${cookie.name}".`,
                              )
                            }
                          />
                        </td> */}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar current={cookiePage} total={cookieTotalPages} onChange={(p) => setCookiePage(p)} />
          </div>
        </div>
      </div>
    </>
  );
}

export default ConsentLogsDashboard;