'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addCustomCookieRule,
  deleteCustomCookieRule,
  deleteScheduledScan,
  getCustomCookieRules,
  getScanHistory,
  getScheduledScans,
  getSiteCookies,
  publishCustomCookieRules,
  scanSiteNow,
  type CustomCookieRule,
  type ScanCookie,
  type ScanHistoryRow,
  type ScheduledScan,
} from '@/lib/client-api';
import { ScheduleScanModal } from './ScheduleScanModal';

import { useDashboardSession } from '../../DashboardSessionProvider';

const CATEGORY_LABELS: Record<string, string> = {
  necessary: 'Necessary',
  functional: 'Functional',
  analytics: 'Analytics',
  performance: 'Performance',
  advertisement: 'Advertisement',
  marketing: 'Marketing',
  behavioral: 'Behavioral',
  uncategorized: 'Uncategorized',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  necessary:
    'Necessary cookies are required to enable the basic features of this site, such as providing secure log-in or adjusting your consent preferences. These cookies do not store any personally identifiable data.',
  functional:
    'Functional cookies enable the website to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages.',
  analytics:
    'Analytics cookies help website owners to understand how visitors interact with websites by collecting and reporting information anonymously.',
  performance:
    'Performance cookies are used to understand and analyze the key performance indexes of the website which helps in delivering a better user experience for the visitors.',
  advertisement:
    'Advertisement cookies are used to provide visitors with relevant ads and marketing campaigns. These cookies track visitors across websites and collect information to provide customized ads.',
  marketing:
    'Marketing cookies are used to track visitors across websites. The intention is to display ads that are relevant and engaging for the individual user.',
  behavioral:
    'Behavioral cookies are used to understand how visitors interact with the website. These cookies help provide information on metrics such as visitor behavior, session recordings, and user experience.',
  uncategorized: 'Uncategorized cookies are cookies that have not been classified into a category as yet.',
};

const ALL_CATEGORIES = [
  'necessary',
  'functional',
  'analytics',
  'performance',
  'advertisement',
  'marketing',
  'behavioral',
  'uncategorized',
] as const;

/** Plus icon in Add Cookie button (original scan UI) */
const ICON_PLUS = 'M3.13333 8V0H4.85V8H3.13333ZM0 4.88889V3.11111H8V4.88889H0Z';

function formatDateUtc(dateString: string) {
  try {
    const d = new Date(dateString);
    return (
      d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
        hour12: false,
      }) + ' (UTC)'
    );
  } catch {
    return dateString;
  }
}

function formatTableDate(dateString: string) {
  try {
    const d = new Date(dateString);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
      hour12: false,
    });
  } catch {
    return dateString;
  }
}

function formatCookieDuration(expires: string | null) {
  if (!expires || expires === 'Session') return 'Session';
  try {
    const expireDate = new Date(expires);
    const now = new Date();
    const diffMs = expireDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''}`;
    if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
    if (diffDays > 0) return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    return expires;
  } catch {
    return expires;
  }
}

const dm = { fontVariationSettings: "'opsz' 14" as const };

type ScanCache = {
  scanHistory: ScanHistoryRow[];
  cookiesByCategory: Record<string, ScanCookie[]>;
  scheduledScans: ScheduledScan[];
  customRules?: CustomCookieRule[];
};

/** sessionStorage-backed cache — survives tab switches AND HMR reloads in dev. */
function readScanCache(siteId: string): ScanCache | null {
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`cbScan_${siteId}`) : null;
    return raw ? (JSON.parse(raw) as ScanCache) : null;
  } catch { return null; }
}
function writeScanCache(siteId: string, data: ScanCache) {
  try { sessionStorage.setItem(`cbScan_${siteId}`, JSON.stringify(data)); } catch {}
}

export function CookieScanDashboard({ siteId }: { siteId: string }) {
  const { refresh, sites } = useDashboardSession();
  const [scanHistory, setScanHistory] = useState<ScanHistoryRow[]>([]);
  const [cookiesByCategory, setCookiesByCategory] = useState<Record<string, ScanCookie[]>>({});
  const [scheduledScans, setScheduledScans] = useState<ScheduledScan[]>([]);
  const [customRules, setCustomRules] = useState<CustomCookieRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('necessary');
  const [showAddCookie, setShowAddCookie] = useState(false);
  const [savingCustomCookie, setSavingCustomCookie] = useState(false);
  const [publishingRules, setPublishingRules] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [customCookieForm, setCustomCookieForm] = useState({
    name: '',
    domain: '',
    duration: '',
    scriptUrlPattern: '',
    description: '',
    category: 'necessary',
  });

  const hasDraftRules = useMemo(() => customRules.some((r) => r.published === 0), [customRules]);
  const [bottomTab, setBottomTab] = useState<'history' | 'rules'>('history');
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 10;
  const [cookiePage, setCookiePage] = useState(1);
  const COOKIE_PAGE_SIZE = 5;

  const loadData = useCallback(async (showLoader = true) => {
    if (!siteId) return;
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const [historyData, cookiesData, scheduledData, rulesData] = await Promise.all([
        getScanHistory(siteId),
        getSiteCookies(siteId),
        getScheduledScans(siteId).catch(() => ({ success: true as const, scheduledScans: [] as ScheduledScan[] })),
        getCustomCookieRules(siteId).catch(() => ({ rules: [] as CustomCookieRule[] })),
      ]);
      const history = historyData.scans || [];
      const byCat = cookiesData.cookiesByCategory || {};
      const scheduled = scheduledData.scheduledScans || [];
      const rules = rulesData.rules || [];
      setScanHistory(history);
      setHistoryPage(1);
      setCookiesByCategory(byCat);
      setScheduledScans(scheduled);
      setCustomRules(rules);
      writeScanCache(siteId, { scanHistory: history, cookiesByCategory: byCat, scheduledScans: scheduled, customRules: rules });
      const firstWithCookies = ALL_CATEGORIES.find((c) => (byCat[c]?.length ?? 0) > 0);
      setSelectedCategory(firstWithCookies ?? 'necessary');
    } catch (e: unknown) {
      console.error('[CookieScanDashboard]', e);
      setError(e instanceof Error ? e.message : 'Failed to load scan data');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    const cached = readScanCache(siteId);
    if (cached) {
      // Seed state from cache immediately so the UI shows without waiting for fetch
      setScanHistory(cached.scanHistory ?? []);
      setCookiesByCategory(cached.cookiesByCategory ?? {});
      setScheduledScans(cached.scheduledScans ?? []);
      setCustomRules(cached.customRules ?? []);
      setLoading(false);
      // Refresh silently in background
      loadData(false);
    } else {
      loadData(true);
    }
  }, [loadData, siteId]);



  const lastSuccessfulScan = useMemo(() => {
    const completed = scanHistory.filter((s) => String(s.scanStatus).toLowerCase() === 'completed');
    if (completed.length > 0) return completed[0];
    return scanHistory.length > 0 ? scanHistory[0] : null;
  }, [scanHistory]);

  const nextScheduledScan = useMemo(() => {
    if (scheduledScans.length === 0) return null;
    return [...scheduledScans].sort(
      (a, b) =>
        new Date(a.nextRunAt || a.scheduledAt).getTime() - new Date(b.nextRunAt || b.scheduledAt).getTime(),
    )[0];
  }, [scheduledScans]);

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    ALL_CATEGORIES.forEach((c) => {
      m[c] = cookiesByCategory[c]?.length ?? 0;
    });
    return m;
  }, [cookiesByCategory]);

  const selectedCookies = cookiesByCategory[selectedCategory] || [];
  const cookieTotalPages = Math.ceil(selectedCookies.length / COOKIE_PAGE_SIZE);
  const pagedCookies = selectedCookies.slice((cookiePage - 1) * COOKIE_PAGE_SIZE, cookiePage * COOKIE_PAGE_SIZE);
  const siteLabel = useMemo(() => {
    const list = Array.isArray(sites) ? sites : [];
    const site = list.find((s: any) => String(s?.id) === String(siteId));
    return String(site?.name || site?.domain || "this site");
  }, [siteId, sites]);

  const handleScanNow = async () => {
    if (!siteId || scanning) return;
    setScanning(true);
    setError(null);
    try {
      const result = await scanSiteNow(siteId);

      if (result.scanning) {
        // Background scan started — poll every 4s until scan history entry is no longer pending
        const poll = setInterval(async () => {
          try {
            const historyData = await getScanHistory(siteId);
            const latest = (historyData.scans || [])[0];
            if (!latest || String(latest.scanStatus).toLowerCase() !== 'pending') {
              clearInterval(poll);
              await loadData(false);
              void refresh({ showLoading: false });
              setScanning(false);
            }
          } catch { /* keep polling on error */ }
        }, 4000);
        // Safety stop after 2 minutes
        setTimeout(() => {
          clearInterval(poll);
          setScanning(false);
        }, 2 * 60 * 1000);
      } else {
        await loadData(false);
        void refresh({ showLoading: false });
        setScanning(false);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed');
      setScanning(false);
    }
  };

  const handleCancelSchedule = async (id: string) => {
    try {
      await deleteScheduledScan(id);
      setScheduledScans((prev) => prev.filter((s) => s.id !== id));
      void refresh({ showLoading: false });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to cancel schedule');
    }
  };

  const resetCustomCookieForm = () => {
    setCustomCookieForm({
      name: '',
      domain: '',
      duration: '',
      scriptUrlPattern: '',
      description: '',
      category: selectedCategory || 'necessary',
    });
  };

  const openAddCookie = () => {
    resetCustomCookieForm();
    setShowAddCookie(true);
  };

  const handleSaveCustomCookie = async () => {
    if (!siteId) return;
    if (!customCookieForm.name.trim() || !customCookieForm.domain.trim()) {
      setError('Cookie ID and Domain are required.');
      return;
    }
    setError(null);
    setSavingCustomCookie(true);
    try {
      await addCustomCookieRule({
        siteId,
        name: customCookieForm.name.trim(),
        domain: customCookieForm.domain.trim(),
        category: customCookieForm.category,
        duration: customCookieForm.duration.trim() || undefined,
        scriptUrlPattern: customCookieForm.scriptUrlPattern.trim() || undefined,
        description: customCookieForm.description.trim() || undefined,
      });
      setShowAddCookie(false);
      setCustomCookieForm({ name: '', domain: '', duration: '', scriptUrlPattern: '', description: '', category: 'necessary' });
      // Refresh rules list only (lightweight)
      const rulesData = await getCustomCookieRules(siteId).catch(() => ({ rules: [] as CustomCookieRule[] }));
      setCustomRules(rulesData.rules || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save rule');
    } finally {
      setSavingCustomCookie(false);
    }
  };

  const handlePublishRules = async () => {
    if (!siteId) return;
    setPublishingRules(true);
    setError(null);
    try {
      await publishCustomCookieRules(siteId);
      // Refresh all data so cookie list reflects newly published rules on next scan
      await loadData(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to publish rules');
    } finally {
      setPublishingRules(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    setDeletingRuleId(id);
    setError(null);
    try {
      await deleteCustomCookieRule(id);
      setCustomRules((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete rule');
    } finally {
      setDeletingRuleId(null);
    }
  };

  const statusBadge = (status: string) => {
    const ok = String(status).toLowerCase() === 'completed';
    return (
      <div
        className={`inline-flex h-[19px] items-center gap-1 rounded-full px-2 py-0.5 ${
          ok ? 'bg-[#b6f5cf]' : 'bg-slate-200'
        }`}
      >
        <div className={`h-[5px] w-[5px] rounded-full ${ok ? 'bg-[#118a41]' : 'bg-slate-500'}`} />
        <span
          className={`font-['DM_Sans'] text-[10px] font-medium tracking-tight ${ok ? 'text-[#118a41]' : 'text-slate-600'}`}
          style={dm}
        >
          {ok ? 'Completed' : status || 'Unknown'}
        </span>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1194px] bg-white p-0">
      {scanning && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>
            Scanning <strong>{siteLabel}</strong> — headless Chrome is collecting all cookies from every domain. Dashboard updates automatically when done.
          </span>
        </div>
      )}
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="mb-7 grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between rounded-lg bg-[#e6f1fd] p-4.5">
          <div>
            <h3 className="mb-1 font-['DM_Sans'] text-base font-semibold leading-5 text-black" style={dm}>
              Last successful scan
            </h3>
            <p className="font-['DM_Sans'] text-base font-normal text-[#4b5563]" style={dm}>
              {loading ? 'Loading…' : lastSuccessfulScan ? formatDateUtc(lastSuccessfulScan.createdAt) : 'No scans yet'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleScanNow}
            disabled={scanning}
            className="h-10 rounded-lg bg-[#007aff] px-8 font-['DM_Sans'] text-[15px] font-normal leading-5 text-white transition-colors hover:bg-[#0066d6] disabled:cursor-not-allowed disabled:opacity-60"
            style={dm}
          >
            {scanning ? 'Scanning…' : 'Scan Now'}
          </button>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-[#e6f1fd] p-4.5">
          <div>
            <h3 className="mb-1 font-['DM_Sans'] text-base font-semibold leading-5 text-black" style={dm}>
              Next scan
            </h3>
            {nextScheduledScan ? (
              <div>
                <p className="font-['DM_Sans'] text-base font-normal text-[#4b5563]" style={dm}>
                  {formatDateUtc(nextScheduledScan.nextRunAt || nextScheduledScan.scheduledAt)}
                </p>
                <p className="mt-0.5 font-['DM_Sans'] text-xs text-[#4b5563]" style={dm}>
                  {nextScheduledScan.frequency}
                  {' · '}
                  <button
                    type="button"
                    className="text-[#007aff] underline hover:text-[#0066d6]"
                    onClick={() => handleCancelSchedule(nextScheduledScan.id)}
                  >
                    Cancel
                  </button>
                </p>
              </div>
            ) : (
              <p className="font-['DM_Sans'] text-base font-normal text-[#4b5563]" style={dm}>
                Not scheduled
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowSchedule(true)}
            className="h-10 rounded-lg bg-[#007aff] px-4 font-['DM_Sans'] text-[15px] font-normal leading-5 text-white transition-colors hover:bg-[#0066d6]"
            style={dm}
          >
            Schedule Scan
          </button>
        </div>
      </div>

      <div className="mb-[36px] border-b border-black/10 pb-[27px]">
        <div className="mb-4.5 flex items-center justify-between border-b border-[#000000]/10 pb-6.5">
          <h2 className="font-['DM_Sans'] text-[25px] font-semibold tracking-tight text-black" style={dm}>
            Cookie List
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openAddCookie}
              className="flex h-[42px] items-center gap-2 rounded-[11px] border border-[#007aff] px-4 font-['DM_Sans'] text-sm font-normal text-[#007aff] transition-colors hover:bg-blue-50"
              style={dm}
            >
              <span>Add Cookie</span>
              <svg className="h-2 w-2" fill="none" viewBox="0 0 8 8" aria-hidden>
                <path d={ICON_PLUS} fill="#007AFF" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => void handlePublishRules()}
              disabled={publishingRules || !hasDraftRules}
              className="h-[42px] rounded-[11px] border-2  bg-[#2ec04f]  border-2 border-white outline-1 outline-[#2ec04f] px-[11px] font-['DM_Sans'] text-sm font-medium text-white transition-colors hover:bg-[#26a342] disabled:opacity-50 disabled:cursor-not-allowed"
              style={dm}
            >
              {publishingRules ? 'Publishing…' : 'Publish Changes'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[261px_1fr] gap-[28px]">
          <div className="space-y-1">
            {ALL_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] ?? 0;
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full rounded-2xl py-[17px] px-3 text-left ${
                    active ? 'bg-[#f1f5f9]' : 'bg-transparent'
                  }`}
                >
                  <p
                    className={`font-['DM_Sans'] text-base ${active ? 'font-medium text-black' : 'font-normal text-[#111827]'}`}
                    style={dm}
                  >
                    {CATEGORY_LABELS[cat] ?? cat} ({count} Cookie{count !== 1 ? 's' : ''})
                  </p>
                </button>
              );
            })}
          </div>

          <div>
            <h3 className="mb-2 font-['DM_Sans'] text-base font-semibold leading-5 text-black" style={dm}>
              {CATEGORY_LABELS[selectedCategory] ?? selectedCategory}
            </h3>
            <p className="font-['DM_Sans'] text-sm font-normal leading-normal text-[#4b5563]" style={dm}>
              {CATEGORY_DESCRIPTIONS[selectedCategory] ?? 'No description available.'}
            </p>
            {selectedCookies.length > 0 ? (
              <>
              <div className="mt-3 overflow-x-auto rounded-lg border border-[#e5e7eb]">
                <table className="w-full text-left font-['DM_Sans'] text-xs" style={dm}>
                  <thead>
                    <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                      <th className="px-3 py-2 font-semibold text-[#374151]">Name</th>
                      <th className="px-3 py-2 font-semibold text-[#374151]">Provider</th>
                      <th className="px-3 py-2 font-semibold text-[#374151]">Domain</th>
                      <th className="px-3 py-2 font-semibold text-[#374151]">Duration</th>
                      <th className="px-3 py-2 font-semibold text-[#374151]">Source</th>
                      <th className="px-3 py-2 font-semibold text-[#374151]">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCookies.map((c, i) => (
                      <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f9fafb]'}>
                        <td className="px-3 py-2 font-semibold text-black">
                          <div className="flex items-center gap-1">
                            {c.name}
                            {String(c.source || '').startsWith('user-rule:') && (
                              <span className="inline-flex h-4 items-center rounded-full bg-[#e6f1fd] px-1.5 text-[10px] font-medium text-[#007aff]">
                                Custom
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[#4b5563]">{c.provider ?? '—'}</td>
                        <td className="px-3 py-2 text-[#4b5563]">{c.domain || '—'}</td>
                        <td className="px-3 py-2 text-[#4b5563]">{formatCookieDuration(c.expires)}</td>
                        <td className="px-3 py-2 text-[#4b5563]">{c.source ?? '—'}</td>
                        <td className="px-3 py-2 text-[#4b5563]">{c.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {cookieTotalPages > 1 && (
                <div className="mt-2 flex items-center justify-between font-['DM_Sans'] text-xs text-[#64748b]" style={dm}>
                  <span>
                    Showing {(cookiePage - 1) * COOKIE_PAGE_SIZE + 1}–{Math.min(cookiePage * COOKIE_PAGE_SIZE, selectedCookies.length)} of {selectedCookies.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCookiePage((p) => Math.max(1, p - 1))} disabled={cookiePage === 1} className="rounded px-2 py-1 disabled:opacity-40 hover:bg-[#f1f5f9]">‹</button>
                    {Array.from({ length: cookieTotalPages }, (_, i) => i + 1).map((p) => (
                      <button key={p} onClick={() => setCookiePage(p)} className={`rounded px-2 py-1 ${p === cookiePage ? 'bg-[#007aff] text-white' : 'hover:bg-[#f1f5f9]'}`}>{p}</button>
                    ))}
                    <button onClick={() => setCookiePage((p) => Math.min(cookieTotalPages, p + 1))} disabled={cookiePage === cookieTotalPages} className="rounded px-2 py-1 disabled:opacity-40 hover:bg-[#f1f5f9]">›</button>
                  </div>
                </div>
              )}
              </>
            ) : (
              <div className="mt-3">
                <p className="font-['DM_Sans'] text-xs text-[#64748b]" style={dm}>
                  No cookies in this category. Run a scan to discover cookies.
                </p>
                <button
                  type="button"
                  onClick={openAddCookie}
                  className="mt-2 font-['DM_Sans'] text-xs font-medium text-[#007aff] hover:text-[#0066d6] hover:underline"
                  style={dm}
                >
                  + Add Cookie
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Scan History / My Cookie Rules tabs ─────────────────────────── */}
      <div className="pb-10">
        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-[#e5e7eb] mb-5">
          <button
            type="button"
            onClick={() => setBottomTab('history')}
            className={`relative px-4 pb-3 pt-1 font-['DM_Sans'] text-sm font-medium transition-colors ${
              bottomTab === 'history'
                ? 'text-[#007aff] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#007aff] after:rounded-t-full'
                : 'text-[#6b7280] hover:text-[#374151]'
            }`}
            style={dm}
          >
            Scan History
          </button>
          <button
            type="button"
            onClick={() => setBottomTab('rules')}
            className={`relative px-4 pb-3 pt-1 font-['DM_Sans'] text-sm font-medium transition-colors ${
              bottomTab === 'rules'
                ? 'text-[#007aff] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#007aff] after:rounded-t-full'
                : 'text-[#6b7280] hover:text-[#374151]'
            }`}
            style={dm}
          >
            My Cookie Rules
            {hasDraftRules && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white">
                {customRules.filter((r) => r.published === 0).length}
              </span>
            )}
          </button>
        </div>

        {/* Scan History panel */}
        {bottomTab === 'history' && (
          <>
            {!loading && scanHistory.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <p className="font-['DM_Sans'] text-sm text-[#4b5563]" style={dm}>
                  No scan history yet. Run your first scan to discover cookies.
                </p>
                <button
                  type="button"
                  onClick={handleScanNow}
                  disabled={scanning}
                  className="rounded-lg bg-[#007aff] px-5 py-2 font-['DM_Sans'] text-sm font-medium text-white hover:bg-[#0066d6] disabled:opacity-50"
                  style={dm}
                >
                  {scanning ? 'Scanning…' : 'Scan Now'}
                </button>
              </div>
            ) : (
              <div className="w-full rounded-[5px] border border-[#9fbce4] overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_2fr] items-center h-[40px] bg-[#f2f7ff] px-4 gap-3">
                  {['Scan Date (UTC)', 'Status', 'URLs', 'Categories', 'Cookies', 'Scripts', 'URL'].map((label) => (
                    <div key={label} className="font-['DM_Sans'] text-xs font-semibold text-[#0a091f]" style={dm}>{label}</div>
                  ))}
                </div>
                {loading ? (
                  <div className="px-4 py-6 font-['DM_Sans'] text-sm text-[#4b5563]" style={dm}>Loading history…</div>
                ) : (
                  scanHistory
                    .slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE)
                    .map((row, i) => (
                      <div
                        key={row.id}
                        className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_2fr] items-center h-[44px] px-4 gap-3 ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}
                      >
                        <div className="font-['DM_Sans'] text-xs text-[#0a091f] truncate" style={dm}>{formatTableDate(row.createdAt)}</div>
                        <div>{statusBadge(row.scanStatus)}</div>
                        <div className="font-['DM_Sans'] text-xs text-[#0a091f]" style={dm}>{row.scanUrl ? '1' : '—'}</div>
                        <div className="font-['DM_Sans'] text-xs text-[#0a091f]" style={dm}>—</div>
                        <div className="font-['DM_Sans'] text-xs text-[#0a091f]" style={dm}>{row.cookiesFound ?? '—'}</div>
                        <div className="font-['DM_Sans'] text-xs text-[#0a091f]" style={dm}>{row.scriptsFound ?? '—'}</div>
                        <div className="font-['DM_Sans'] text-xs text-[#007aff] truncate" style={dm} title={row.scanUrl ?? ''}>{row.scanUrl || '—'}</div>
                      </div>
                    ))
                )}
                {/* Pagination */}
                {scanHistory.length > HISTORY_PAGE_SIZE && (
                  <div className="flex items-center justify-between border-t border-[#e5e7eb] px-4 py-3 bg-white">
                    <span className="font-['DM_Sans'] text-xs text-[#6b7280]" style={dm}>
                      Showing {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(historyPage * HISTORY_PAGE_SIZE, scanHistory.length)} of {scanHistory.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                        className="h-7 w-7 rounded border border-[#e5e7eb] font-['DM_Sans'] text-xs text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40"
                        style={dm}
                      >
                        ‹
                      </button>
                      {Array.from({ length: Math.ceil(scanHistory.length / HISTORY_PAGE_SIZE) }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setHistoryPage(p)}
                          className={`h-7 w-7 rounded border font-['DM_Sans'] text-xs transition-colors ${
                            p === historyPage
                              ? 'border-[#007aff] bg-[#007aff] text-white'
                              : 'border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'
                          }`}
                          style={dm}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setHistoryPage((p) => Math.min(Math.ceil(scanHistory.length / HISTORY_PAGE_SIZE), p + 1))}
                        disabled={historyPage === Math.ceil(scanHistory.length / HISTORY_PAGE_SIZE)}
                        className="h-7 w-7 rounded border border-[#e5e7eb] font-['DM_Sans'] text-xs text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40"
                        style={dm}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* My Cookie Rules panel */}
        {bottomTab === 'rules' && (
          <>
            <p className="mb-4 font-['DM_Sans'] text-xs text-[#6b7280]" style={dm}>
              Rules are applied during scanning to override cookie categories. Publish drafts to activate them.
            </p>
            {customRules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#cbd5e1] py-8 text-center">
                <p className="font-['DM_Sans'] text-sm text-[#6b7280]" style={dm}>
                  No custom rules yet.{' '}
                  <button type="button" onClick={openAddCookie} className="text-[#007aff] hover:underline" style={dm}>
                    Add one
                  </button>{' '}
                  to categorise cookies during scans. 
                </p>
              </div>
            ) : (
              <div className="w-full overflow-hidden rounded-[5px] border border-[#9fbce4]">
                <div className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_auto] items-center h-[40px] bg-[#f2f7ff] px-4 gap-3">
                  {['Cookie ID', 'Domain (Provider)', 'Category', 'Duration', 'Script Pattern', ''].map((h) => (
                    <div key={h} className="font-['DM_Sans'] text-xs font-semibold text-[#0a091f]" style={dm}>{h}</div>
                  ))}
                </div>
                {customRules.map((rule, i) => (
                  <div
                    key={rule.id}
                    className={`grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_auto] items-center min-h-[44px] px-4 gap-3 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-['DM_Sans'] text-xs font-medium text-[#0a091f] truncate" style={dm}>{rule.name}</span>
                      {rule.published === 0 && (
                        <span className="shrink-0 inline-flex h-4 items-center rounded-full bg-orange-100 px-1.5 text-[9px] font-semibold text-orange-600 uppercase tracking-wide">
                          draft
                        </span>
                      )}
                    </div>
                    <span className="font-['DM_Sans'] text-xs text-[#0a091f] truncate" style={dm}>{rule.domain}</span>
                    <span className="font-['DM_Sans'] text-xs text-[#0a091f] capitalize" style={dm}>{rule.category}</span>
                    <span className="font-['DM_Sans'] text-xs text-[#6b7280]" style={dm}>{rule.duration || '—'}</span>
                    <span className="font-['DM_Sans'] text-[11px] text-[#6b7280] truncate" style={dm} title={rule.scriptUrlPattern ?? ''}>{rule.scriptUrlPattern || '—'}</span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteRule(rule.id)}
                      disabled={deletingRuleId === rule.id}
                      className="shrink-0 rounded-md px-2 py-1 font-['DM_Sans'] text-[11px] text-[#ef4444] hover:bg-red-50 disabled:opacity-40"
                      style={dm}
                    >
                      {deletingRuleId === rule.id ? '…' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ScheduleScanModal
        isOpen={showSchedule}
        onClose={() => setShowSchedule(false)}
        siteId={siteId}
        onScheduled={() => {
          void getScheduledScans(siteId).then((d) => setScheduledScans(d.scheduledScans || []));
          void refresh({ showLoading: false });
        }}
      />

      {showAddCookie ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-[760px] rounded-[12px] bg-white p-6">
            <h3 className="mb-5 text-2xl font-semibold text-black" style={dm}>Add Cookie</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-['DM_Sans'] text-xs font-medium text-[#374151]" style={dm}>
                  Cookie ID <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  value={customCookieForm.name}
                  onChange={(e) => setCustomCookieForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. _ga"
                  className="h-11 rounded-md border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#007aff]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-['DM_Sans'] text-xs font-medium text-[#374151]" style={dm}>
                  Domain <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  value={customCookieForm.domain}
                  onChange={(e) => setCustomCookieForm((s) => ({ ...s, domain: e.target.value }))}
                  placeholder="e.g. google.com"
                  className="h-11 rounded-md border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#007aff]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-['DM_Sans'] text-xs font-medium text-[#374151]" style={dm}>
                  Duration <span className="text-[#9ca3af] font-normal">(optional)</span>
                </label>
                <input
                  value={customCookieForm.duration}
                  onChange={(e) => setCustomCookieForm((s) => ({ ...s, duration: e.target.value }))}
                  placeholder="e.g. 1 year"
                  className="h-11 rounded-md border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#007aff]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-['DM_Sans'] text-xs font-medium text-[#374151]" style={dm}>
                  Category
                </label>
                <select
                  value={customCookieForm.category}
                  onChange={(e) => setCustomCookieForm((s) => ({ ...s, category: e.target.value }))}
                  className="h-11 rounded-md border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#007aff]"
                >
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat] ?? cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-1">
              <label className="font-['DM_Sans'] text-xs font-medium text-[#374151]" style={dm}>
                Script URL Pattern <span className="text-[#9ca3af] font-normal">(optional — match scripts that set this cookie)</span>
              </label>
              <input
                value={customCookieForm.scriptUrlPattern}
                onChange={(e) => setCustomCookieForm((s) => ({ ...s, scriptUrlPattern: e.target.value }))}
                placeholder="e.g. google-analytics.com/analytics.js"
                className="h-11 w-full rounded-md border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#007aff]"
              />
            </div>
            <div className="mt-3 flex flex-col gap-1">
              <label className="font-['DM_Sans'] text-xs font-medium text-[#374151]" style={dm}>
                Description <span className="text-[#9ca3af] font-normal">(optional)</span>
              </label>
              <textarea
                value={customCookieForm.description}
                onChange={(e) => setCustomCookieForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="What does this cookie do?"
                rows={4}
                className="w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-sm outline-none focus:border-[#007aff]"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddCookie(false)}
                className="h-10 rounded-md border border-[#cbd5e1] px-6 text-sm text-[#1f2937]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveCustomCookie()}
                disabled={savingCustomCookie}
                className="h-10 rounded-md bg-[#007aff] px-6 text-sm text-white disabled:opacity-60"
              >
                {savingCustomCookie ? 'Saving...' : 'Save draft'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
