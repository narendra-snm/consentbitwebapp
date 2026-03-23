"use client";
import { useMemo, useState } from 'react';
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

interface Domain {
  id: string;
  url: string;
  status: 'Active' | 'Inactive' | 'Expired';
  billingPeriod: 'Yearly' | 'Monthly' | 'Free';
  expirationDate: string;
  created: string;
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

const FilterButton = ({ label }: { label: string }) => {
  return (
    <button className="bg-[rgba(255,255,255,0.5)] border border-[rgba(139,119,249,0.3)] rounded-[50px] h-[38px] px-[19px] py-[13px] flex items-center gap-[40px]">
      <span className="text-[#4b5563] text-[15px] tracking-[-0.75px] whitespace-nowrap" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontVariationSettings: "'opsz' 14" }}>
        {label}
      </span>
      <div className="flex items-center justify-center w-[14px] h-[9px]">
        <div className="rotate-90">
          <span className="text-[#4b5563] text-[15px] tracking-[-0.75px]" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontVariationSettings: "'opsz' 14" }}>{'>'}</span>
        </div>
      </div>
    </button>
  );
};

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

export function DomainManagementDashboard() {
  const router = useRouter();
  const { sites, loading, refresh } = useDashboardSession();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const rows = useMemo<Domain[]>(() => {
    const list = Array.isArray(sites) ? sites : [];
    return list.map((site: any) => {
      const createdDate = site?.createdAt ?? site?.created_at;
      const created = createdDate
        ? new Date(createdDate).toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "2-digit",
          })
        : "-";
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
        status,
        billingPeriod,
        expirationDate,
        created,
        subscriptionId: site?.subscriptionId ? String(site.subscriptionId) : null,
        stripeSubscriptionId: site?.stripeSubscriptionId ? String(site.stripeSubscriptionId) : null,
      };
    });
  }, [sites]);

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
        <div className="flex items-center gap-[11px]">
          <FilterButton label="Active" />
          <FilterButton label="Status" />
          <FilterButton label="Billing Period" />
          <FilterButton label="Expiration Date" />
          <FilterButton label="Created" />
          <button className="bg-[rgba(255,255,255,0.5)] border border-[rgba(139,119,249,0.3)] rounded-[50px] w-[38px] h-[38px] flex items-center justify-center">
            <div className="rotate-45 flex items-center justify-center">
              <svg className="w-[12px] h-[12px]" viewBox="0 0 13.5 13.5" fill="none">
                <path d="M0.75 6.75H12.75" stroke="#4B5563" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                <path d="M6.75 12.75V0.75" stroke="#4B5563" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              </svg>
            </div>
          </button>
        </div>
        {actionError ? (
          <p className="mt-2 text-sm text-red-600">{actionError}</p>
        ) : null}
      </div>

      {/* Table */}
      <div className="w-full">
        {/* Table Header */}
        <div className="grid grid-cols-[219px_1fr_1fr_1fr_1fr_auto] gap-x-[20px] px-[23px] py-[18px] border-b border-[#9FBCE433] rounded-t-[10px] bg-[#F2F7FF]">
          <div className="text-[#4b5563] text-sm font-medium tracking-[-0.75px] " style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}>Active</div>
          <div className="text-[#4b5563] text-sm font-medium tracking-[-0.75px] " style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontVariationSettings: "'opsz' 14" }}>Status</div>
          <div className="text-[#4b5563] text-sm font-medium tracking-[-0.75px] " style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontVariationSettings: "'opsz' 14" }}>Billing Period</div>
          <div className="text-[#4b5563] text-sm font-medium tracking-[-0.75px] " style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontVariationSettings: "'opsz' 14" }}>Expiration Date</div>
          <div className="text-[#4b5563] text-sm font-medium tracking-[-0.75px] " style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontVariationSettings: "'opsz' 14" }}>Created</div>
          <div className="w-[17px]"></div>
        </div>

        {/* Table Rows */}
        <div className="bg-[#fafbfc]">
          {rows.map((domain) => (
            <div
              key={domain.id}
              className="grid grid-cols-[219px_1fr_1fr_1fr_1fr_auto] gap-x-[20px] px-[20px] py-[16px] border-b border-[#e5e7eb] relative group hover:bg-[#f5f7fa] transition-colors"
              onMouseEnter={() => setHoveredRow(domain.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* Domain URL */}
              <div className="text-[#4b5563] text-sm font-medium tracking-[-0.7px]" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontVariationSettings: "'opsz' 14" }}>
                {domain.url}
              </div>

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
          {!loading && rows.length === 0 ? (
            <div className="px-[20px] py-[16px] text-sm text-[#6b7280]">
              No domains found.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
