'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addCustomCookie,
  deleteScheduledScan,
  getScanHistory,
  getScheduledScans,
  getSiteCookies,
  scanSiteNow,
  type ScanCookie,
  type ScanHistoryRow,
  type ScheduledScan,
} from '@/lib/client-api';
import { ScheduleScanModal } from './ScheduleScanModal';
import LoadingPopup from './component/LoadingPopup';
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

export function CookieScanDashboard({ siteId }: { siteId: string }) {
  const { refresh, sites } = useDashboardSession();
  const [scanHistory, setScanHistory] = useState<ScanHistoryRow[]>([]);
  const [cookiesByCategory, setCookiesByCategory] = useState<Record<string, ScanCookie[]>>({});
  const [scheduledScans, setScheduledScans] = useState<ScheduledScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('necessary');
  const [showAddCookie, setShowAddCookie] = useState(false);
  const [savingCustomCookie, setSavingCustomCookie] = useState(false);
  const [customCookieForm, setCustomCookieForm] = useState({
    name: '',
    domain: '',
    duration: '',
    scriptUrlPattern: '',
    description: '',
    category: 'necessary',
  });

  const loadData = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setError(null);
    try {
      const [historyData, cookiesData, scheduledData] = await Promise.all([
        getScanHistory(siteId),
        getSiteCookies(siteId),
        getScheduledScans(siteId).catch(() => ({ success: true as const, scheduledScans: [] as ScheduledScan[] })),
      ]);
      setScanHistory(historyData.scans || []);
      const byCat = cookiesData.cookiesByCategory || {};
      setCookiesByCategory(byCat);
      setScheduledScans(scheduledData.scheduledScans || []);

      const firstWithCookies = ALL_CATEGORIES.find((c) => (byCat[c]?.length ?? 0) > 0);
      setSelectedCategory(firstWithCookies ?? 'necessary');
    } catch (e: unknown) {
      console.error('[CookieScanDashboard]', e);
      setError(e instanceof Error ? e.message : 'Failed to load scan data');
      setScanHistory([]);
      setCookiesByCategory({});
      setScheduledScans([]);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      await scanSiteNow(siteId);
      await loadData();
      void refresh({ showLoading: false });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
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
    if (!customCookieForm.name.trim() || !customCookieForm.domain.trim() || !customCookieForm.description.trim()) {
      setError('Cookie ID, Domain and Description are required.');
      return;
    }
    setError(null);
    setSavingCustomCookie(true);
    try {
      await addCustomCookie({
        siteId,
        name: customCookieForm.name.trim(),
        domain: customCookieForm.domain.trim(),
        category: customCookieForm.category,
        duration: customCookieForm.duration.trim(),
        scriptUrlPattern: customCookieForm.scriptUrlPattern.trim(),
        description: customCookieForm.description.trim(),
      });
      setShowAddCookie(false);
      await loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save cookie');
    } finally {
      setSavingCustomCookie(false);
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
     {loading && <LoadingPopup
        show={scanning || loading}
        
        title={"Scanning..."}
        subtitle={
          `Your site "${siteLabel}" is scanning`
        }
      />}
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
            disabled={scanning || loading}
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
              className="h-[42px] rounded-[11px] border-2 border-[rgba(46,192,79,0.1)] bg-[#2ec04f] px-[11px] font-['DM_Sans'] text-sm font-medium text-white transition-colors hover:bg-[#26a342]"
              style={dm}
            >
              Publish Changes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[261px_1fr] gap-[45px]">
          <div className="space-y-[15px]">
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
            <h3 className="mb-[21px] font-['DM_Sans'] text-xl font-semibold leading-5 text-black" style={dm}>
              {CATEGORY_LABELS[selectedCategory] ?? selectedCategory}
            </h3>
            <p className="font-['DM_Sans'] text-base font-normal leading-normal text-[#4b5563]" style={dm}>
              {CATEGORY_DESCRIPTIONS[selectedCategory] ?? 'No description available.'}
            </p>
            {selectedCookies.length > 0 ? (
              <ul className="mt-6 space-y-4">
                {selectedCookies.map((c) => (
                  <li key={c.id} className="rounded-lg border border-[#e5e7eb] p-4">
                    <div className="flex items-center gap-2">
                      <p className="font-['DM_Sans'] text-sm font-semibold text-black" style={dm}>
                        {c.name}
                      </p>
                      {String(c.source || '').startsWith('user-rule:') ? (
                        <span
                          className="inline-flex h-5 items-center rounded-full bg-[#e6f1fd] px-2 text-[11px] font-medium text-[#007aff]"
                          style={dm}
                        >
                          User-defined
                        </span>
                      ) : null}
                    </div>
                    {c.provider ? (
                      <p className="mt-1 font-['DM_Sans'] text-xs text-[#64748b]" style={dm}>
                        Provider: {c.provider}
                      </p>
                    ) : null}
                    <p className="mt-2 font-['DM_Sans'] text-xs text-[#4b5563]" style={dm}>
                      {c.description || 'No description.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 border-t border-[#f1f5f9] pt-3 font-['DM_Sans'] text-xs text-[#64748b]" style={dm}>
                      <span>Domain: {c.domain ?? '—'}</span>
                      <span>Duration: {formatCookieDuration(c.expires)}</span>
                      {c.source ? <span>Source: {c.source}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-6">
                <p className="font-['DM_Sans'] text-sm text-[#64748b]" style={dm}>
                  No cookies in this category. Run a scan to discover cookies.
                </p>
                <button
                  type="button"
                  onClick={openAddCookie}
                  className="mt-4 font-['DM_Sans'] text-sm font-medium text-[#007aff] hover:text-[#0066d6] hover:underline"
                  style={dm}
                >
                  + Add Cookie
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-[18px] font-['DM_Sans'] text-[25px] font-semibold tracking-tight text-black" style={dm}>
          Scan History
        </h2>
        <div className="w-full overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid h-[46px] grid-cols-[260px_140px_160px_140px_140px_140px_1fr] items-center gap-4 rounded-[5px] border-b border-[#9fbce4] bg-[#f2f7ff] px-6">
              {['Scan Date (UTC ± 00:00)', 'Scan Status', 'Urls Scanned', 'Categories', 'Cookies', 'Scripts', ''].map(
                (label) => (
                  <div
                    key={label || 'sp'}
                    className="font-['DM_Sans'] text-sm font-medium tracking-tight text-[#0a091f]"
                    style={dm}
                  >
                    {label}
                  </div>
                ),
              )}
            </div>
            {loading ? (
              <div className="px-6 py-8 font-['DM_Sans'] text-sm text-[#4b5563]" style={dm}>
                Loading history…
              </div>
            ) : scanHistory.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="mb-4 font-['DM_Sans'] text-sm text-[#4b5563]" style={dm}>
                  No scan history yet.
                </p>
                <button
                  type="button"
                  onClick={handleScanNow}
                  disabled={scanning}
                  className="rounded-lg bg-[#007aff] px-4 py-2 font-['DM_Sans'] text-sm text-white hover:bg-[#0066d6] disabled:opacity-50"
                  style={dm}
                >
                  {scanning ? 'Scanning…' : 'Scan Now'}
                </button>
              </div>
            ) : (
              scanHistory.map((row) => (
                <div
                  key={row.id}
                  className="grid h-[50px] grid-cols-[260px_140px_160px_140px_140px_140px_1fr] items-center gap-4 border-b border-[#9fbce4] bg-white px-6"
                >
                  <div className="font-['DM_Sans'] text-sm font-medium tracking-tight text-[#0a091f]" style={dm}>
                    {formatTableDate(row.createdAt)}
                  </div>
                  <div>{statusBadge(row.scanStatus)}</div>
                  <div className="font-['DM_Sans'] text-sm font-normal tracking-tight text-[#0a091f]" style={dm}>
                    {row.scanUrl ? '1' : '—'}
                  </div>
                  <div className="font-['DM_Sans'] text-sm font-normal text-[#0a091f]" style={dm}>
                    —
                  </div>
                  <div className="font-['DM_Sans'] text-sm font-normal text-[#0a091f]" style={dm}>
                    {row.cookiesFound ?? '—'}
                  </div>
                  <div className="font-['DM_Sans'] text-sm font-normal text-[#0a091f]" style={dm}>
                    {row.scriptsFound ?? '—'}
                  </div>
                  <div className="font-['DM_Sans'] text-sm font-medium tracking-tight text-[#007aff]" style={dm}>
                    {row.scanUrl ? (
                      <span className="truncate" title={row.scanUrl}>
                        {row.scanUrl}
                      </span>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
              <input
                value={customCookieForm.name}
                onChange={(e) => setCustomCookieForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Cookie ID"
                className="h-11 rounded-md border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#007aff]"
              />
              <input
                value={customCookieForm.domain}
                onChange={(e) => setCustomCookieForm((s) => ({ ...s, domain: e.target.value }))}
                placeholder="Domain"
                className="h-11 rounded-md border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#007aff]"
              />
              <input
                value={customCookieForm.duration}
                onChange={(e) => setCustomCookieForm((s) => ({ ...s, duration: e.target.value }))}
                placeholder="Duration"
                className="h-11 rounded-md border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#007aff]"
              />
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
            <input
              value={customCookieForm.scriptUrlPattern}
              onChange={(e) => setCustomCookieForm((s) => ({ ...s, scriptUrlPattern: e.target.value }))}
              placeholder="Script URL Pattern (optional)"
              className="mt-3 h-11 w-full rounded-md border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#007aff]"
            />
            <textarea
              value={customCookieForm.description}
              onChange={(e) => setCustomCookieForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Description"
              rows={8}
              className="mt-3 w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-sm outline-none focus:border-[#007aff]"
            />
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
