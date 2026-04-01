'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { UpgradePlanModal } from '../../components/UpgradePlanModal';

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

/** Wall-clock in the user’s browser timezone (for scan times chosen in the schedule UI). */
function formatLocalDateTime(dateString: string) {
  try {
    const d = new Date(dateString);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    });
  } catch {
    return dateString;
  }
}

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
  const router = useRouter();
  const { refresh, sites, effectivePlanId, activeOrganizationId, loading: sessionLoading, authenticated } =
    useDashboardSession();
  const siteList = useMemo(() => (Array.isArray(sites) ? sites : []), [sites]);
  const siteKnown = useMemo(
    () => siteList.some((s: any) => String(s?.id) === String(siteId)),
    [siteList, siteId],
  );
  const sitesRef = useRef(siteList);
  sitesRef.current = siteList;
  const [scanHistory, setScanHistory] = useState<ScanHistoryRow[]>([]);
  const [cookiesByCategory, setCookiesByCategory] = useState<Record<string, ScanCookie[]>>({});
  const [scheduledScans, setScheduledScans] = useState<ScheduledScan[]>([]);
  const [customRules, setCustomRules] = useState<CustomCookieRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Validation / save errors for the Add Cookie modal only (not the page banner). */
  const [addCookieError, setAddCookieError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanningRef = useRef(false); // ref guard prevents double-invocation from stale closure

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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  /** No sites on account, or URL site id not in session — show dialog instead of a page error strip. */
  const [showNoSiteModal, setShowNoSiteModal] = useState(false);
  const [scanLimitReached, setScanLimitReached] = useState(false);
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
      const rawHistory = historyData.scans || [];
      // Deduplicate by id — prevent duplicate rows if backend returns the same scan twice
      const history = rawHistory.filter((s, i, a) => a.findIndex((x) => String(x.id) === String(s.id)) === i);
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
      const msg = e instanceof Error ? e.message : 'Failed to load scan data';
      const list = Array.isArray(sitesRef.current) ? sitesRef.current : [];
      const ok = list.some((s: any) => String(s?.id) === String(siteId));
      if (list.length === 0 || !ok) {
        setShowNoSiteModal(true);
      } else {
        setError(msg);
      }
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

  useEffect(() => {
    if (sessionLoading || !authenticated) return;
    const list = Array.isArray(sites) ? sites : [];
    const ok = list.some((s: any) => String(s?.id) === String(siteId));
    if (list.length === 0 || !ok) {
      setShowNoSiteModal(true);
    } else {
      setShowNoSiteModal(false);
    }
  }, [sessionLoading, authenticated, sites, siteId]);

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
    if (!siteId || scanningRef.current) return;
    if (!sessionLoading && authenticated && (siteList.length === 0 || !siteKnown)) {
      setShowNoSiteModal(true);
      return;
    }
    scanningRef.current = true;
    setScanning(true);
    setError(null);
    try {
      const result = await scanSiteNow(siteId);
      const targetId = result.scanHistoryId ? String(result.scanHistoryId) : null;

      if (result.scanning) {
        // Background scan started — poll every 4s for the specific scanHistoryId
        const poll = setInterval(async () => {
          try {
            const historyData = await getScanHistory(siteId);
            const scans = historyData.scans || [];
            // Find the specific scan we triggered, or fall back to the latest
            const target = targetId
              ? scans.find((s) => String(s.id) === targetId)
              : scans[0];
            const status = String(target?.scanStatus ?? '').toLowerCase();
            // Keep polling if target not yet visible in DB, or still pending
            if (target && status !== 'pending' && status !== '') {
              clearInterval(poll);
              // Replace history with deduplicated fresh data
              const unique = scans.filter((s, i, a) => a.findIndex((x) => String(x.id) === String(s.id)) === i);
              setScanHistory(unique);
              setHistoryPage(1);
              await loadData(false);
              void refresh({ showLoading: false });
              scanningRef.current = false;
              setScanning(false);
            }
          } catch { /* keep polling on error */ }
        }, 4000);
        // Safety stop after 2 minutes
        setTimeout(() => {
          clearInterval(poll);
          scanningRef.current = false;
          setScanning(false);
        }, 2 * 60 * 1000);
      } else {
        await loadData(false);
        void refresh({ showLoading: false });
        scanningRef.current = false;
        setScanning(false);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Scan failed';
      if (msg.toLowerCase().includes('scan limit') || msg.toLowerCase().includes('limit reached')) {
        setScanLimitReached(true);
      } else {
        setError(msg);
      }
      scanningRef.current = false;
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
    setAddCookieError(null);
    setShowAddCookie(true);
  };

  const handleSaveCustomCookie = async () => {
    if (!siteId) return;
    if (!customCookieForm.name.trim() || !customCookieForm.domain.trim()) {
      setAddCookieError('Cookie ID and Domain are required.');
      return;
    }
    setAddCookieError(null);
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
      setAddCookieError(null);
      setCustomCookieForm({ name: '', domain: '', duration: '', scriptUrlPattern: '', description: '', category: 'necessary' });
      // Refresh rules list only (lightweight)
      const rulesData = await getCustomCookieRules(siteId).catch(() => ({ rules: [] as CustomCookieRule[] }));
      setCustomRules(rulesData.rules || []);
    } catch (e: unknown) {
      setAddCookieError(e instanceof Error ? e.message : 'Failed to save rule');
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
      {showUpgradeModal && (
        <UpgradePlanModal
          currentPlanId={effectivePlanId}
          organizationId={activeOrganizationId ?? null}
          siteId={siteId}
          reason="scan"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      {showNoSiteModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            role="alertdialog"
            aria-labelledby="no-site-title"
            aria-describedby="no-site-desc"
          >
            <h2 id="no-site-title" className="font-['DM_Sans'] text-lg font-semibold text-[#0a091f]" style={dm}>
              {siteList.length === 0 ? 'Add a site first' : 'Site not available'}
            </h2>
            <p id="no-site-desc" className="mt-3 font-['DM_Sans'] text-sm leading-relaxed text-[#4b5563]" style={dm}>
              {siteList.length === 0
                ? 'You need to add a website to your account before you can run cookie scans.'
                : 'This scan page does not match any site in your account. Open a site from the dashboard or add a new site.'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNoSiteModal(false)}
                className="rounded-lg border border-[#e5e7eb] px-4 py-2 font-['DM_Sans'] text-sm text-[#374151] hover:bg-[#f9fafb]"
                style={dm}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNoSiteModal(false);
                  router.push('/dashboard');
                }}
                className="rounded-lg bg-[#007aff] px-4 py-2 font-['DM_Sans'] text-sm font-medium text-white hover:bg-[#0066d6]"
                style={dm}
              >
                Go to dashboard
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Scanning overlay popup */}
      {scanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex w-[340px] flex-col items-center gap-5 rounded-2xl bg-white px-8 py-10 shadow-2xl">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <svg className="absolute inset-0 h-full w-full animate-spin" viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="24" stroke="#e6f1fd" strokeWidth="5" />
                <path d="M28 4a24 24 0 0 1 24 24" stroke="#007aff" strokeWidth="5" strokeLinecap="round" />
              </svg>
              <svg className="h-7 w-7 text-[#007aff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-['DM_Sans'] text-base font-semibold text-[#0a091f]">Scanning in progress</p>
              <p className="mt-1 font-['DM_Sans'] text-sm text-[#6b7280]">
                Collecting cookies from <strong>{siteLabel}</strong>.<br />This may take up to a minute.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && !showNoSiteModal ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="mb-7 grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between rounded-lg bg-[#e6f1fd] p-4.5">
          <div>
            <h3 className="mb-1 font-['DM_Sans'] text-base font-semibold leading-5 text-black" style={dm}>
              Last successful scan
            </h3>
            <p className="font-['DM_Sans'] text-base font-normal text-[#4b5563]" style={dm}>
              {loading ? 'Loading…' : lastSuccessfulScan ? formatLocalDateTime(lastSuccessfulScan.createdAt) : 'No scans yet'}
            </p>
          </div>
          {scanLimitReached ? (
            <div className="flex flex-col items-end gap-1">
              <span className="font-['DM_Sans'] text-xs font-medium text-[#f59e0b]" style={dm}>
                Monthly scan limit reached
              </span>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="h-10 rounded-lg bg-[#f59e0b] px-5 font-['DM_Sans'] text-[15px] font-normal leading-5 text-white transition-colors hover:bg-[#d97706]"
                style={dm}
              >
                Upgrade Plan
              </button>
            </div>
          ) : (
            <button
              id="cookie-scan-primary-cta"
              type="button"
              onClick={handleScanNow}
              disabled={scanning || showNoSiteModal}
              className="h-10 rounded-lg bg-[#007aff] px-8 font-['DM_Sans'] text-[15px] font-normal leading-5 text-white transition-colors hover:bg-[#0066d6] disabled:cursor-not-allowed disabled:opacity-60"
              style={dm}
            >
              {scanning ? 'Scanning…' : 'Scan Now'}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-[#e6f1fd] p-4.5">
          <div>
            <h3 className="mb-1 font-['DM_Sans'] text-base font-semibold leading-5 text-black" style={dm}>
              Next scan
            </h3>
            {nextScheduledScan ? (
              <div>
                <p className="font-['DM_Sans'] text-base font-normal text-[#4b5563]" style={dm}>
                  {formatLocalDateTime(nextScheduledScan.nextRunAt || nextScheduledScan.scheduledAt)}
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
            disabled={showNoSiteModal}
            className="h-10 rounded-lg bg-[#007aff] px-4 font-['DM_Sans'] text-[15px] font-normal leading-5 text-white transition-colors hover:bg-[#0066d6] disabled:cursor-not-allowed disabled:opacity-60"
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
            <h3 className="mb-6 text-xl font-['DM_Sans'] text-base font-semibold leading-5 text-black" style={dm}>
              {CATEGORY_LABELS[selectedCategory] ?? selectedCategory}
            </h3>
            <p className="font-['DM_Sans']  font-normal leading-normal text-[#4b5563]" style={dm}>
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
                <p className="font-['DM_Sans'] text-sm text-[#4b5563] text-center max-w-md" style={dm}>
                  No scan history yet. Run your first scan using the{' '}
                  <button
                    type="button"
                    className="font-medium text-[#007aff] underline hover:text-[#0066d6]"
                    onClick={() => document.getElementById('cookie-scan-primary-cta')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  >
                    Scan Now
                  </button>{' '}
                  button at the top of this page
                  {scanLimitReached ? (
                    <>
                      {' '}
                      (or{' '}
                      <button type="button" className="font-medium text-[#f59e0b] underline" onClick={() => setShowUpgradeModal(true)}>
                        upgrade your plan
                      </button>
                      {' '}
                      if you have reached your scan limit).
                    </>
                  ) : (
                    '.'
                  )}
                </p>
              </div>
            ) : (
              <div className="w-full rounded-[5px]  border-[#9fbce4] overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_2fr] items-center py-5 pl-5.75  pr-1 bg-[#f2f7ff]  border-b border-[#9FBCE4]  gap-3">
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
                        className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_2fr] items-center py-5 pl-5.75  pr-1 gap-3  border-b border-[#9FBCE4]`}
                      >
                        <div className="font-['DM_Sans'] text-sm text-[#0a091f] truncate" style={dm}>{formatTableDate(row.createdAt)}</div>
                        <div>{statusBadge(row.scanStatus)}</div>
                        <div className="font-['DM_Sans'] text-xs text-[#0a091f]" style={dm}>{row.scanUrl ? '1' : '—'}</div>
                        <div
                          className="font-['DM_Sans'] text-xs text-[#0a091f] truncate min-w-0"
                          style={dm}
                          title={
                            row.categories?.length
                              ? row.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(', ')
                              : ''
                          }
                        >
                          {row.categories?.length
                            ? row.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(', ')
                            : '—'}
                        </div>
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
              <div className="w-full overflow-hidden rounded-[5px]  border-[#9fbce4]">
                <div className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_auto] items-center py-5 pl-5.75  pr-1   border-b border-[#9FBCE4] gap-3 bg-[#f2f7ff]">
                  {['Cookie ID', 'Domain (Provider)', 'Category', 'Duration', 'Script Pattern', ''].map((h) => (
                    <div key={h} className="font-['DM_Sans'] text-xs font-semibold text-[#0a091f]" style={dm}>{h}</div>
                  ))}
                </div>
                {customRules.map((rule, i) => (
                  <div
                    key={rule.id}
                    className={`grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_auto] items-center  pl-5.75 pr-1 gap-3 py-5  border-b border-[#9FBCE4]`}
                  >
                    <div className=" ">
                      <span className="font-['DM_Sans'] text-sm font-medium text-[#0a091f] truncate" style={dm}>{rule.name}</span>
                      {rule.published === 0 && (
                        <span className="shrink-0 inline-flex h-4 items-center rounded-full bg-orange-100 px-1.5 text-[9px] font-semibold text-orange-600 uppercase tracking-wide">
                          draft
                        </span>
                      )}
                    </div>
                    <span className="font-['DM_Sans'] text-sm text-[#0a091f] truncate" style={dm}>{rule.domain}</span>
                    <span className="font-['DM_Sans'] text-sm text-[#0a091f] capitalize" style={dm}>{rule.category}</span>
                    <span className="font-['DM_Sans'] text-sm text-[#6b7280]" style={dm}>{rule.duration || '—'}</span>
                    <span className="font-['DM_Sans'] text-[11px] text-[#6b7280] truncate" style={dm} title={rule.scriptUrlPattern ?? ''}>{rule.scriptUrlPattern || '—'}</span>
                    {/* <button
                      type="button"
                      onClick={() => void handleDeleteRule(rule.id)}
                      disabled={deletingRuleId === rule.id}
                      className="shrink-0 rounded-md px-2 py-1 font-['DM_Sans'] text-[11px] text-[#ef4444] hover:bg-red-50 disabled:opacity-40"
                      style={dm}
                    >
                      {deletingRuleId === rule.id ? '…' : 'Delete'}
                    </button> */}
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
            {addCookieError ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                {addCookieError}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-['DM_Sans'] text-xs font-medium text-[#374151]" style={dm}>
                  Cookie ID <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  value={customCookieForm.name}
                  onChange={(e) => {
                    setAddCookieError(null);
                    setCustomCookieForm((s) => ({ ...s, name: e.target.value }));
                  }}
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
                  onChange={(e) => {
                    setAddCookieError(null);
                    setCustomCookieForm((s) => ({ ...s, domain: e.target.value }));
                  }}
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
                onClick={() => {
                  setShowAddCookie(false);
                  setAddCookieError(null);
                }}
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
