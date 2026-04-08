
"use client";
export const runtime = 'edge';
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileForm from "./component/ProfileForm";
import BillingPage from "./component/BillingPage";
import { useDashboardSession } from "../DashboardSessionProvider";
import { getBillingUsage, renameSite, checkSiteDomainForRename, type BillingUsage } from "@/lib/client-api";
import {
  normalizeSiteLabel,
  isDuplicateDomainForOthers,
  validateManageDomain,
  deriveSiteNameFromDomain,
} from "@/lib/site-manage-helpers";
import InstallConsentModal from "../components/InstallConsentModal";

const usageMemoryCache = new Map<string, { data: BillingUsage; ts: number }>();
// Keep usage cache short so metered pageviews/scans feel "live" without manual refresh.
const USAGE_TTL_MS = 10_000;

const svgPaths = {
  p243d2300: "M2 12.88V11.12C2 10.08 2.85 9.22 3.9 9.22C5.71 9.22 6.45 7.94 5.54 6.37C5.02 5.47 5.33 4.3 6.24 3.78L7.97 2.79C8.76 2.32 9.78 2.6 10.25 3.39L10.36 3.58C11.26 5.15 12.74 5.15 13.65 3.58L13.76 3.39C14.23 2.6 15.25 2.32 16.04 2.79L17.77 3.78C18.68 4.3 18.99 5.47 18.47 6.37C17.56 7.94 18.3 9.22 20.11 9.22C21.15 9.22 22.01 10.07 22.01 11.12V12.88C22.01 13.92 21.16 14.78 20.11 14.78C18.3 14.78 17.56 16.06 18.47 17.63C18.99 18.54 18.68 19.7 17.77 20.22L16.04 21.21C15.25 21.68 14.23 21.4 13.76 20.61L13.65 20.42C12.75 18.85 11.27 18.85 10.36 20.42L10.25 20.61C9.78 21.4 8.76 21.68 7.97 21.21L6.24 20.22C5.33 19.7 5.02 18.53 5.54 17.63C6.45 16.06 5.71 14.78 3.9 14.78C2.85 14.78 2 13.92 2 12.88Z",
};

type TabType = "general" | "billing" | "organizations" | "usage";

type Organization = {
  siteId?: string;
  siteUrl: string;
  siteName: string;
  createdDate: string;
  plan: "Free" | "Basic" | "Essential" | "Growth";
  isPaid: boolean;
  nextRenewal?: string;
};

type PlanTier = "Free" | "Basic" | "Essential" | "Growth";

function fmtDate(raw: unknown): string {
  const s = raw ? String(raw) : "";
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function fmtLongDate(raw: unknown): string | undefined {
  const s = raw ? String(raw) : "";
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function toPlanLabel(raw: unknown): PlanTier {
  const v = String(raw || "").toLowerCase();
  if (v === "basic") return "Basic";
  if (v === "essential") return "Essential";
  if (v === "growth") return "Growth";
  if (v === "pro" || v === "paid") return "Essential";
  return "Free";
}

// Shared grid column definition — single source of truth
const TABLE_GRID = "grid-cols-[1fr_1fr_1fr_1.4fr_1.4fr_180px]";

export default function SettingsPage() {
  const router = useRouter();
  const { user, organizations: orgsFromSession, sites, loading, effectivePlanId, activeOrganizationId, activeSiteId, updateSiteInState, refresh } =
    useDashboardSession();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  const profileTabKey = useMemo(() => {
    const uid = String(user?.id || "").trim();
    // Per-user key is enough; usage/billing are scoped by selected org/site anyway.
    return uid ? `cb_profile_active_tab:${uid}` : "cb_profile_active_tab";
  }, [user?.id]);

  const [activeTab, setActiveTab] = useState<TabType>("general");

  // Restore last selected tab when returning to profile page.
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(profileTabKey);
      if (raw === "general" || raw === "billing" || raw === "organizations" || raw === "usage") {
        setActiveTab(raw);
      }
    } catch {
      // ignore
    }
  }, [hydrated, profileTabKey]);

  // Persist tab selection across navigation within the dashboard session.
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(profileTabKey, activeTab);
    } catch {
      // ignore
    }
  }, [activeTab, hydrated, profileTabKey]);
  const isActive = (tab: TabType) => activeTab === tab;
  const [managingOrg, setManagingOrg] = useState<Organization | null>(null);
  const [manageDomain, setManageDomain] = useState('');
  const [manageSaving, setManageSaving] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [installModal, setInstallModal] = useState<{ scriptUrl: string; siteDomain: string; siteId: string; cdnScriptId?: string } | null>(null);

  const ORGS_PER_PAGE = 5;
  const [orgPage, setOrgPage] = useState(1);

  const accountOwnerEmail = useMemo(
    () => String(user?.email || "").trim() || "—",
    [user?.email],
  );
  const accountOwnerName = useMemo(
    () => String(user?.name || "").trim() || "—",
    [user?.name],
  );
  const accountId = useMemo(() => {
    const firstOrg = Array.isArray(orgsFromSession) ? orgsFromSession[0] : null;
    const raw = user?.id ?? firstOrg?.id ?? firstOrg?.organizationId ?? firstOrg?.organization_id;
    return raw ? String(raw) : "—";
  }, [orgsFromSession, user?.id]);

  const organizations = useMemo<Organization[]>(() => {
    const rows = Array.isArray(sites) ? sites : [];
    return rows.map((site: any) => {
      const rawPlan =
        site?.planId ??
        site?.plan_id ??
        site?.subscription_plan ??
        site?.plan;
      const plan = toPlanLabel(rawPlan);
      const isPaid = plan !== "Free";
      const nextRenewal =
        fmtLongDate(site?.nextRenewal ?? site?.next_renewal ?? site?.subscriptionCurrentPeriodEnd) ||
        undefined;

      return {
        siteId: site?.id ? String(site.id) : undefined,
        siteUrl: String(site?.domain || "—"),
        siteName: String(site?.name || site?.domain || "—"),
        createdDate: fmtDate(site?.createdAt ?? site?.created_at),
        plan,
        isPaid,
        nextRenewal,
      };
    });
  }, [sites]);

  const orgTotalPages = Math.max(1, Math.ceil(organizations.length / ORGS_PER_PAGE));
  const pagedOrganizations = organizations.slice((orgPage - 1) * ORGS_PER_PAGE, orgPage * ORGS_PER_PAGE);

  const currentPlan = useMemo<PlanTier>(() => {
    const rows = Array.isArray(sites) ? sites : [];
    const selectedSite =
      rows.find((site: any) => String(site?.id) === String(activeSiteId)) || null;
    const selectedSitePlan =
      selectedSite?.planId ??
      selectedSite?.plan_id ??
      selectedSite?.subscription_plan ??
      selectedSite?.plan;
    return toPlanLabel(selectedSitePlan ?? effectivePlanId);
  }, [activeSiteId, effectivePlanId, sites]);
  const resolvedSiteId = useMemo(() => {
    const rows = Array.isArray(sites) ? sites : [];
    const selectedSite =
      rows.find((site: any) => String(site?.id) === String(activeSiteId)) || rows[0] || null;
    return selectedSite?.id ? String(selectedSite.id) : null;
  }, [activeSiteId, sites]);
  const domainCount = useMemo(() => {
    const rows = Array.isArray(sites) ? sites : [];
    return rows.length;
  }, [sites]);
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  const fetchUsage = useCallback(
    async (
      orgId: string,
      siteId: string | null,
      { silent = false, force = false }: { silent?: boolean; force?: boolean } = {},
    ) => {
      const cacheKey = `${orgId}:${siteId || "org"}`;
      const now = Date.now();

      // 1. Memory cache hit
      if (!force) {
        const mem = usageMemoryCache.get(cacheKey);
        if (mem && now - mem.ts < USAGE_TTL_MS) {
          setUsage(mem.data);
          setUsageError(null);
          return;
        }
      }

      // 2. sessionStorage hit
      if (!force && typeof window !== "undefined") {
        try {
          const raw = window.sessionStorage.getItem(`billing-usage:${cacheKey}`);
          if (raw) {
            const parsed = JSON.parse(raw) as { data?: BillingUsage; ts?: number };
            if (parsed?.data && parsed?.ts && now - parsed.ts < USAGE_TTL_MS) {
              usageMemoryCache.set(cacheKey, { data: parsed.data, ts: parsed.ts });
              setUsage(parsed.data);
              setUsageError(null);
              return;
            }
          }
        } catch { /* ignore */ }
      }

      // 3. Network fetch
      if (!silent) {
        setUsageLoading(true);
        setUsageError(null);
      }

      try {
        const res = await getBillingUsage(orgId, siteId || undefined);
        setUsage(res);
        setUsageError(null);
        const entry = { data: res, ts: Date.now() };
        usageMemoryCache.set(cacheKey, entry);
        try { window.sessionStorage.setItem(`billing-usage:${cacheKey}`, JSON.stringify(entry)); } catch { /* ignore */ }
      } catch (e) {
        if (!silent) {
          setUsageError((e as Error)?.message || "Failed to load usage");
        }
        // silent failures are swallowed — user will see a retry button when they open the tab
      } finally {
        if (!silent) setUsageLoading(false);
      }
    },
    [],
  );

  // Refetch when org, selected site (header dropdown), or tab changes — previously we only prefetched
  // once and only loaded when usage was null, so switching sites never updated the numbers.
  useEffect(() => {
    if (!activeOrganizationId) return;
    const shouldBeLive = activeTab === "usage" || activeTab === "billing";
    void fetchUsage(activeOrganizationId, resolvedSiteId, {
      silent: !shouldBeLive,
      force: shouldBeLive,
    });
  }, [activeOrganizationId, resolvedSiteId, activeTab, fetchUsage]);

  // When the user comes back to the tab/window, refresh usage so it reflects latest meter values.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeOrganizationId) return;
    if (activeTab !== "usage" && activeTab !== "billing") return;
    const onFocus = () => {
      void fetchUsage(activeOrganizationId, resolvedSiteId, { silent: true, force: true });
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [activeOrganizationId, resolvedSiteId, activeTab, fetchUsage]);

  // Keep first server+client paint identical to avoid hydration mismatch while session cache hydrates.
  if (!hydrated || loading) {
    return (
      <div className="size-full bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-[3px] border-[#007AFF] border-t-transparent animate-spin" />
          <p className="text-[14px] text-[#6b7280] font-medium">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full bg-white min-h-[calc(100vh-100px)]">
      <div className="h-[1px] bg-black/10 w-full" />

      {/* Header */}
      <div className="pl-[205px] pr-8 flex items-center justify-between border-b border-black/10">
        <p className=" pl-5.5 py-5.5 border-l border-black/10 font-semibold leading-[20px] text-[16px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
          Profile Settings
        </p>
        <div className="flex items-center gap-[19px]">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-[#4b5563] h-[36px] min-w-[174px] rounded-[6px] border border-[#4b5563] flex items-center justify-center"
          >
            <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-xs text-white whitespace-pre flex items-center gap-1" style={{ fontVariationSettings: "'opsz' 14" }}>
              <svg width="9" height="8" viewBox="0 0 9 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.97496 7.95174L-0.000887752 3.97589L3.97496 3.29018e-05L4.74201 0.758556L2.07866 3.42191H8.769V4.52986H2.07866L4.74201 7.18895L3.97496 7.95174Z" fill="white" />
              </svg>
              Go back to dashboard
            </p>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-[206px_1fr] min-h-[calc(100vh-166px)]">
        {/* Sidebar */}
        <div className="border-r border-black/10 pt-[20px]">
          {/* General Tab */}
          <button onClick={() => setActiveTab("general")} className={`w-full h-[64px] flex items-center px-[53px] gap-[15px] relative ${isActive("general") ? "bg-[#e6f1fd]" : ""}`}>
            {isActive("general") && <div className="absolute right-0 top-0 h-full w-[3px] bg-[#007AFF]" />}
            <div className="size-[24px]">
              <svg fill="none" viewBox="0 0 24 24">
                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke={isActive("general") ? "#007AFF" : "#111827"} strokeWidth="1.5" />
                <path d={svgPaths.p243d2300} stroke={isActive("general") ? "#007AFF" : "#111827"} strokeWidth="1.5" />
              </svg>
            </div>
            <p className={`font-medium text-[16px] tracking-[-0.48px] ${isActive("general") ? "text-[#007aff]" : "text-[#111827]"}`}>General</p>
          </button>

          {/* Billing Tab */}
          <button onClick={() => setActiveTab("billing")} className={`w-full h-[64px] flex items-center px-[53px] gap-[15px] relative ${isActive("billing") ? "bg-[#e6f1fd] text-[#007aff]" : ""}`}>
            {isActive("billing") && <div className="absolute right-0 top-0 h-full w-[3px] bg-[#007AFF]" />}
            <div className="size-[24px]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.37 8.88086H17.62" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.38 8.88086L7.13 9.63086L9.38 7.38086" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12.37 15.8809H17.62" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.38 15.8809L7.13 16.6309L9.38 14.3809" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className={`text-[16px] tracking-[-0.48px] ${isActive("billing") ? "text-[#007aff]" : "text-[#111827]"}`}>Billing</p>
          </button>

          {/* Organizations Tab */}
          <button onClick={() => setActiveTab("organizations")} className={`w-full h-[64px] flex items-center pl-[53px] pr-4.5 gap-[15px] relative ${isActive("organizations") ? "bg-[#e6f1fd] text-[#007aff]" : ""}`}>
            {isActive("organizations") && <div className="absolute right-0 top-0 h-full w-[3px] bg-[#007AFF]" />}
            <div className="size-[24px]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 10H19C21 10 22 9 22 7V5C22 3 21 2 19 2H17C15 2 14 3 14 5V7C14 9 15 10 17 10Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 22H7C9 22 10 21 10 19V17C10 15 9 14 7 14H5C3 14 2 15 2 17V19C2 21 3 22 5 22Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 10C8.20914 10 10 8.20914 10 6C10 3.79086 8.20914 2 6 2C3.79086 2 2 3.79086 2 6C2 8.20914 3.79086 10 6 10Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 22C20.2091 22 22 20.2091 22 18C22 15.7909 20.2091 14 18 14C15.7909 14 14 15.7909 14 18C14 20.2091 15.7909 22 18 22Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className={`text-[16px] tracking-[-0.48px] ${isActive("organizations") ? "text-[#007aff]" : "text-[#111827]"}`}>Organizations</p>
          </button>

          {/* Usage Overview Tab */}
          <button onClick={() => setActiveTab("usage")} className={`w-full h-[64px] flex items-center pl-[53px] pr-4.5 gap-[15px] relative ${isActive("usage") ? "bg-[#e6f1fd] text-[#007aff]" : ""}`}>
            {isActive("usage") && <div className="absolute right-0 top-0 h-full w-[3px] bg-[#007AFF]" />}
            <div className="size-[24px]">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 0.25C16.9273 0.25 21.75 5.07267 21.75 11C21.75 16.9273 16.9273 21.75 11 21.75C5.07267 21.75 0.25 16.9273 0.25 11C0.25 5.07267 5.07267 0.25 11 0.25ZM9.86914 2.02832C5.41332 2.58827 1.9502 6.39266 1.9502 11C1.9502 15.9902 6.00983 20.0498 11 20.0498C12.3113 20.0485 13.6067 19.7606 14.7949 19.2061L15.0508 19.0869L14.9014 18.8467L10.2793 11.4512L10.2783 11.4502C10.282 11.456 10.2818 11.4586 10.2764 11.4443C10.2749 11.4405 10.2695 11.4248 10.2656 11.415C10.2609 11.403 10.2546 11.3872 10.2461 11.3701L10.2441 11.3672L10.2051 11.2783C10.1823 11.2181 10.1658 11.1556 10.1572 11.0918L10.1504 10.9951V1.99219L9.86914 2.02832ZM12.7734 12.2324L16.3447 17.9482L16.4951 18.1885L16.7148 18.0098C18.5154 16.5416 19.6816 14.4359 19.9717 12.1309L20.0078 11.8496H12.5342L12.7734 12.2324ZM11.8496 10.1504H20.0078L19.9717 9.86816C19.7178 7.87751 18.8106 6.0274 17.3916 4.6084C15.9726 3.18939 14.1225 2.28216 12.1318 2.02832L11.8496 1.99219V10.1504Z" fill="currentColor" stroke="white" strokeWidth="0.5" />
              </svg>
            </div>
            <p className={`text-[16px] text-left tracking-[-0.48px] ${isActive("usage") ? "text-[#007aff]" : "text-[#111827]"}`}>Usage Overview</p>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="px-6.25 py-7 overflow-x-auto">
          {activeTab === "organizations" && (
            <>
              <p className=" font-semibold leading-[20px] text-[16px] text-black tracking-[-1px] mb-[8px]" style={{ fontVariationSettings: "'opsz' 14" }}>
                Account Owner :
              </p>
              <div className="bg-[#e6f1fd] border border-[#cadbee] rounded-[8px] px-3.5 pr-2 py-1.5 flex items-center justify-between mb-[40px]">
                <div>
                  <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[13px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>{accountOwnerEmail}</p>
                  <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[13px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>Acc ID: {accountId}</p>
                  <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[13px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                    Current Plan: {currentPlan}
                  </p>
                </div>
              </div>

              {/* Organizations Table */}
              <div className="bg-[#fbfbfb] border border-[#ebebeb] rounded-[10px] ">
                {/* Table Header */}
                <div className="px-[13px] py-[20px] border-b border-black/10">
                  <div className="flex items-center justify-between mb-[29px]">
                    <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[16px] text-black tracking-[-1px]" style={{ fontVariationSettings: "'opsz' 14" }}>Organization</p>
                    <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[13px] text-black text-center w-full" style={{ fontVariationSettings: "'opsz' 14" }}>Acc ID: {accountId}</p>
                  </div>

                  {/* Column Headers — same grid as rows */}
                  <div className={`grid ${TABLE_GRID} gap-x-4 items-center`}>
                    {["Site URL", "Site Name", "Created Date", "Plan", "Next renewal"].map((col) => (
                      <p key={col} className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[14px] text-black tracking-[-0.5px]" style={{ fontVariationSettings: "'opsz' 14" }}>
                        {col}
                      </p>
                    ))}
                    <div />
                  </div>
                </div>

                {/* Table Rows */}
                {pagedOrganizations.map((org, index) => (
                  <div key={index}>
                    <div className={`px-[13px] py-4 grid ${TABLE_GRID} gap-x-4 items-center`}>
                      {/* Site URL */}
                      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[14px] text-black truncate" style={{ fontVariationSettings: "'opsz' 14" }}>
                        {org.siteUrl}
                      </p>

                      {/* Site Name */}
                      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[14px] text-black truncate" style={{ fontVariationSettings: "'opsz' 14" }}>
                        {org.siteName}
                      </p>

                      {/* Created Date */}
                      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                        {org.createdDate}
                      </p>

                      {/* Plan */}
                      <div className="min-w-0">
                        {org.isPaid ? (
                          <div>
                            <div className="flex items-center gap-[8px] mb-[4px]">
                              <div className="bg-[#69B4FF73] h-[19px] px-[8px] rounded-[50px] flex items-center justify-center">
                                <p className="font-medium leading-[normal] text-[#007aff] text-[10px] tracking-[-0.5px]" style={{ fontVariationSettings: "'opsz' 14" }}>{org.plan}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>{org.plan}</p>
                        )}
                      </div>

                      {/* Next Renewal */}
                      <div className="min-w-0">
                        {org.nextRenewal ? (
                          <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[14px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>{org.nextRenewal}</p>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(org.siteId ? `/dashboard/${org.siteId}/upgrade` : "/dashboard")
                            }
                            className="bg-[#007aff] h-[36px] px-[14px] rounded-[8px] border border-[#007aff] flex items-center justify-center"
                          >
                            <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[12px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>Start Trial</p>
                          </button>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-[10px]">
                        {org.isPaid && (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(org.siteId ? `/dashboard/${org.siteId}/upgrade` : "/dashboard")
                            }
                            className="h-[36px] px-[14px] rounded-[8px] border border-[#007aff] flex items-center justify-center shrink-0"
                          >
                            <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[#007aff] text-[12px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>Change Plan</p>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setManagingOrg(org);
                            setManageDomain(org.siteUrl === "—" ? "" : org.siteUrl);
                            setManageError(null);
                          }}
                          className="h-[36px] px-[14px] rounded-[8px] border border-[#007aff] flex items-center justify-center shrink-0"
                        >
                          <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[#007aff] text-[12px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>Manage</p>
                        </button>
                      </div>
                    </div>
                    {index < pagedOrganizations.length - 1 && <div className="h-[1px] bg-black/10 mx-[2px]" />}
                  </div>
                ))}
                {!loading && organizations.length === 0 ? (
                  <div className="px-[13px] py-6 text-sm text-[#6b7280]">
                    No organizations found.
                  </div>
                ) : null}

                {/* Organizations Pagination */}
                {orgTotalPages > 1 && (
                  <div className="flex items-center justify-between px-[13px] py-3 border-t border-black/10">
                    <p className="text-[12px] text-[#6b7280]">
                      {(orgPage - 1) * ORGS_PER_PAGE + 1}–{Math.min(orgPage * ORGS_PER_PAGE, organizations.length)} of {organizations.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setOrgPage((p) => Math.max(1, p - 1))}
                        disabled={orgPage === 1}
                        className="w-7 h-7 flex items-center justify-center rounded border border-[#e5e5e5] text-[#4b5563] disabled:opacity-40 hover:bg-[#f3f4f6]"
                      >
                        <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M5 1L1 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      {Array.from({ length: orgTotalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setOrgPage(p)}
                          className={`w-7 h-7 flex items-center justify-center rounded text-[12px] font-medium border ${p === orgPage ? "bg-[#007AFF] text-white border-[#007AFF]" : "border-[#e5e5e5] text-[#4b5563] hover:bg-[#f3f4f6]"}`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setOrgPage((p) => Math.min(orgTotalPages, p + 1))}
                        disabled={orgPage === orgTotalPages}
                        className="w-7 h-7 flex items-center justify-center rounded border border-[#e5e5e5] text-[#4b5563] disabled:opacity-40 hover:bg-[#f3f4f6]"
                      >
                        <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1L5 5L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "general" && (
            <div className="text-center">
              <ProfileForm name={accountOwnerName} email={accountOwnerEmail} />
            </div>
          )}

          {activeTab === "billing" && (
            <div className="text-left">
              <BillingPage
                currentPlan={currentPlan}
                domainCount={domainCount}
                organizationId={activeOrganizationId}
                activeSiteId={resolvedSiteId}
                scansCount={usage?.scansUsed ?? 0}
                pageViews={usage?.pageviewsUsed ?? 0}
                userName={accountOwnerName}
                userEmail={accountOwnerEmail}
                sites={(Array.isArray(sites) ? sites : []).map((s: any) => ({
                  id: String(s.id || ""),
                  domain: String(s.domain || ""),
                  name: String(s.name || s.domain || ""),
                }))}
              />
            </div>
          )}

          {activeTab === "usage" && (
            <div className="max-w-[980px] bg-[#fbfbfb] border border-[#ebebeb] rounded-[10px] p-6 text-left">
              <p className="font-semibold text-[18px] text-black mb-4">Usage Overview</p>
              {usageLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin" />
                  <p className="text-sm text-[#6b7280]">Loading usage…</p>
                </div>
              ) : usageError ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-[#b91c1c]">{usageError}</p>
                  <button
                    onClick={() => {
                      if (!activeOrganizationId) return;
                      setUsageError(null);
                      void fetchUsage(activeOrganizationId, resolvedSiteId);
                    }}
                    className="self-start bg-[#007AFF] text-white text-sm font-medium px-4 py-2 rounded-[6px]"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-[#e5e5e5] rounded-lg p-4">
                    <p className="text-sm text-[#4b5563]">Pageviews</p>
                    <p className="text-xl font-semibold text-[#111827]">
                      {usage?.pageviewsUsed ?? 0} / {usage?.pageviewsLimit ?? 0}
                    </p>
                  </div>
                  <div className="bg-white border border-[#e5e5e5] rounded-lg p-4">
                    <p className="text-sm text-[#4b5563]">Scans</p>
                    <p className="text-xl font-semibold text-[#111827]">
                      {usage?.scansUsed ?? 0} / {usage?.scansLimit ?? 0}
                    </p>
                  </div>
                  <div className="bg-white border border-[#e5e5e5] rounded-lg p-4">
                    <p className="text-sm text-[#4b5563]">Sites</p>
                    <p className="text-xl font-semibold text-[#111827]">
                      {usage?.sitesUsed ?? domainCount} / {usage?.sitesLimit ?? domainCount}
                    </p>
                  </div>
                  <div className="bg-white border border-[#e5e5e5] rounded-lg p-4">
                    <p className="text-sm text-[#4b5563]">Billing Cycle</p>
                    <p className="text-xl font-semibold text-[#111827]">
                      {usage?.yearMonth || "-"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Manage Site Modal */}
      {managingOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] shadow-xl max-w-md w-full p-6 relative">
            <button
              type="button"
              onClick={() => {
                setManagingOrg(null);
              }}
              className="absolute right-4 top-4 text-[#9ca3af] hover:text-[#374151] text-2xl leading-none"
              disabled={manageSaving}
            >
              ×
            </button>
            <p className="font-semibold text-[16px] text-black mb-1">Manage Site</p>
            <p className="text-[12px] text-[#6b7280] mb-5">
              Update the registered website URL for this site. The name shown in your list uses the same host.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[12px] text-[#6b7280] mb-1">Website URL</label>
                <input
                  type="text"
                  value={manageDomain}
                  onChange={(e) => {
                    setManageDomain(e.target.value);
                    setManageError(null);
                  }}
                  disabled={manageSaving}
                  className="w-full h-[38px] border border-[#e5e5e5] rounded-[8px] px-3 text-[13px] text-black focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                  placeholder="example.com"
                />
                <p className="text-[11px] text-[#9ca3af] mt-1">This updates the Site URL column (registered domain).</p>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6b7280]">Plan</span>
                <span className="text-black font-medium">{managingOrg.plan}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6b7280]">Created</span>
                <span className="text-black font-medium">{managingOrg.createdDate}</span>
              </div>
              {managingOrg.nextRenewal && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6b7280]">Next Renewal</span>
                  <span className="text-black font-medium">{managingOrg.nextRenewal}</span>
                </div>
              )}
            </div>

            {manageError && (
              <p className="text-[12px] text-red-600 mb-3">{manageError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setManagingOrg(null);
                }}
                disabled={manageSaving}
                className="flex-1 h-[38px] rounded-[8px] border border-[#e5e5e5] text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={manageSaving || !manageDomain.trim()}
                onClick={async () => {
                  if (!manageDomain.trim() || !managingOrg.siteId) return;
                  setManageError(null);
                  const domainErr = validateManageDomain(manageDomain);
                  if (domainErr) {
                    setManageError(domainErr);
                    return;
                  }
                  if (isDuplicateDomainForOthers(sites, managingOrg.siteId, manageDomain.trim())) {
                    setManageError(
                      "This website URL is already used by another site in your account.",
                    );
                    return;
                  }
                  const derivedName = deriveSiteNameFromDomain(manageDomain.trim());
                  setManageSaving(true);
                  try {
                    const preflight = await checkSiteDomainForRename(
                      manageDomain.trim(),
                      managingOrg.siteId,
                    );
                    if (!preflight.success) {
                      setManageError(preflight.error || "Could not validate this website URL.");
                      return;
                    }
                    if (preflight.available === false) {
                      setManageError(
                        preflight.message ||
                          "This website URL is not available. Choose a different URL.",
                      );
                      return;
                    }
                    const result = await renameSite(
                      managingOrg.siteId,
                      derivedName,
                      manageDomain.trim(),
                    );
                    const updatedSite = (result.site || {}) as Record<string, unknown>;
                    const rawSite = (Array.isArray(sites) ? sites : []).find((s: any) => String(s.id) === managingOrg.siteId);
                    // `refresh()` replaces the whole `sites` array — run it first, then merge the PATCH
                    // response so a slightly stale dashboard-init cannot wipe name/domain in the UI.
                    try {
                      if (typeof sessionStorage !== "undefined") {
                        sessionStorage.removeItem("cbSessionCache");
                      }
                    } catch {
                      /* ignore */
                    }
                    await refresh({ showLoading: false });
                    const normDomain = normalizeSiteLabel(manageDomain.trim());
                    updateSiteInState({
                      id: managingOrg.siteId,
                      ...updatedSite,
                      name: String(updatedSite.name ?? derivedName),
                      domain: String(updatedSite.domain ?? normDomain),
                    });
                    const scriptUrl =
                      (updatedSite.embedScriptUrl as string | undefined) ??
                      (updatedSite.embed_script_url as string | undefined) ??
                      rawSite?.embedScriptUrl ??
                      rawSite?.embed_script_url ??
                      "";
                    const cdnScriptId =
                      (updatedSite.cdnScriptId as string | undefined) ??
                      (updatedSite.cdn_script_id as string | undefined) ??
                      rawSite?.cdnScriptId ??
                      rawSite?.cdn_script_id;
                    const domainForInstall =
                      updatedSite.domain != null && String(updatedSite.domain).trim() !== ""
                        ? String(updatedSite.domain)
                        : normDomain;
                    setManagingOrg(null);
                    setInstallModal({
                      scriptUrl,
                      siteDomain: domainForInstall,
                      siteId: managingOrg.siteId,
                      cdnScriptId: cdnScriptId ? String(cdnScriptId) : undefined,
                    });
                  } catch (e: any) {
                    const code = e?.code as string | undefined;
                    if (code === "DOMAIN_EXISTS_OTHER_ACCOUNT") {
                      setManageError(
                        "This website URL is already registered to another ConsentBit account.",
                      );
                    } else if (code === "DOMAIN_EXISTS_SAME_ACCOUNT") {
                      setManageError(
                        "This website URL is already used by another site in your account.",
                      );
                    } else if (code === "DUPLICATE_SITE_NAME") {
                      setManageError(
                        "This site name is already used by another site in your account. Choose a different URL.",
                      );
                    } else if (code === "DOMAIN_REQUIRED" || code === "INVALID_DOMAIN") {
                      setManageError(
                        e.message || "Enter a valid website URL.",
                      );
                    } else {
                      setManageError(e.message || "Failed to update site");
                    }
                  } finally {
                    setManageSaving(false);
                  }
                }}
                className="flex-1 h-[38px] rounded-[8px] bg-[#007aff] text-white text-[13px] font-medium hover:bg-[#0062cc] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {manageSaving ? 'Saving…' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install ConsentBit modal — shown after successful site rename */}
      {installModal && (
        <InstallConsentModal
          key={installModal.siteId}
          open={true}
          scriptUrl={installModal.scriptUrl}
          siteDomain={installModal.siteDomain}
          siteId={installModal.siteId}
          cdnScriptId={installModal.cdnScriptId}
          onClose={() => setInstallModal(null)}
        />
      )}
    </div>
  );
}