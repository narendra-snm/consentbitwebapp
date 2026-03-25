"use client";
import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardSession } from '../../DashboardSessionProvider';
import { cancelSubscription } from '@/lib/client-api';
const svgPaths = {
p10d33ac0: "M6.28298 3.04688L6.06631 6.40354C6.02964 6.92687 5.99964 7.33354 5.06964 7.33354H2.92964C1.99964 7.33354 1.96964 6.92687 1.93298 6.40354L1.71631 3.04688",
p1b386300: "M3.27284 4.43681L3.20872 1.75H3.78582L3.72704 4.43681H3.27284ZM3.50261 5.6C3.39931 5.6 3.31381 5.56723 3.24613 5.5017C3.182 5.43253 3.14994 5.35061 3.14994 5.25596C3.14994 5.15766 3.182 5.07574 3.24613 5.01021C3.31381 4.94104 3.39931 4.90645 3.50261 4.90645C3.60236 4.90645 3.68429 4.94104 3.74842 5.01021C3.8161 5.07574 3.84994 5.15766 3.84994 5.25596C3.84994 5.35061 3.8161 5.43253 3.74842 5.5017C3.68429 5.56723 3.60236 5.6 3.50261 5.6Z",
p1be9ec00: "M8.98348 2.81748V4.53249C8.98348 5.96167 8.41181 6.53333 6.98263 6.53333H6.53347V5.2675C6.53347 3.83832 5.9618 3.26665 4.53262 3.26665H3.26678V2.81748C3.26678 1.38831 3.83845 0.81664 5.26763 0.81664H6.98263C8.41181 0.81664 8.98348 1.38831 8.98348 2.81748Z",
p1ce1ca80: "M6.53339 5.26751V6.98252C6.53339 8.4117 5.96172 8.98337 4.53255 8.98337H2.81754C1.38837 8.98337 0.816696 8.4117 0.816696 6.98252V5.26751C0.816696 3.83834 1.38837 3.26667 2.81754 3.26667H4.53255C5.96172 3.26667 6.53339 3.83834 6.53339 5.26751Z",
p3d8089e4: "M2.83301 1.65699L2.90634 1.22033C2.95967 0.903659 2.99967 0.666992 3.56301 0.666992H4.43634C4.99967 0.666992 5.04301 0.916992 5.09301 1.22366L5.16634 1.65699",
p478eb80: "M7 1.99382C5.89 1.88382 4.77333 1.82715 3.66 1.82715C3 1.82715 2.34 1.86048 1.68 1.92715L1 1.99382",
}
;

type SortKey = 'domain' | 'licenseKey' | 'status' | 'billing' | 'expiration' | 'created';

interface Domain {
  id: string;
  url: string;
  licenseKey: string;
  status: 'Active' | 'Inactive' | 'Expired';
  billingPeriod: 'Yearly' | 'Monthly' | 'Free';
  expirationDate: string;
  created: string;
  createdSort: number;
  expirationSort: number;
  subscriptionId: string | null;
  stripeSubscriptionId: string | null;
}

const StatusBadge = ({ status }: { status: Domain['status'] }) => {
  const styles = {
    Active: {
      bg: 'bg-[#b6f5cf]',
      text: 'text-[#118a41]',
      dotColor: '#118A41',
    },
    Inactive: {
      bg: 'bg-[#f5b6b6]',
      text: 'text-[#8a1111]',
      dotColor: '#8A1111',
    },
    Expired: {
      bg: 'bg-[#eeecec]',
      text: 'text-[#717171]',
      dotColor: '#717171',
    },
  };

  const style = styles[status];

  return (
    <div className={`${style.bg} flex items-center justify-center px-[8px] h-[19px] rounded-[50px] gap-[4px]`}>
      <div className="w-[5px] h-[5px]">
        <svg className="block size-full" viewBox="0 0 5 5" fill="none">
          <circle cx="2.5" cy="2.5" r="2.5" fill={style.dotColor} />
        </svg>
      </div>
      <p className={`${style.text} text-[10px] tracking-[-0.5px] whitespace-nowrap`} style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontVariationSettings: "'opsz' 14" }}>
        {status}
      </p>
      {status === 'Inactive' && (
        <div className="w-[7px] h-[7px]">
          <svg className="block size-full" viewBox="0 0 7 7" fill="none">
            <circle cx="3.5" cy="3.5" r="3.25" stroke="#8A1111" strokeWidth="0.5" />
            <path d={svgPaths.p1b386300} fill="#8A1111" />
          </svg>
        </div>
      )}
    </div>
  );
};

function SortableHeader({
  label,
  sortKey,
  activeKey,
  ascending,
  onSort,
  filterActive = false,
  filterFocused = false,
  onActivateFilter,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey | null;
  ascending: boolean;
  onSort: (key: SortKey) => void;
  /** True when this column has a non-empty filter value. */
  filterActive?: boolean;
  /** True when the filter control below this column is focused. */
  filterFocused?: boolean;
  /** Focus the filter input/select for this column (e.g. after header click). */
  onActivateFilter?: () => void;
}) {
  const sortActive = activeKey === sortKey;
  const filterHighlight = filterActive || filterFocused;
  const filterOnly = filterHighlight && !sortActive;
  return (
    <button
      type="button"
      onClick={() => {
        onSort(sortKey);
        onActivateFilter?.();
      }}
      className={`flex items-center justify-between gap-2 w-full text-left rounded-md px-2 py-1.5 -mx-2 transition-colors ${
        sortActive
          ? 'bg-[#e0edff] text-[#1d4ed8] ring-2 ring-[#93c5fd] shadow-sm'
          : filterOnly
            ? 'bg-[#fffbeb] text-[#92400e] ring-2 ring-[#fbbf24]'
            : 'text-[#4b5563] hover:bg-white/90 ring-1 ring-transparent hover:ring-[#e5e7eb]'
      }`}
      style={{
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: sortActive || filterOnly ? 600 : 500,
        fontVariationSettings: "'opsz' 14",
      }}
    >
      <span className="text-sm tracking-[-0.75px]">{label}</span>
      <span
        className={`text-xs tabular-nums shrink-0 ${sortActive ? 'text-[#1d4ed8]' : filterOnly ? 'text-[#b45309]' : 'text-[#9ca3af]'}`}
        aria-hidden
      >
        {sortActive ? (ascending ? '↑' : '↓') : '↕'}
      </span>
    </button>
  );
}

function LicenseKeyCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const v = value?.trim() || '';
  const copy = async () => {
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="font-mono text-[11px] text-[#374151] break-all leading-snug tracking-tight">
        {v || '—'}
      </span>
      {v ? (
        <button
          type="button"
          onClick={() => void copy()}
          className="text-[11px] text-[#2563eb] shrink-0 hover:underline pt-0.5"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      ) : null}
    </div>
  );
}

const ThreeDotMenu = () => {
  return (
    <div className="w-[17px] h-[3px] flex items-center justify-center">
      <svg className="block size-full" viewBox="0 0 17 3" fill="none">
        <circle cx="1.5" cy="1.5" r="1.5" fill="#4B5563" />
        <circle cx="8.5" cy="1.5" r="1.5" fill="#4B5563" />
        <circle cx="15.5" cy="1.5" r="1.5" fill="#4B5563" />
      </svg>
    </div>
  );
};

const statusOrder: Record<Domain['status'], number> = {
  Active: 0,
  Inactive: 1,
  Expired: 2,
};

const billingOrder: Record<Domain['billingPeriod'], number> = {
  Free: 0,
  Monthly: 1,
  Yearly: 2,
};

const TABLE_GRID =
  'grid grid-cols-[minmax(140px,1.3fr)_minmax(160px,1.1fr)_minmax(100px,0.75fr)_minmax(100px,0.85fr)_minmax(100px,0.85fr)_minmax(90px,0.7fr)_auto] gap-x-[16px]';

const filterInputClass =
  'w-full rounded-md border border-[#cbd5e1] bg-white px-2 py-1.5 text-xs text-[#374151] shadow-sm placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]';

export function DomainManagementDashboard() {
  const router = useRouter();
  const { sites, loading, refresh } = useDashboardSession();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>('created');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterDomain, setFilterDomain] = useState('');
  const [filterLicense, setFilterLicense] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Domain['status']>('all');
  const [filterBilling, setFilterBilling] = useState<'all' | Domain['billingPeriod']>('all');
  const [filterExpiration, setFilterExpiration] = useState<'all' | 'has' | 'na'>('all');

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortAsc((a) => !a);
        return prev;
      }
      setSortAsc(true);
      return key;
    });
  }, []);

  const rows = useMemo<Domain[]>(() => {
    const list = Array.isArray(sites) ? sites : [];
    return list.map((site: any) => {
      const createdDate = site?.createdAt ?? site?.created_at;
      const createdTs = createdDate ? new Date(createdDate).getTime() : 0;
      const created = createdDate
        ? new Date(createdDate).toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "2-digit",
          })
        : "-";
      /** API adds `licenseKey` from Site.apiKey (see worker /api/sites). */
      const licenseKey = String(
        site?.licenseKey ??
          site?.license_key ??
          site?.apiKey ??
          site?.apikey ??
          site?.api_key ??
          '',
      ).trim();
      const verified = site?.verified === 1 || site?.verified === true;
      const rawPlan =
        site?.planId ??
        site?.plan_id ??
        site?.subscription_plan ??
        site?.plan ??
        "free";
      const plan = String(rawPlan).toLowerCase();
      const billingPeriod: Domain["billingPeriod"] = plan === "free" ? "Free" : "Monthly";
      const subscriptionEnd =
        site?.subscriptionCurrentPeriodEnd ??
        site?.subscription_current_period_end ??
        site?.currentPeriodEnd ??
        site?.current_period_end ??
        site?.nextRenewal ??
        site?.next_renewal ??
        null;
      const cancelAtPeriodEnd =
        Number(
          site?.subscriptionCancelAtPeriodEnd ??
            site?.subscription_cancel_at_period_end ??
            site?.cancelAtPeriodEnd ??
            site?.cancel_at_period_end ??
            0,
        ) === 1;
      const status: Domain["status"] = !verified ? "Inactive" : cancelAtPeriodEnd ? "Expired" : "Active";
      const expTs = subscriptionEnd ? new Date(subscriptionEnd).getTime() : 0;
      const expirationDate = subscriptionEnd
        ? new Date(subscriptionEnd).toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "2-digit",
          })
        : "N/A";

      return {
        id: String(site?.id || ""),
        url: String(site?.domain || site?.name || "—"),
        licenseKey,
        status,
        billingPeriod,
        expirationDate,
        created,
        createdSort: createdTs,
        expirationSort: expTs,
        subscriptionId: site?.subscriptionId ? String(site.subscriptionId) : null,
        stripeSubscriptionId: site?.stripeSubscriptionId ? String(site.stripeSubscriptionId) : null,
      };
    });
  }, [sites]);

  const hasActiveFilters =
    filterDomain.trim().length > 0 ||
    filterLicense.trim().length > 0 ||
    filterStatus !== 'all' ||
    filterBilling !== 'all' ||
    filterExpiration !== 'all';

  const filteredRows = useMemo(() => {
    const d = filterDomain.trim().toLowerCase();
    const l = filterLicense.trim().toLowerCase();
    return rows.filter((row) => {
      if (d && !row.url.toLowerCase().includes(d)) return false;
      if (l && !row.licenseKey.toLowerCase().includes(l)) return false;
      if (filterStatus !== 'all' && row.status !== filterStatus) return false;
      if (filterBilling !== 'all' && row.billingPeriod !== filterBilling) return false;
      if (filterExpiration === 'has' && row.expirationSort <= 0) return false;
      if (filterExpiration === 'na' && row.expirationDate !== 'N/A') return false;
      return true;
    });
  }, [rows, filterDomain, filterLicense, filterStatus, filterBilling, filterExpiration]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const next = [...filteredRows];
    const dir = sortAsc ? 1 : -1;
    next.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'domain':
          cmp = a.url.localeCompare(b.url, undefined, { sensitivity: 'base' });
          break;
        case 'licenseKey':
          cmp = a.licenseKey.localeCompare(b.licenseKey);
          break;
        case 'status':
          cmp = statusOrder[a.status] - statusOrder[b.status];
          break;
        case 'billing':
          cmp = billingOrder[a.billingPeriod] - billingOrder[b.billingPeriod];
          break;
        case 'expiration':
          cmp = a.expirationSort - b.expirationSort;
          break;
        case 'created':
          cmp = a.createdSort - b.createdSort;
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return next;
  }, [filteredRows, sortAsc, sortKey]);

  const clearFilters = useCallback(() => {
    setFilterDomain('');
    setFilterLicense('');
    setFilterStatus('all');
    setFilterBilling('all');
    setFilterExpiration('all');
  }, []);

  const handleCancelSubscription = async (domain: Domain) => {
    if (domain.billingPeriod === "Free") return;
    if (!domain.subscriptionId && !domain.stripeSubscriptionId) {
      setActionError("No active subscription found for this site.");
      return;
    }
    const ok = window.confirm("Cancel this subscription at period end?");
    if (!ok) return;
    setActionError(null);
    setActionLoadingId(domain.id);
    try {
      await cancelSubscription({
        subscriptionId: domain.subscriptionId,
        stripeSubscriptionId: domain.stripeSubscriptionId,
      });
      await refresh({ showLoading: false });
      setHoveredRow(null);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed to cancel subscription");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="w-full max-w-[1121px] mx-auto bg-white">
      {/* Header with title and filters */}
      <div className="mb-[23px] mt-3.5">
        <h1 className="text-[20px] tracking-[-1px] text-black mb-[21px]" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontVariationSettings: "'opsz' 14" }}>
          All Domains
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-xs text-[#6b7280]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            <strong className="text-[#374151]">Sort:</strong> click a header (blue = active sort).{' '}
            <strong className="text-[#374151]">Filter:</strong> use the row below or click a header to focus that column’s filter — amber = active filter column.
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-[#2563eb] hover:underline shrink-0"
            >
              Clear filters
            </button>
          ) : null}
        </div>
        {actionError ? (
          <p className="mt-2 text-sm text-red-600">{actionError}</p>
        ) : null}
      </div>

      {/* Table */}
      <div className="w-full">
        <div className="rounded-t-[10px] border border-[#cfe0fa] border-b-0 bg-[#F2F7FF] overflow-hidden">
          <div className={`${TABLE_GRID} px-[23px] pt-[14px] pb-1 items-end`}>
            <SortableHeader
              label="Domain"
              sortKey="domain"
              activeKey={sortKey}
              ascending={sortAsc}
              onSort={handleSort}
              filterActive={filterDomain.trim().length > 0}
              filterFocused={filterFocusKey === 'domain'}
              onActivateFilter={() => domainFilterRef.current?.focus()}
            />
            <SortableHeader
              label="License key"
              sortKey="licenseKey"
              activeKey={sortKey}
              ascending={sortAsc}
              onSort={handleSort}
              filterActive={filterLicense.trim().length > 0}
              filterFocused={filterFocusKey === 'licenseKey'}
              onActivateFilter={() => licenseFilterRef.current?.focus()}
            />
            <SortableHeader
              label="Status"
              sortKey="status"
              activeKey={sortKey}
              ascending={sortAsc}
              onSort={handleSort}
              filterActive={filterStatus !== 'all'}
              filterFocused={filterFocusKey === 'status'}
              onActivateFilter={() => statusFilterRef.current?.focus()}
            />
            <SortableHeader
              label="Billing"
              sortKey="billing"
              activeKey={sortKey}
              ascending={sortAsc}
              onSort={handleSort}
              filterActive={filterBilling !== 'all'}
              filterFocused={filterFocusKey === 'billing'}
              onActivateFilter={() => billingFilterRef.current?.focus()}
            />
            <SortableHeader
              label="Expiration"
              sortKey="expiration"
              activeKey={sortKey}
              ascending={sortAsc}
              onSort={handleSort}
              filterActive={filterExpiration !== 'all'}
              filterFocused={filterFocusKey === 'expiration'}
              onActivateFilter={() => expirationFilterRef.current?.focus()}
            />
            <SortableHeader
              label="Created"
              sortKey="created"
              activeKey={sortKey}
              ascending={sortAsc}
              onSort={handleSort}
              filterActive={false}
            />
            <div className="w-[17px]" aria-hidden />
          </div>
          <div className={`${TABLE_GRID} px-[23px] pb-3 pt-1 items-center`}>
            <input
              type="search"
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              placeholder="Filter domain…"
              className={filterInputClass}
              aria-label="Filter by domain"
            />
            <input
              type="search"
              value={filterLicense}
              onChange={(e) => setFilterLicense(e.target.value)}
              placeholder="Filter license…"
              className={filterInputClass}
              aria-label="Filter by license key"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className={filterInputClass}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Expired">Expired</option>
            </select>
            <select
              ref={billingFilterRef}
              value={filterBilling}
              onChange={(e) => setFilterBilling(e.target.value as typeof filterBilling)}
              onFocus={() => setFilterFocusKey('billing')}
              onBlur={() => setFilterFocusKey((k) => (k === 'billing' ? null : k))}
              className={filterInputClass}
              aria-label="Filter by billing"
            >
              <option value="all">All billing</option>
              <option value="Free">Free</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
            <select
              ref={expirationFilterRef}
              value={filterExpiration}
              onChange={(e) => setFilterExpiration(e.target.value as typeof filterExpiration)}
              onFocus={() => setFilterFocusKey('expiration')}
              onBlur={() => setFilterFocusKey((k) => (k === 'expiration' ? null : k))}
              className={filterInputClass}
              aria-label="Filter by expiration"
            >
              <option value="all">All</option>
              <option value="has">Has end date</option>
              <option value="na">N/A only</option>
            </select>
            <div className="min-w-0" aria-hidden />
            <div className="w-[17px]" aria-hidden />
          </div>
        </div>

        {/* Table Rows */}
        <div className="bg-[#fafbfc] border border-t-0 border-[#e5e7eb] rounded-b-[10px] overflow-hidden">
          {sortedRows.map((domain) => (
            <div
              key={domain.id}
              className={`${TABLE_GRID} px-[20px] py-[16px] border-b border-[#e5e7eb] last:border-b-0 relative group hover:bg-[#f5f7fa] transition-colors`}
              onMouseEnter={() => setHoveredRow(domain.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* Domain URL */}
              <div className="text-[#4b5563] text-sm font-medium tracking-[-0.7px] min-w-0 break-all" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}>
                {domain.url}
              </div>

              {/* License key (API key) */}
              <LicenseKeyCell value={domain.licenseKey} />

              {/* Status Badge */}
              <div className="flex items-center">
                <StatusBadge status={domain.status} />
              </div>

              {/* Billing Period */}
              <div className="flex items-center">
                <span className="text-[#5c7cfa] text-sm font-medium tracking-[-0.7px]" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}>
                  {domain.billingPeriod}
                </span>
              </div>

              {/* Expiration Date */}
              <div className="flex items-center">
                <span className="text-[#4b5563] text-sm font-medium tracking-[-0.7px]" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}>
                  {domain.expirationDate}
                </span>
              </div>

              {/* Created Date */}
              <div className="flex items-center">
                <span className="text-[#4b5563] text-sm font-medium tracking-[-0.7px]" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}>
                  {domain.created}
                </span>
              </div>

              {/* Three Dot Menu */}
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => router.push(domain.id ? `/dashboard/${domain.id}` : "/dashboard")}
                >
                  <ThreeDotMenu />
                </button>
              </div>

              {/* Hover Menu */}
              {hoveredRow === domain.id && (
                <div className="absolute right-[40px] top-[50%] transform -translate-y-1/2 bg-white shadow-lg rounded-[8px] py-[8px] px-[12px] z-10 border border-[#e5e7eb] min-w-[180px]">
                  <button
                    type="button"
                    onClick={() => router.push(domain.id ? `/dashboard/${domain.id}` : "/dashboard")}
                    className="flex items-center gap-[8px] py-[6px] px-[8px] hover:bg-[#f5f7fa] rounded-[4px] w-full text-left"
                  >
                    <div className="w-[16px] h-[16px] flex items-center justify-center">
                      <svg className="w-[8px] h-[8px]" viewBox="0 0 8 8" fill="none">
                        <path d={svgPaths.p478eb80} stroke="#4B5563" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.8" />
                        <path d={svgPaths.p3d8089e4} stroke="#4B5563" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={svgPaths.p10d33ac0} stroke="#4B5563" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3.44308 5.5H4.55308" stroke="#4B5563" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3.16699 4.16699H4.83366" stroke="#4B5563" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-[#4b5563] text-[14px] tracking-[-0.7px]" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}>
                      Manage
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={domain.billingPeriod === "Free" || actionLoadingId === domain.id}
                    onClick={() => void handleCancelSubscription(domain)}
                    className="flex items-center gap-[8px] py-[6px] px-[8px] hover:bg-[#f5f7fa] rounded-[4px] w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-[16px] h-[16px] flex items-center justify-center">
                      <svg className="w-[8px] h-[8px]" viewBox="0 0 8 8" fill="none">
                        <path d={svgPaths.p478eb80} stroke="#8A1111" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.8" />
                        <path d={svgPaths.p3d8089e4} stroke="#8A1111" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={svgPaths.p10d33ac0} stroke="#8A1111" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-[#8A1111] text-[14px] tracking-[-0.7px]" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}>
                      {actionLoadingId === domain.id ? "Cancelling..." : "Cancel subscription"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ))}
          {!loading && sortedRows.length === 0 ? (
            <div className="px-[20px] py-[16px] text-sm text-[#6b7280]">
              No domains found.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
