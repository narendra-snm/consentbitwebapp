"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDashboardSession } from '../../DashboardSessionProvider';
import { cancelSubscription, activateLicenseWebflow } from '@/lib/client-api';
import ErrorPopup from '../../components/ErrorPopup';
import LoadingPopup2 from '../../[id]/scan/component/LoadingPopup';

const svgPaths = {
  p10d33ac0: "M6.28298 3.04688L6.06631 6.40354C6.02964 6.92687 5.99964 7.33354 5.06964 7.33354H2.92964C1.99964 7.33354 1.96964 6.92687 1.93298 6.40354L1.71631 3.04688",
  p1b386300: "M3.27284 4.43681L3.20872 1.75H3.78582L3.72704 4.43681H3.27284ZM3.50261 5.6C3.39931 5.6 3.31381 5.56723 3.24613 5.5017C3.182 5.43253 3.14994 5.35061 3.14994 5.25596C3.14994 5.15766 3.182 5.07574 3.24613 5.01021C3.31381 4.94104 3.39931 4.90645 3.50261 4.90645C3.60236 4.90645 3.68429 4.94104 3.74842 5.01021C3.8161 5.07574 3.84994 5.15766 3.84994 5.25596C3.84994 5.35061 3.8161 5.43253 3.74842 5.5017C3.68429 5.56723 3.60236 5.6 3.50261 5.6Z",
  p3d8089e4: "M2.83301 1.65699L2.90634 1.22033C2.95967 0.903659 2.99967 0.666992 3.56301 0.666992H4.43634C4.99967 0.666992 5.04301 0.916992 5.09301 1.22366L5.16634 1.65699",
  p478eb80: "M7 1.99382C5.89 1.88382 4.77333 1.82715 3.66 1.82715C3 1.82715 2.34 1.86048 1.68 1.92715L1 1.99382",
};

type DomainStatus = 'Active' | 'Cancelled' | 'Cancelling' | 'Expired' | 'Inactive';
type SortKey = 'domain' | 'status' | 'billing' | 'expiration' | 'created';

interface Domain {
  id: string;
  url: string;
  status: DomainStatus;
  billingPeriod: 'Yearly' | 'Monthly' | null;
  expirationDate: string;
  licenseKey: string | null;
  created: string;
  createdSort: number;
  expirationSort: number;
  subscriptionId: string | null;
  stripeSubscriptionId: string | null;
  isUnassigned: boolean;
}

const StatusBadge = ({ status }: { status: DomainStatus }) => {
  const styles: Record<DomainStatus, { bg: string; text: string; dotColor: string }> = {
    Active:    { bg: 'bg-[#b6f5cf]', text: 'text-[#118a41]', dotColor: '#118A41' },
    Cancelled: { bg: 'bg-[#f5b6b6]', text: 'text-[#8a1111]', dotColor: '#c0392b' },
    Cancelling:{ bg: 'bg-[#FFE5CC]', text: 'text-[#FF6B00]', dotColor: '#FF6B00' },
    Expired:   { bg: 'bg-[#fee2e2]', text: 'text-[#b91c1c]', dotColor: '#b91c1c' },
    Inactive:  { bg: 'bg-[#e5e7eb]', text: 'text-[#6b7280]', dotColor: '#9ca3af' },
  };

  const style = styles[status];

  return (
    <div className={`${style.bg} inline-flex items-center justify-center px-[8px] h-[19px] rounded-[50px] gap-[4px]`}>
      <div className="w-[5px] h-[5px]">
        <svg className="block size-full" viewBox="0 0 5 5" fill="none">
          <circle cx="2.5" cy="2.5" r="2.5" fill={style.dotColor} />
        </svg>
      </div>
      <p className={`${style.text} text-[10px] tracking-[-0.5px] whitespace-nowrap`} style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontVariationSettings: "'opsz' 14" }}>
        {status}
      </p>
      {status === 'Cancelling' && (
        <div className="w-[7px] h-[7px]">
          <svg className="block size-full" viewBox="0 0 7 7" fill="none">
            <circle cx="3.5" cy="3.5" r="3.25" stroke="#9a5000" strokeWidth="0.5" />
            <path d={svgPaths.p1b386300} fill="#9a5000" />
          </svg>
        </div>
      )}
    </div>
  );
};

const ChevronIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);


const ThreeDotMenu = () => (
  <div className="w-[17px] h-[3px] flex items-center justify-center">
    <svg className="block size-full" viewBox="0 0 17 3" fill="none">
      <circle cx="1.5" cy="1.5" r="1.5" fill="#4B5563" />
      <circle cx="8.5" cy="1.5" r="1.5" fill="#4B5563" />
      <circle cx="15.5" cy="1.5" r="1.5" fill="#4B5563" />
    </svg>
  </div>
);

const statusOrder: Record<DomainStatus, number> = { Active: 0, Cancelling: 1, Cancelled: 2, Expired: 3, Inactive: 4 };
const billingOrder: Record<string, number> = { Monthly: 0, Yearly: 1 };

const TABLE_GRID =
  'grid grid-cols-[minmax(160px,1.8fr)_minmax(95px,0.8fr)_minmax(105px,0.8fr)_minmax(105px,0.8fr)_minmax(170px,1.2fr)_minmax(90px,0.7fr)_20px] gap-x-[16px] [&>*:nth-child(6)]:pl-[32px]';

type FilterStatus = 'all' | DomainStatus;
type FilterBilling = 'all' | 'Monthly' | 'Yearly';
type FilterExpiration = 'all' | 'has' | 'na';
type FilterLicenseKey = 'all' | 'assigned' | 'unassigned';

interface FilterChipProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}

function FilterChip({ label, value, options, onChange }: FilterChipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const displayLabel = value === 'all' ? label : (options.find(o => o.value === value)?.label ?? label);
  const isActive = value !== 'all';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
          isActive
            ? 'border-[#2563eb] bg-[#eff6ff] text-[#1d4ed8]'
            : 'border-[#d1d5db] bg-white text-[#374151] hover:bg-[#f9fafb]'
        }`}
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        {displayLabel}
        <ChevronIcon />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-[#e5e7eb] rounded-[8px] shadow-lg z-20 min-w-[130px] py-1">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#f3f4f6] transition-colors ${
                opt.value === value ? 'text-[#2563eb] font-semibold' : 'text-[#374151]'
              }`}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DomainManagementDashboard() {
  const { sites, loading, refresh, updateSiteInState } = useDashboardSession();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const [hydrated, setHydrated] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => { setHydrated(true); setNowMs(Date.now()); }, []);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [showCancelLoading, setShowCancelLoading] = useState(false);

  useEffect(() => {
    if (!cancelSuccess) return;
    const t = setTimeout(() => setCancelSuccess(false), 3000);
    return () => clearTimeout(t);
  }, [cancelSuccess]);
  const [confirmDomain, setConfirmDomain] = useState<Domain | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignStep, setAssignStep] = useState<'input' | 'script'>('input');
  const [assignDomain, setAssignDomain] = useState('');
  const [assignLicenseKey, setAssignLicenseKey] = useState('');
  const [assignWfSiteId, setAssignWfSiteId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainCheck, setDomainCheck] = useState<{ reachable: boolean; hasExistingScript: boolean; wfSiteId: string | null; hasConflict?: boolean } | null>(null);
  const [conflictConfirmed, setConflictConfirmed] = useState(false);
  const [activationResult, setActivationResult] = useState<{ cdnScriptId: string; scriptUrl: string; domain: string; platformSiteId: string | null } | null>(null);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<'found' | 'not-found' | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [filterDomain, setFilterDomain] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterBilling, setFilterBilling] = useState<FilterBilling>('all');
  const [filterExpiration, setFilterExpiration] = useState<FilterExpiration>('all');
  const [filterLicenseKey, setFilterLicenseKey] = useState<FilterLicenseKey>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) { setSortAsc(a => !a); return prev; }
      setSortAsc(true);
      return key;
    });
    setCurrentPage(1);
  }, []);

  const rows = useMemo<Domain[]>(() => {
    const list = Array.isArray(sites) ? sites : [];
    return list.map((site: any) => {
      const createdDate = site?.createdAt ?? site?.created_at;
      const createdTs = createdDate ? new Date(createdDate).getTime() : 0;
      const created = createdDate
        ? new Date(createdDate).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })
        : "Not available";

      const verified = site?.verified === 1 || site?.verified === true;
      const cancelAtPeriodEnd = Number(
        site?.subscriptionCancelAtPeriodEnd ?? site?.subscription_cancel_at_period_end ??
        site?.cancelAtPeriodEnd ?? site?.cancel_at_period_end ?? 0,
      ) === 1;
      const explicitlyCancelled =
        site?._optimisticCancelled === true ||
        site?.status === 'cancelled' ||
        site?.subscriptionStatus === 'canceled' ||
        site?.subscription_status === 'canceled';

      const subscriptionEnd = site?.subscriptionCurrentPeriodEnd ?? site?.subscription_current_period_end ??
        site?.currentPeriodEnd ?? site?.current_period_end ?? site?.nextRenewal ?? site?.next_renewal ?? null;
      const expTs = subscriptionEnd ? new Date(subscriptionEnd).getTime() : 0;
      const periodExpired = nowMs > 0 && expTs > 0 && expTs < nowMs;

      const status: DomainStatus =
        (cancelAtPeriodEnd || explicitlyCancelled) && !periodExpired
          ? 'Cancelling'
          : (cancelAtPeriodEnd || explicitlyCancelled) && periodExpired
            ? 'Expired'
            : !verified
              ? 'Inactive'
              : 'Active';

      const rawInterval = site?.interval ?? site?.billing_interval ?? site?.subscriptionInterval ?? site?.subscription_interval ?? null;
      const rawPlan = site?.planId ?? site?.plan_id ?? site?.subscription_plan ?? site?.plan ?? 'free';
      const planLower = String(rawPlan).toLowerCase();
      const intervalLower = String(rawInterval || '').toLowerCase();
      const billingPeriod: Domain['billingPeriod'] = planLower === 'free' ? null
        : (intervalLower === 'yearly' || intervalLower === 'year') ? 'Yearly' : 'Monthly';

      const expirationDate = subscriptionEnd
        ? new Date(subscriptionEnd).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })
        : "Not available";

      const licenseKey = site?.licenseKey ?? site?.license_key ?? null;

      return {
        id: String(site?.id || ''),
        url: site?._isUnassigned ? 'Not assigned' : String(site?.domain || site?.name || 'Not available'),
        status,
        billingPeriod,
        expirationDate,
        licenseKey: licenseKey ? String(licenseKey) : null,
        created,
        createdSort: createdTs,
        expirationSort: expTs,
        subscriptionId: site?.subscriptionId ? String(site.subscriptionId) : null,
        stripeSubscriptionId: site?.stripeSubscriptionId ? String(site.stripeSubscriptionId) : null,
        isUnassigned: site?._isUnassigned === true,
      };
    });
  }, [sites, nowMs]);

  const hasActiveFilters =
    filterDomain.trim().length > 0 || filterStatus !== 'all' || filterBilling !== 'all' || filterExpiration !== 'all' || filterLicenseKey !== 'all';

  const filteredRows = useMemo(() => {
    const d = filterDomain.trim().toLowerCase();
    return rows.filter(row => {
      if (d && !row.url.toLowerCase().includes(d)) return false;
      if (filterStatus !== 'all' && row.status !== filterStatus) return false;
      if (filterBilling !== 'all') {
        if (filterBilling === 'Monthly' && row.billingPeriod !== 'Monthly') return false;
        if (filterBilling === 'Yearly' && row.billingPeriod !== 'Yearly') return false;
      }
      if (filterExpiration === 'has' && row.expirationSort <= 0) return false;
      if (filterExpiration === 'na' && row.expirationDate !== 'Not available') return false;
      if (filterLicenseKey === 'assigned' && row.isUnassigned) return false;
      if (filterLicenseKey === 'unassigned' && !row.isUnassigned) return false;
      return true;
    });
  }, [rows, filterDomain, filterStatus, filterBilling, filterExpiration, filterLicenseKey]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const next = [...filteredRows];
    const dir = sortAsc ? 1 : -1;
    next.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'domain': cmp = a.url.localeCompare(b.url, undefined, { sensitivity: 'base' }); break;
        case 'status': cmp = statusOrder[a.status] - statusOrder[b.status]; break;
        case 'billing': cmp = (billingOrder[a.billingPeriod ?? ''] ?? -1) - (billingOrder[b.billingPeriod ?? ''] ?? -1); break;
        case 'expiration': cmp = a.expirationSort - b.expirationSort; break;
        case 'created': cmp = a.createdSort - b.createdSort; break;
        default: cmp = 0;
      }
      return cmp * dir;
    });
    return next;
  }, [filteredRows, sortAsc, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pagedRows = sortedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const clearFilters = useCallback(() => {
    setFilterDomain('');
    setFilterStatus('all');
    setFilterBilling('all');
    setFilterExpiration('all');
    setFilterLicenseKey('all');
    setCurrentPage(1);
  }, []);


  const handleCancelSubscription = (domain: Domain) => {
    setConfirmDomain(domain);
  };

  const confirmCancel = async () => {
    if (!confirmDomain) return;
    const domain = confirmDomain;
    setConfirmDomain(null);
    setActionError(null);
    setCancelSuccess(false);
    setActionLoadingId(domain.id);
    setShowCancelLoading(true);
    try {
      await cancelSubscription({
        subscriptionId: domain.subscriptionId,
        stripeSubscriptionId: domain.stripeSubscriptionId,
      });
      // Optimistically patch — sets cancelAtPeriodEnd so status shows "Cancelling"
      // (active until period ends). Also sets _optimisticCancelled as a fallback flag.
      updateSiteInState({
        id: domain.id,
        _optimisticCancelled: true,
        cancelAtPeriodEnd: 1,
        cancel_at_period_end: 1,
        subscriptionCancelAtPeriodEnd: 1,
        subscription_cancel_at_period_end: 1,
      });
      await refresh({ showLoading: false });
      setCancelSuccess(true);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Failed to cancel subscription');
    } finally {
      setActionLoadingId(null);
      setShowCancelLoading(false);
    }
  };

  const closeAssignModal = () => {
    if (assignLoading || verifying) return;
    setShowAssignModal(false);
    setAssignStep('input');
    setAssignDomain('');
    setAssignLicenseKey('');
    setAssignWfSiteId('');
    setAssignError(null);
    setDomainCheck(null);
    setConflictConfirmed(false);
    setActivationResult(null);
    setScriptCopied(false);
    setVerifyResult(null);
  };

  const handleDomainBlur = async () => {
    const d = assignDomain.trim();
    if (!d) return;
    setCheckingDomain(true);
    setDomainCheck(null);
    setConflictConfirmed(false);
    try {
      const res = await fetch(`/api/licenses/check-domain-script?domain=${encodeURIComponent(d)}`);
      const data = await res.json() as { reachable: boolean; hasExistingScript: boolean; wfSiteId: string | null; hasConflict?: boolean };
      setDomainCheck(data);
      if (data.wfSiteId) setAssignWfSiteId(data.wfSiteId);
    } catch { /* ignore */ }
    finally { setCheckingDomain(false); }
  };

  const handleAssignSubmit = async () => {
    const domainTrim = assignDomain.trim();
    const keyTrim = assignLicenseKey.trim();
    if (!domainTrim || !keyTrim) { setAssignError('Domain and license key are required'); return; }
    if (domainCheck?.hasExistingScript && !conflictConfirmed) { setAssignError('Confirm you have removed the existing script first'); return; }
    setAssignLoading(true);
    setAssignError(null);
    try {
      const result = await activateLicenseWebflow({
        licenseKey: keyTrim,
        domain: domainTrim,
        wfSiteId: assignWfSiteId.trim() || (domainCheck?.wfSiteId ?? null),
      });
      setActivationResult(result);
      setAssignStep('script');
      setAssignSuccess(true);
      await refresh({ showLoading: false });
    } catch (e: unknown) {
      setAssignError(e instanceof Error ? e.message : 'Activation failed');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!activationResult) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`/api/licenses/check-domain-script?domain=${encodeURIComponent(activationResult.domain)}&scriptId=${encodeURIComponent(activationResult.cdnScriptId)}`);
      const data = await res.json() as { scriptFound: boolean };
      setVerifyResult(data.scriptFound ? 'found' : 'not-found');
    } catch { setVerifyResult('not-found'); }
    finally { setVerifying(false); }
  };

  return (
    <div className="w-full max-w-[1121px] mx-auto">
      <LoadingPopup2
        show={showCancelLoading}
        title="Cancelling Subscription"
        subtitle="Please wait while we process your request"
      />

      {actionError && (
        <ErrorPopup message={actionError} onClose={() => setActionError(null)} />
      )}

      {cancelSuccess && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999999] flex items-center justify-between gap-4 rounded-xl px-5 py-3.5 shadow-lg w-full max-w-[600px]"
          style={{ background: "linear-gradient(90deg, #2E7D32 0%, #66BB6A 100%)" }}
          role="alert"
        >
          <div className="flex items-center gap-3">
            <img src="/asset/Success-icon.png" alt="Success" width={28} height={28} className="shrink-0" />
            <span className="text-white font-medium text-sm">Subscription cancelled successfully</span>
          </div>
          <button
            type="button"
            onClick={() => setCancelSuccess(false)}
            className="shrink-0 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-1.5 transition-colors"
          >
            Close
          </button>
        </div>
      )}
      {confirmDomain && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDomain(null)} />
          <div className="relative w-full max-w-[420px] rounded-2xl bg-white shadow-xl p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-[#0a091f] mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Cancel Subscription
            </h2>
            <p className="text-sm text-[#4b5563] leading-relaxed mb-7" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Are you sure you want to cancel the subscription for{' '}
              <span className="font-semibold text-[#0a091f]">{confirmDomain.url}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDomain(null)}
                className="rounded-lg border border-[#e5e7eb] px-5 py-2.5 text-sm text-[#374151] hover:bg-[#f9fafb] transition-colors"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmCancel()}
                className="rounded-lg bg-[#c0392b] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a93226] transition-colors"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Yes, Cancel Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Domain success toast */}
      {assignSuccess && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999999] flex items-center justify-between gap-4 rounded-xl px-5 py-3.5 shadow-lg w-full max-w-[600px]"
          style={{ background: 'linear-gradient(90deg, #2E7D32 0%, #66BB6A 100%)' }}
          role="alert"
        >
          <span className="text-white font-medium text-sm">License activated successfully</span>
          <button
            type="button"
            onClick={() => setAssignSuccess(false)}
            className="shrink-0 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-1.5 transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* Assign Domain modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeAssignModal} />
          <div className="relative w-full max-w-[480px] rounded-2xl bg-white shadow-xl p-7" onClick={(e) => e.stopPropagation()}>

            {/* ── Step 1: Input ── */}
            {assignStep === 'input' && (
              <>
                <h2 className="text-base font-semibold text-[#0a091f] mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>Assign Domain to License Key</h2>
                <p className="text-sm text-[#6b7280] mb-5" style={{ fontFamily: 'DM Sans, sans-serif' }}>Enter the domain to activate this license key.</p>

                <div className="flex flex-col gap-3 mb-5">
                  {/* Domain */}
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>Domain</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="example.com"
                        value={assignDomain}
                        onChange={(e) => { setAssignDomain(e.target.value); setDomainCheck(null); setConflictConfirmed(false); }}
                        onBlur={() => void handleDomainBlur()}
                        disabled={assignLoading}
                        className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 pr-8 text-sm text-[#0a091f] focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-50"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      />
                      {checkingDomain && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          <svg className="animate-spin w-4 h-4 text-[#6b7280]" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                        </span>
                      )}
                      {!checkingDomain && domainCheck?.reachable && !domainCheck.hasConflict && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#16a34a] text-sm">✓</span>
                      )}
                    </div>
                    {checkingDomain && (
                      <p className="mt-1 text-xs text-[#6b7280]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Checking your site for existing scripts…</p>
                    )}
                    {!checkingDomain && domainCheck && !domainCheck.reachable && (
                      <div className="mt-1.5 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2">
                        <p className="text-xs font-medium text-[#92400e]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                          Site not reachable — please publish your site first.
                        </p>
                        <p className="text-xs text-[#92400e] mt-0.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                          We need the site to be live to check for existing scripts. You can still activate and add the script tag after publishing.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Existing script warning */}
                  {domainCheck?.hasExistingScript && (
                    <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5">
                      <p className="text-xs font-medium text-[#92400e] mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        ⚠️ An existing ConsentBit script is already installed on this site.
                      </p>
                      <p className="text-xs text-[#92400e] mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Remove it from your site head before activating to avoid duplicate scripts.
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={conflictConfirmed} onChange={(e) => setConflictConfirmed(e.target.checked)} className="rounded" />
                        <span className="text-xs text-[#92400e]" style={{ fontFamily: 'DM Sans, sans-serif' }}>I have removed the existing script</span>
                      </label>
                    </div>
                  )}

                  {/* License Key */}
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>License Key</label>
                    <input
                      type="text"
                      placeholder="KEY-XXXX-XXXX-XXXX-XXXX"
                      value={assignLicenseKey}
                      onChange={(e) => setAssignLicenseKey(e.target.value)}
                      disabled={assignLoading || !!assignLicenseKey}
                      className={`w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-70 ${assignLicenseKey ? 'border-[#d1fae5] bg-[#f0fdf4] text-[#065f46]' : 'border-[#e5e7eb] text-[#0a091f]'}`}
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    />
                  </div>

                  {assignError && <p className="text-xs text-[#c0392b]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{assignError}</p>}
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={closeAssignModal} disabled={assignLoading}
                    className="rounded-lg border border-[#e5e7eb] px-5 py-2.5 text-sm text-[#374151] hover:bg-[#f9fafb] transition-colors disabled:opacity-40" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={() => void handleAssignSubmit()}
                    disabled={assignLoading || !assignDomain.trim() || !assignLicenseKey.trim() || (domainCheck?.hasExistingScript === true && !conflictConfirmed)}
                    className="rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1d4ed8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {assignLoading ? 'Activating…' : 'Activate'}
                  </button>
                </div>
              </>
            )}

            {/* ── Step 2: Script + Verify ── */}
            {assignStep === 'script' && activationResult && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">✅</span>
                  <h2 className="text-base font-semibold text-[#0a091f]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    Activated for <span className="text-[#2563eb]">{activationResult.domain}</span>
                  </h2>
                </div>

                <p className="text-sm text-[#374151] mb-3" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Paste this script into your site&apos;s <code className="bg-[#f3f4f6] px-1 rounded text-xs font-mono">&lt;head&gt;</code> tag:
                </p>

                {/* Script snippet */}
                <div className="relative rounded-lg bg-[#0f172a] px-4 py-3 mb-4">
                  <code className="text-[#7dd3fc] text-xs break-all font-mono leading-relaxed pr-16">
                    {`<script src="${activationResult.scriptUrl}"></script>`}
                  </code>
                  <button type="button"
                    onClick={() => { void navigator.clipboard.writeText(`<script src="${activationResult.scriptUrl}"></script>`); setScriptCopied(true); setTimeout(() => setScriptCopied(false), 2000); }}
                    className="absolute right-2 top-2 rounded px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white transition-colors" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {scriptCopied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>

                {/* KV warning if wfSiteId not resolved */}
                {!activationResult.platformSiteId && (
                  <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 mb-4">
                    <p className="text-xs text-[#92400e]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      ⚠️ Webflow Site ID was not detected — the consent banner will load from the script above, but Webflow App live sync won&apos;t work until the site is published via the Webflow extension (which will write the KV entry automatically).
                    </p>
                  </div>
                )}

                {/* Verify */}
                <div className="border-t border-[#f3f4f6] pt-4">
                  <p className="text-xs text-[#6b7280] mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>After adding the script and publishing, verify the installation:</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button type="button" onClick={() => void handleVerify()} disabled={verifying}
                      className="rounded-lg border border-[#2563eb] px-4 py-2 text-sm text-[#2563eb] hover:bg-[#eff6ff] transition-colors disabled:opacity-40" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      {verifying ? 'Checking…' : 'Verify Installation'}
                    </button>
                    {verifyResult === 'found' && <span className="text-xs text-[#16a34a] font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>✅ Script detected — site is active!</span>}
                    {verifyResult === 'not-found' && <span className="text-xs text-[#b45309]" style={{ fontFamily: 'DM Sans, sans-serif' }}>⏳ Not found yet — save &amp; publish your site first.</span>}
                  </div>
                </div>

                <div className="flex justify-end mt-5">
                  <button type="button" onClick={closeAssignModal}
                    className="rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1d4ed8] transition-colors" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    Done
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Title */}
      <h1
        className="text-[20px] tracking-[-1px] text-black mb-[18px] mt-3.5"
        style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontVariationSettings: "'opsz' 14" }}
      >
        All Domains
      </h1>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {/* Domain search chip */}
        <div className="relative">
          <input
            type="search"
            value={filterDomain}
            onChange={e => { setFilterDomain(e.target.value); setCurrentPage(1); }}
            placeholder="Search"
            className={`flex items-center gap-1.5 pl-3 pr-3 py-1.5 rounded-full border text-xs font-medium transition-colors w-[100px] outline-none ${
              filterDomain.trim()
                ? 'border-[#2563eb] bg-[#eff6ff] text-[#1d4ed8] placeholder:text-[#1d4ed8]'
                : 'border-[#d1d5db] bg-white text-[#374151] placeholder:text-[#374151] hover:bg-[#f9fafb]'
            }`}
            style={{ fontFamily: 'DM Sans, sans-serif' }}
            aria-label="Filter by domain"
          />
        </div>

        <FilterChip
          label="Status"
          value={filterStatus}
          onChange={v => { setFilterStatus(v as FilterStatus); setCurrentPage(1); }}
          options={[
            { label: 'All statuses', value: 'all' },
            { label: 'Active', value: 'Active' },
            { label: 'Cancelling', value: 'Cancelling' },
            { label: 'Expired', value: 'Expired' },
            { label: 'Inactive', value: 'Inactive' },
          ]}
        />

        <FilterChip
          label="Billing Period"
          value={filterBilling}
          onChange={v => { setFilterBilling(v as FilterBilling); setCurrentPage(1); }}
          options={[
            { label: 'All billing', value: 'all' },
            { label: 'Monthly', value: 'Monthly' },
            { label: 'Yearly', value: 'Yearly' },
          ]}
        />

        <FilterChip
          label="Expiration Date"
          value={filterExpiration}
          onChange={v => { setFilterExpiration(v as FilterExpiration); setCurrentPage(1); }}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Has end date', value: 'has' },
            { label: 'N/A only', value: 'na' },
          ]}
        />

        <FilterChip
          label="License Key"
          value={filterLicenseKey}
          onChange={v => { setFilterLicenseKey(v as FilterLicenseKey); setCurrentPage(1); }}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Assigned', value: 'assigned' },
            { label: 'Unassigned', value: 'unassigned' },
          ]}
        />

        <FilterChip
          label="Created"
          value="all"
          onChange={() => handleSort('created')}
          options={[
            { label: 'Sort by Created', value: 'all' },
          ]}
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center justify-center w-6 h-6 rounded-full border border-[#d1d5db] bg-white text-[#6b7280] hover:bg-[#f3f4f6] text-xs font-bold transition-colors"
            aria-label="Clear filters"
          >
            ✕
          </button>
        )}
      </div>


      {/* Table */}
      <div className="w-full rounded-[10px] overflow-visible">
        {/* Header */}
        <div className={`${TABLE_GRID} px-[20px] py-[18px] items-center rounded-t-[10px]`} style={{ backgroundColor: '#F3F4F6' }}>
          <span className="text-xs tracking-[-0.5px] text-[#6b7280] font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>Domain</span>
          <span className="text-xs tracking-[-0.5px] text-[#6b7280] font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>Status</span>
          <span className="text-xs tracking-[-0.5px] text-[#6b7280] font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>Billing Period</span>
          <span className="text-xs tracking-[-0.5px] text-[#6b7280] font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>Expiration Date</span>
          <span className="text-xs tracking-[-0.5px] text-[#6b7280] font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>License Key</span>
          <span className="text-xs tracking-[-0.5px] text-[#6b7280] font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>Created</span>
          <div className="w-[17px]" aria-hidden />
        </div>

        {/* Rows */}
        <div className="bg-white rounded-b-[10px] overflow-visible">
          {!hydrated ? null : pagedRows.map(domain => (
            <div
              key={domain.id}
              className={`${TABLE_GRID} px-[20px] py-[14px] relative group hover:bg-[#f9fafb] transition-colors items-center`}
            >
              {/* Domain URL */}
              <div
                className="text-[#374151] text-sm tracking-[-0.5px] min-w-0 truncate"
                style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}
                title={domain.url}
              >
                {domain.url}
              </div>

              {/* Status Badge */}
              <div className="flex items-center">
                <StatusBadge status={domain.status} />
              </div>

              {/* Billing Period */}
              <div className="flex items-center">
                <span
                  className={`text-sm tracking-[-0.5px] ${domain.billingPeriod ? 'text-[#5c7cfa]' : 'text-[#9ca3af]'}`}
                  style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}
                >
                  {domain.billingPeriod ?? 'Not available'}
                </span>
              </div>

              {/* Expiration Date */}
              <div className="flex items-center">
                <span
                  className="text-[#4b5563] text-sm tracking-[-0.5px]"
                  style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}
                >
                  {domain.expirationDate}
                </span>
              </div>

              {/* License Key */}
              <div className="flex items-center gap-2">
                {domain.licenseKey ? (
                  <>
                    <span
                      className="text-[#374151] text-[11px] tracking-[-0.3px] font-mono"
                      title={domain.licenseKey}
                    >
                      {domain.licenseKey}
                    </span>
                    {/* <button
                      type="button"
                      onClick={() => handleCopyLicenseKey(domain)}
                      className="shrink-0 text-[#3b82f6] hover:text-[#1d4ed8] transition-colors"
                      title="Copy license key"
                      aria-label="Copy license key"
                    >
                      {copiedId === domain.id ? (
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <path d="M2 6.5L5 9.5L11 3.5" stroke="#118a41" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <rect x="1" y="1" width="7.5" height="7.5" rx="1.2" stroke="#3b82f6" strokeWidth="1" />
                          <rect x="4.5" y="4.5" width="7.5" height="7.5" rx="1.2" fill="white" stroke="#3b82f6" strokeWidth="1" />
                        </svg>
                      )}
                    </button> */}
                  </>
                ) : (
                  <span className="text-[#9ca3af] text-[11px]">Not assigned</span>
                )}
              </div>

              {/* Created Date */}
              <div className="flex items-center">
                <span
                  className="text-[#4b5563] text-sm tracking-[-0.5px]"
                  style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}
                >
                  {domain.created}
                </span>
              </div>

              {/* Three Dot Menu — always rendered to keep grid aligned */}
              <div className="flex items-center justify-end">
                {(domain.billingPeriod !== null || domain.isUnassigned) && (
                  <button
                    type="button"
                    className="cursor-pointer p-2"
                    onClick={e => { e.stopPropagation(); setOpenMenuId(prev => prev === domain.id ? null : domain.id); }}
                  >
                    <ThreeDotMenu />
                  </button>
                )}
              </div>

              {/* Dropdown Menu */}
              {openMenuId === domain.id && (domain.billingPeriod !== null || domain.isUnassigned) && (
                <div
                  ref={menuRef}
                  className="absolute right-[40px] top-[50%] transform -translate-y-1/2 bg-white shadow-lg rounded-[8px] py-[6px] px-[8px] z-10 border border-[#e5e7eb] min-w-[168px]"
                >
                  {domain.isUnassigned && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        setAssignLicenseKey(domain.licenseKey ?? '');
                        setAssignDomain('');
                        setAssignError(null);
                        setShowAssignModal(true);
                      }}
                      className="flex items-center gap-[8px] py-[6px] px-[8px] rounded-[4px] w-full text-left hover:bg-[#eff6ff]"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" stroke="#1d4ed8" strokeWidth="1.2" />
                        <path d="M7 4.5V9.5M4.5 7H9.5" stroke="#1d4ed8" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      <span
                        className="text-[#1d4ed8] text-[13px] tracking-[-0.5px]"
                        style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}
                      >
                        Assign Domain
                      </span>
                    </button>
                  )}
                  {!domain.isUnassigned && (
                  <button
                    type="button"
                    disabled={['Cancelling', 'Cancelled', 'Expired'].includes(domain.status) || actionLoadingId === domain.id}
                    onClick={() => { if (['Cancelling', 'Cancelled', 'Expired'].includes(domain.status)) return; setOpenMenuId(null); void handleCancelSubscription(domain); }}
                    className="flex items-center gap-[8px] py-[6px] px-[8px] rounded-[4px] w-full text-left disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#fff0f0] disabled:hover:bg-transparent"
                  >
                    <svg width="14" height="14" viewBox="0 0 8 8" fill="none">
                      <path d={svgPaths.p478eb80} stroke="#8A1111" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.8" />
                      <path d={svgPaths.p3d8089e4} stroke="#8A1111" strokeLinecap="round" strokeLinejoin="round" />
                      <path d={svgPaths.p10d33ac0} stroke="#8A1111" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span
                      className="text-[#8A1111] text-[13px] tracking-[-0.5px]"
                      style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}
                    >
                      {actionLoadingId === domain.id ? 'Cancelling…' : 'Cancel Subscription'}
                    </span>
                  </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {!loading && sortedRows.length === 0 && (
            <div className="px-[20px] py-[20px] text-sm text-[#6b7280]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              No domains found.
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-4">
          <p className="text-xs text-[#6b7280]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sortedRows.length)} of {sortedRows.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md text-xs font-medium border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                  page === currentPage
                    ? 'bg-[#2563eb] border-[#2563eb] text-white'
                    : 'border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f3f4f6]'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md text-xs font-medium border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
