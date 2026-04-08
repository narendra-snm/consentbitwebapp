"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardSession } from '../../DashboardSessionProvider';
import { cancelSubscription, deleteSite } from '@/lib/client-api';

const svgPaths = {
  p10d33ac0: "M6.28298 3.04688L6.06631 6.40354C6.02964 6.92687 5.99964 7.33354 5.06964 7.33354H2.92964C1.99964 7.33354 1.96964 6.92687 1.93298 6.40354L1.71631 3.04688",
  p1b386300: "M3.27284 4.43681L3.20872 1.75H3.78582L3.72704 4.43681H3.27284ZM3.50261 5.6C3.39931 5.6 3.31381 5.56723 3.24613 5.5017C3.182 5.43253 3.14994 5.35061 3.14994 5.25596C3.14994 5.15766 3.182 5.07574 3.24613 5.01021C3.31381 4.94104 3.39931 4.90645 3.50261 4.90645C3.60236 4.90645 3.68429 4.94104 3.74842 5.01021C3.8161 5.07574 3.84994 5.15766 3.84994 5.25596C3.84994 5.35061 3.8161 5.43253 3.74842 5.5017C3.68429 5.56723 3.60236 5.6 3.50261 5.6Z",
  p3d8089e4: "M2.83301 1.65699L2.90634 1.22033C2.95967 0.903659 2.99967 0.666992 3.56301 0.666992H4.43634C4.99967 0.666992 5.04301 0.916992 5.09301 1.22366L5.16634 1.65699",
  p478eb80: "M7 1.99382C5.89 1.88382 4.77333 1.82715 3.66 1.82715C3 1.82715 2.34 1.86048 1.68 1.92715L1 1.99382",
};

type DomainStatus = 'Active' | 'Cancelled' | 'Cancelling' | 'Expired';
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
}

const StatusBadge = ({ status }: { status: DomainStatus }) => {
  const styles: Record<DomainStatus, { bg: string; text: string; dotColor: string }> = {
    Active: { bg: 'bg-[#b6f5cf]', text: 'text-[#118a41]', dotColor: '#118A41' },
    Cancelled: { bg: 'bg-[#f5b6b6]', text: 'text-[#8a1111]', dotColor: '#c0392b' },
    Cancelling: { bg: 'bg-[#fde8cc]', text: 'text-[#9a5000]', dotColor: '#e07000' },
    Expired: { bg: 'bg-[#eeecec]', text: 'text-[#717171]', dotColor: '#717171' },
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

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d={svgPaths.p1b386300.replace('3.27284 4.43681', '1 1')} />
    <rect x="1" y="1" width="8" height="8" rx="1.2" stroke="#3b82f6" strokeWidth="1" />
    <rect x="4" y="4" width="8" height="8" rx="1.2" fill="white" stroke="#3b82f6" strokeWidth="1" />
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

const statusOrder: Record<DomainStatus, number> = { Active: 0, Cancelling: 1, Cancelled: 2, Expired: 3 };
const billingOrder: Record<string, number> = { Monthly: 0, Yearly: 1 };

const TABLE_GRID =
  'grid grid-cols-[minmax(160px,1.8fr)_minmax(95px,0.8fr)_minmax(105px,0.8fr)_minmax(105px,0.8fr)_minmax(170px,1.2fr)_minmax(90px,0.7fr)_auto] gap-x-[16px]';

type FilterStatus = 'all' | DomainStatus;
type FilterBilling = 'all' | 'Monthly' | 'Yearly';
type FilterExpiration = 'all' | 'has' | 'na';

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
  const router = useRouter();
  const { sites, loading, refresh } = useDashboardSession();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [filterDomain, setFilterDomain] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterBilling, setFilterBilling] = useState<FilterBilling>('all');
  const [filterExpiration, setFilterExpiration] = useState<FilterExpiration>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

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
        : "-";

      const verified = site?.verified === 1 || site?.verified === true;
      const cancelAtPeriodEnd = Number(
        site?.subscriptionCancelAtPeriodEnd ?? site?.subscription_cancel_at_period_end ??
        site?.cancelAtPeriodEnd ?? site?.cancel_at_period_end ?? 0,
      ) === 1;
      const explicitlyCancelled = site?.status === 'cancelled' || site?.subscriptionStatus === 'canceled' || site?.subscription_status === 'canceled';

      const status: DomainStatus = !verified
        ? 'Expired'
        : explicitlyCancelled
          ? 'Cancelled'
          : cancelAtPeriodEnd
            ? 'Cancelling'
            : 'Active';

      const rawInterval = site?.interval ?? site?.billing_interval ?? site?.subscriptionInterval ?? site?.subscription_interval ?? null;
      const rawPlan = site?.planId ?? site?.plan_id ?? site?.subscription_plan ?? site?.plan ?? 'free';
      const planLower = String(rawPlan).toLowerCase();
      const billingPeriod: Domain['billingPeriod'] = planLower === 'free' ? null
        : String(rawInterval || '').toLowerCase() === 'yearly' ? 'Yearly' : 'Monthly';

      const subscriptionEnd = site?.subscriptionCurrentPeriodEnd ?? site?.subscription_current_period_end ??
        site?.currentPeriodEnd ?? site?.current_period_end ?? site?.nextRenewal ?? site?.next_renewal ?? null;
      const expTs = subscriptionEnd ? new Date(subscriptionEnd).getTime() : 0;
      const expirationDate = subscriptionEnd
        ? new Date(subscriptionEnd).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })
        : "N/A";

      const licenseKey = site?.licenseKey ?? site?.license_key ?? site?.apiKey ?? site?.api_key ??
        site?.consentKey ?? site?.consent_key ?? site?.siteKey ?? site?.site_key ?? null;

      return {
        id: String(site?.id || ''),
        url: String(site?.domain || site?.name || '—'),
        status,
        billingPeriod,
        expirationDate,
        licenseKey: licenseKey ? String(licenseKey) : null,
        created,
        createdSort: createdTs,
        expirationSort: expTs,
        subscriptionId: site?.subscriptionId ? String(site.subscriptionId) : null,
        stripeSubscriptionId: site?.stripeSubscriptionId ? String(site.stripeSubscriptionId) : null,
      };
    });
  }, [sites]);

  const hasActiveFilters =
    filterDomain.trim().length > 0 || filterStatus !== 'all' || filterBilling !== 'all' || filterExpiration !== 'all';

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
      if (filterExpiration === 'na' && row.expirationDate !== 'N/A') return false;
      return true;
    });
  }, [rows, filterDomain, filterStatus, filterBilling, filterExpiration]);

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
    setCurrentPage(1);
  }, []);

  const handleCopyLicenseKey = (domain: Domain) => {
    if (!domain.licenseKey) return;
    navigator.clipboard.writeText(domain.licenseKey).then(() => {
      setCopiedId(domain.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const handleDeleteDomain = async (domain: Domain) => {
    const ok = window.confirm(`Delete domain "${domain.url}"? This action cannot be undone.`);
    if (!ok) return;
    setActionError(null);
    setActionLoadingId(domain.id);
    try {
      await deleteSite(domain.id);
      await refresh({ showLoading: false });
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete domain');
    } finally {
      setActionLoadingId(null);
    }
  };

  const SortableColHeader = ({ label, sortK }: { label: string; sortK: SortKey }) => {
    const active = sortKey === sortK;
    return (
      <button
        type="button"
        onClick={() => handleSort(sortK)}
        className="flex items-center gap-1 text-left w-full"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        <span className={`text-xs tracking-[-0.5px] ${active ? 'text-[#1d4ed8] font-semibold' : 'text-[#6b7280] font-medium'}`}>{label}</span>
        <span className={`text-[10px] ${active ? 'text-[#1d4ed8]' : 'text-[#9ca3af]'}`} aria-hidden>
          {active ? (sortAsc ? '↑' : '↓') : '↕'}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full max-w-[1121px] mx-auto">
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
            placeholder="Active"
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
            { label: 'Cancelled', value: 'Cancelled' },
            { label: 'Expired', value: 'Expired' },
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

      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

      {/* Table with blue border */}
      <div className="w-full rounded-[10px] border border-[#2563eb] shadow-sm overflow-visible">
        {/* Header */}
        <div className={`${TABLE_GRID} px-[20px] py-[12px] bg-white border-b border-[#e5e7eb] items-center rounded-t-[10px]`}>
          <SortableColHeader label="Active" sortK="domain" />
          <SortableColHeader label="Status" sortK="status" />
          <SortableColHeader label="Billing Period" sortK="billing" />
          <SortableColHeader label="Expiration Date" sortK="expiration" />
          <span className="text-xs tracking-[-0.5px] text-[#6b7280] font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>License Key</span>
          <SortableColHeader label="Created" sortK="created" />
          <div className="w-[17px]" aria-hidden />
        </div>

        {/* Rows */}
        <div className="bg-white rounded-b-[10px] overflow-visible">
          {pagedRows.map(domain => (
            <div
              key={domain.id}
              className={`${TABLE_GRID} px-[20px] py-[14px] border-b border-[#f0f0f0] last:border-b-0 last:pb-[28px] relative group hover:bg-[#f9fafb] transition-colors items-center`}
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
                  {domain.billingPeriod ?? 'N/A'}
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
              <div className="flex items-center gap-2 min-w-0">
                {domain.licenseKey ? (
                  <>
                    <span
                      className="text-[#374151] text-[11px] tracking-[-0.3px] font-mono truncate"
                      title={domain.licenseKey}
                    >
                      {domain.licenseKey}
                    </span>
                    <button
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
                    </button>
                  </>
                ) : (
                  <span className="text-[#9ca3af] text-[11px]">—</span>
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

              {/* Three Dot Menu */}
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setOpenMenuId(prev => prev === domain.id ? null : domain.id); }}
                >
                  <ThreeDotMenu />
                </button>
              </div>

              {/* Dropdown Menu */}
              {openMenuId === domain.id && (
                <div
                  ref={menuRef}
                  className="absolute right-[40px] top-[50%] transform -translate-y-1/2 bg-white shadow-lg rounded-[8px] py-[6px] px-[8px] z-10 border border-[#e5e7eb] min-w-[168px]"
                >
                  <button
                    type="button"
                    disabled={!domain.licenseKey || actionLoadingId === domain.id}
                    onClick={() => { setOpenMenuId(null); handleCopyLicenseKey(domain); }}
                    className="flex items-center gap-[8px] py-[6px] px-[8px] hover:bg-[#f5f7fa] rounded-[4px] w-full text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="1" width="8" height="8" rx="1.2" stroke="#4B5563" strokeWidth="1" />
                      <rect x="5" y="5" width="8" height="8" rx="1.2" fill="white" stroke="#4B5563" strokeWidth="1" />
                    </svg>
                    <span
                      className="text-[#4b5563] text-[13px] tracking-[-0.5px]"
                      style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}
                    >
                      Copy License key
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={actionLoadingId === domain.id}
                    onClick={() => { setOpenMenuId(null); void handleDeleteDomain(domain); }}
                    className="flex items-center gap-[8px] py-[6px] px-[8px] hover:bg-[#fff0f0] rounded-[4px] w-full text-left disabled:opacity-40 disabled:cursor-not-allowed"
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
                      {actionLoadingId === domain.id ? 'Deleting…' : 'Delete Domain'}
                    </span>
                  </button>
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
