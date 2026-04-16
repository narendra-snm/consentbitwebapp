
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getBillingInvoices,
  getBillingSummary,
  createBillingPortalSession,
  cancelSubscription,
  renameSite,
  checkSiteDomainForRename,
  type BillingInvoice,
  type BillingSummary,
} from "@/lib/client-api";
import {
  normalizeSiteLabel,
  isDuplicateDomainForOthers,
  validateManageDomain,
  deriveSiteNameFromDomain,
} from "@/lib/site-manage-helpers";
import { useRouter } from "next/navigation";
import { useDashboardSession } from "../../DashboardSessionProvider";
import BillingDetailsCard from "./BillingDetailsCard";

const svgPaths = {
  p112ba780: "M6.3 0H2.8C2.41395 0 2.1 0.31395 2.1 0.7V2.1H0.7C0.31395 2.1 0 2.41395 0 2.8V6.3C0 6.68605 0.31395 7 0.7 7H4.2C4.58605 7 4.9 6.68605 4.9 6.3V4.9H6.3C6.68605 4.9 7 4.58605 7 4.2V0.7C7 0.31395 6.68605 0 6.3 0ZM0.7 6.3V2.8H4.2L4.2007 6.3H0.7ZM6.3 4.2H4.9V2.8C4.9 2.41395 4.58605 2.1 4.2 2.1H2.8V0.7H6.3V4.2Z",
  pc41fd00: "M2.91667 3.5L4.08333 2.04167H3.20833V0H2.625V2.04167H1.75L2.91667 3.5Z",
  pbc14700: "M5.25 4.08333H0.583333V2.04167H0V4.08333C0 4.40504 0.261625 4.66667 0.583333 4.66667H5.25C5.57171 4.66667 5.83333 4.40504 5.83333 4.08333V2.04167H5.25V4.08333Z",
};

interface Invoice {
  date: string;
  invoiceNumber: string;
  amount: string;
  paymentMethod: string;
  status: string;
  siteName: string;
  siteId: string | null;
  hostedInvoiceUrl?: string | null;
  invoicePdf?: string | null;
}

type Props = {
  currentPlan: "Free" | "Basic" | "Essential" | "Growth";
  domainCount: number;
  organizationId?: string | null;
  activeSiteId?: string | null;
  scansCount?: number;
  pageViews?: number;
  userName?: string;
  userEmail?: string;
  sites?: { id: string; domain: string; name?: string }[];
};

// Simple in-memory cache to avoid refetch on each tab switch.
// Reset on module reload so stale data (without siteId) is never reused.
const invoiceCache = new Map<string, { rows: BillingInvoice[]; ts: number }>();
invoiceCache.clear();
const summaryCache = new Map<string, { data: BillingSummary; ts: number }>();
const CACHE_TTL_MS = 10_000;
/** Bump when invoice API shape/proxy changes so we do not reuse empty cached rows forever. */
const INVOICE_STORAGE_KEY = "billing-invoices:v3";

export default function BillingPage({
  currentPlan,
  domainCount,
  organizationId,
  activeSiteId,
  scansCount = 0,
  pageViews = 0,
  userName = "",
  userEmail = "",
  sites = [],
}: Props) {
  const router = useRouter();
  const { updateSiteInState, refresh, sites: sessionSites, setActiveSiteId } = useDashboardSession();

  const domainSites = useMemo(() => {
    const map = new Map<string, { id: string; domain: string; name?: string }>();
    const add = (arr: typeof sites) => {
      for (const s of arr || []) {
        const id = String((s as { id?: string })?.id || "").trim();
        if (!id || map.has(id)) continue;
        map.set(id, {
          id,
          domain: String((s as { domain?: string })?.domain || ""),
          name: String((s as { name?: string; domain?: string })?.name || (s as { domain?: string })?.domain || ""),
        });
      }
    };
    add(sites);
    add((Array.isArray(sessionSites) ? sessionSites : []) as typeof sites);
    return Array.from(map.values());
  }, [sites, sessionSites]);

  // Find the active site in session state — authoritative source for cancel status
  const activeSiteData = useMemo(
    () => (Array.isArray(sessionSites) ? sessionSites : []).find((s: any) => String(s?.id) === String(activeSiteId)) ?? null,
    [sessionSites, activeSiteId],
  );

  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [rawInvoices, setRawInvoices] = useState<BillingInvoice[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  /** Site selected in header (or first site) — editable registered URL on the plan card */
  const [planSiteDomain, setPlanSiteDomain] = useState("");
  const [planSiteError, setPlanSiteError] = useState<string | null>(null);
  const [planSiteSaving, setPlanSiteSaving] = useState(false);

  const domainSitesRef = useRef(domainSites);
  domainSitesRef.current = domainSites;
  const sessionSitesRef = useRef(sessionSites);
  sessionSitesRef.current = sessionSites;

  const planEditableSiteId = useMemo(
    () => activeSiteId || domainSites[0]?.id || null,
    [activeSiteId, domainSites],
  );

  // Only when the selected site changes — not on every sessionSites tick (would clear duplicate-name error early).
  useEffect(() => {
    if (!planEditableSiteId) {
      setPlanSiteDomain("");
      return;
    }
    const ss = sessionSitesRef.current;
    const fromSession = (Array.isArray(ss) ? ss : []).find(
      (x: { id?: string }) => String(x?.id) === String(planEditableSiteId),
    ) as { domain?: string } | undefined;
    const s = fromSession
      ? { domain: String(fromSession.domain ?? "") }
      : domainSitesRef.current.find((x) => String(x.id) === String(planEditableSiteId));
    if (!s) return;
    setPlanSiteDomain(String(s.domain ?? ""));
    setPlanSiteError(null);
  }, [planEditableSiteId]);

  // True if subscription is set to cancel at period end — checked from both summary and session site data
  const isCancelled =
    Boolean(summary?.cancelAtPeriodEnd) ||
    Boolean(summary?.cancel_at_period_end) ||
    Boolean(activeSiteData?.cancelAtPeriodEnd) ||
    Boolean(activeSiteData?.cancel_at_period_end) ||
    Number(activeSiteData?.subscriptionCancelAtPeriodEnd) === 1 ||
    Number(activeSiteData?.subscription_cancel_at_period_end) === 1;

  // Best available "access until" date
  const cancelDate =
    summary?.nextBillingDate ||
    summary?.currentPeriodEnd ||
    activeSiteData?.subscriptionCurrentPeriodEnd ||
    activeSiteData?.subscription_current_period_end ||
    activeSiteData?.nextRenewal ||
    activeSiteData?.next_renewal ||
    null;

  // Filter state
  const [filterYear, setFilterYear]     = useState<string>("all");
  const [filterMonth, setFilterMonth]   = useState<string>("all");
  const [filterDomain, setFilterDomain] = useState<string>("all");

  // Sync filterDomain when header dropdown changes (activeSiteId → table filter)
  useEffect(() => {
    if (activeSiteId) setFilterDomain(activeSiteId);
  }, [activeSiteId]);

  // Pagination
  const INVOICES_PER_PAGE = 5;
  const [invoicePage, setInvoicePage] = useState(1);

  // Load invoices
  useEffect(() => {
    if (!organizationId) { setRawInvoices([]); return; }
    const now = Date.now();
    const cached = invoiceCache.get(organizationId);
    if (cached && now - cached.ts < CACHE_TTL_MS) { setRawInvoices(cached.rows); return; }
    if (typeof window !== "undefined" && !cached) {
      try {
        const raw = window.sessionStorage.getItem(`${INVOICE_STORAGE_KEY}:${organizationId}`);
        if (raw) {
          const parsed = JSON.parse(raw) as { rows?: BillingInvoice[]; ts?: number };
          if (Array.isArray(parsed?.rows) && parsed?.ts && now - parsed.ts < CACHE_TTL_MS) {
            invoiceCache.set(organizationId, { rows: parsed.rows, ts: parsed.ts });
            setRawInvoices(parsed.rows);
            return;
          }
        }
      } catch { /* ignore */ }
    }
    let cancelled = false;
    setInvoiceLoading(true);
    setInvoiceError(null);
    getBillingInvoices(organizationId, 20)
      .then((res) => {
        if (!cancelled) {
          const rows = Array.isArray(res.invoices) ? res.invoices : [];
          setRawInvoices(rows);
          const entry = { rows, ts: Date.now() };
          invoiceCache.set(organizationId, entry);
          try { window.sessionStorage.setItem(`${INVOICE_STORAGE_KEY}:${organizationId}`, JSON.stringify(entry)); } catch { /* ignore */ }
        }
      })
      .catch((e) => { if (!cancelled) setInvoiceError(e?.message || "Failed to load invoices"); })
      .finally(() => { if (!cancelled) setInvoiceLoading(false); });
    return () => { cancelled = true; };
  }, [organizationId]);

  // Load billing summary (for payment method + billing details).
  // Re-fetch when activeSiteId changes — each site may have different billing address/country.
  useEffect(() => {
    if (!organizationId) { setSummary(null); return; }
    const cacheKey = `${organizationId}:${activeSiteId || ""}`;
    const now = Date.now();
    const cached = summaryCache.get(cacheKey);
    if (cached && now - cached.ts < CACHE_TTL_MS) { setSummary(cached.data); return; }
    setSummary(null);
    let cancelled = false;
    getBillingSummary(organizationId, activeSiteId)
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
          summaryCache.set(cacheKey, { data, ts: Date.now() });
        }
      })
      .catch(() => { /* silently ignore — payment method section will be hidden */ });
    return () => { cancelled = true; };
  }, [organizationId, activeSiteId]);

  // Derive unique years from raw invoices for the Year dropdown
  const availableYears = useMemo<number[]>(() => {
    const years = new Set<number>();
    for (const inv of rawInvoices) {
      if (inv.created) {
        const y = new Date(inv.created).getFullYear();
        if (!Number.isNaN(y)) years.add(y);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [rawInvoices]);

  // Reset to page 1 when filters change
  useEffect(() => { setInvoicePage(1); }, [filterYear, filterMonth, filterDomain]);

  // Mapped + filtered invoices
  const allFilteredInvoices = useMemo<Invoice[]>(() => {
    // If no invoices have a siteId (older worker), skip the domain filter entirely
    const hasSiteIds = (rawInvoices || []).some((inv) => !!inv.siteId);
    return (rawInvoices || [])
      .filter((inv) => {
        const d = inv.created ? new Date(inv.created) : null;
        if (!d || Number.isNaN(d.getTime())) return filterYear === "all" && filterMonth === "all";
        if (filterYear  !== "all" && String(d.getFullYear()) !== filterYear)  return false;
        if (filterMonth !== "all" && String(d.getMonth() + 1) !== filterMonth) return false;
        if (filterDomain !== "all" && hasSiteIds) {
          if (!inv.siteId || String(inv.siteId) !== String(filterDomain)) return false;
        }
        return true;
      })
      .map((inv) => {
        const created = inv.created ? new Date(inv.created) : null;
        const date = created && !Number.isNaN(created.getTime())
          ? created.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
          : "-";
        const amount = ((inv.amountPaid ?? inv.amountDue ?? 0) / 100).toFixed(2) + " USD";
        const status = String(inv.status || "open").toLowerCase() === "paid" ? "Completed" : String(inv.status || "Open");
        const siteMatch = inv.siteId
          ? domainSites.find((s) => String(s.id) === String(inv.siteId))
          : null;
        const siteName = siteMatch ? (siteMatch.domain || siteMatch.name || "") : "—";
        return {
          date,
          invoiceNumber: inv.number || inv.id,
          amount,
          paymentMethod: summary?.paymentMethod
            ? `Card ****${summary.paymentMethod.last4}`
            : "Card",
          status,
          siteName,
          siteId: inv.siteId ? String(inv.siteId) : null,
          hostedInvoiceUrl: inv.hostedInvoiceUrl,
          invoicePdf: inv.invoicePdf,
        };
      });
  }, [rawInvoices, summary, filterYear, filterMonth, filterDomain, domainSites]);

  const invoiceTotalPages = Math.max(1, Math.ceil(allFilteredInvoices.length / INVOICES_PER_PAGE));
  const invoices = allFilteredInvoices.slice((invoicePage - 1) * INVOICES_PER_PAGE, invoicePage * INVOICES_PER_PAGE);

  const planLabel = currentPlan;
  const upgradeCta =
    currentPlan === "Free" ? "Upgrade to Basic"
    : currentPlan === "Basic" ? "Upgrade to Essential"
    : currentPlan === "Essential" ? "Upgrade to Growth"
    : "Manage Subscription";
  const canUpgrade = currentPlan !== "Growth";

  const handleSavePlanSiteDetails = async () => {
    if (!planEditableSiteId || !planSiteDomain.trim()) return;
    setPlanSiteError(null);
    const domainErr = validateManageDomain(planSiteDomain);
    if (domainErr) {
      setPlanSiteError(domainErr);
      return;
    }
    const rows =
      Array.isArray(sessionSites) && sessionSites.length > 0 ? sessionSites : sites;
    if (isDuplicateDomainForOthers(rows, planEditableSiteId, planSiteDomain.trim())) {
      setPlanSiteError("This website URL is already used by another site in your account.");
      return;
    }
    const derivedName = deriveSiteNameFromDomain(planSiteDomain.trim());
    setPlanSiteSaving(true);
    try {
      const preflight = await checkSiteDomainForRename(planSiteDomain.trim(), planEditableSiteId);
      if (!preflight.success) {
        setPlanSiteError(preflight.error || "Could not validate this website URL.");
        return;
      }
      if (preflight.available === false) {
        setPlanSiteError(
          preflight.message || "This website URL is not available. Choose a different URL.",
        );
        return;
      }
      const result = await renameSite(planEditableSiteId, derivedName, planSiteDomain.trim());
      const updatedSite = (result.site || {}) as Record<string, unknown>;
      try {
        if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("cbSessionCache");
      } catch {
        /* ignore */
      }
      await refresh({ showLoading: false });
      const normDomain = normalizeSiteLabel(planSiteDomain.trim());
      updateSiteInState({
        id: planEditableSiteId,
        ...updatedSite,
        name: String(updatedSite.name ?? derivedName),
        domain: String(updatedSite.domain ?? normDomain),
      });
    } catch (e: unknown) {
      const err = e as Error & { code?: string };
      if (err.code === "DOMAIN_EXISTS_OTHER_ACCOUNT") {
        setPlanSiteError("This website URL is already registered to another ConsentBit account.");
      } else if (err.code === "DOMAIN_EXISTS_SAME_ACCOUNT") {
        setPlanSiteError("This website URL is already used by another site in your account.");
      } else if (err.code === "DUPLICATE_SITE_NAME") {
        setPlanSiteError(
          "This site name is already used by another site in your account. Choose a different URL.",
        );
      } else if (err.code === "DOMAIN_REQUIRED" || err.code === "INVALID_DOMAIN") {
        setPlanSiteError(err.message || "Enter a valid website URL.");
      } else {
        setPlanSiteError(err.message || "Failed to update site");
      }
    } finally {
      setPlanSiteSaving(false);
    }
  };

  const openPortal = async () => {
    if (!organizationId) return;
    const returnUrl = typeof window !== "undefined" ? window.location.href : "";
    const { url } = await createBillingPortalSession(organizationId, returnUrl);
    window.open(url, "_blank");
  };

  const handleOpenPortal = async () => {
    if (!organizationId) return;
    setPortalLoading(true);
    try { await openPortal(); } catch (e) {
      alert(e instanceof Error ? e.message : "Could not open billing portal");
    } finally { setPortalLoading(false); }
  };

  const handleVisitPortal = async () => {
    if (!organizationId) return;
    try { await openPortal(); } catch (e) {
      alert(e instanceof Error ? e.message : "Could not open billing portal");
    }
  };

  const handleEditCard = async () => {
    if (!organizationId) return;
    try { await openPortal(); } catch (e) {
      alert(e instanceof Error ? e.message : "Could not open billing portal");
    }
  };

  const handleOpenPortalFooter = async () => {
    if (!organizationId) return;
    try { await openPortal(); } catch (e) {
      alert(e instanceof Error ? e.message : "Could not open billing portal");
    }
  };

  const refreshSummary = async () => {
    if (!organizationId) return;
    try {
      const data = await getBillingSummary(organizationId);
      setSummary(data);
      summaryCache.set(organizationId, { data, ts: Date.now() });
    } catch { /* ignore */ }
  };

  const handleCancelSubscription = async () => {
    // Use whichever subscription ID field the backend returned, fall back to organizationId
    const subId = summary?.stripeSubscriptionId ?? summary?.subscriptionId ?? null;
    if (!subId && !organizationId) {
      setCancelError("Could not identify your subscription. Please refresh and try again.");
      return;
    }
    setCancelLoading(true);
    setCancelError(null);
    try {
      await cancelSubscription(
        subId
          ? { stripeSubscriptionId: subId }
          : { organizationId } as any
      );
      // 1. Optimistically update local billing summary
      setSummary((prev) => prev ? { ...prev, cancelAtPeriodEnd: true, cancel_at_period_end: true } : prev);
      // 2. Optimistically patch the site in global session state so all tables update immediately
      if (activeSiteId) {
        updateSiteInState({
          id: activeSiteId,
          cancelAtPeriodEnd: true,
          cancel_at_period_end: true,
          subscriptionCancelAtPeriodEnd: 1,
          subscription_cancel_at_period_end: 1,
        });
      }
      // 3. Bust caches then re-fetch fresh data from backend — updates cbSessionCache,
      //    which propagates to DashboardSessionProvider and all tables
      summaryCache.delete(organizationId ?? "");
      await Promise.all([
        refreshSummary(),
        refresh({ showLoading: false }),
      ]);
      setShowCancelModal(false);
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Failed to cancel subscription. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const pm = summary?.paymentMethod ?? null;
  const cardBrand = pm?.brand?.toLowerCase() ?? "";
  const isMastercard = cardBrand === "mastercard";
  const isVisa = cardBrand === "visa";

  return (
    <>
    {/* Cancel Subscription Confirmation Modal */}
    {showCancelModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !cancelLoading && setShowCancelModal(false)} />
        <div className="relative w-[420px] bg-white rounded-[18px] shadow-xl p-7 mx-4">

          {/* Warning icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-[#fff7ed] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <h3 className="text-[18px] font-bold text-black text-center mb-2">Cancel Subscription?</h3>
          <p className="text-[13px] text-[#6b7280] text-center leading-relaxed mb-1">
            Your subscription for <span className="font-semibold text-black">{currentPlan}</span> plan will remain active until the end of the current billing period.
          </p>
          {summary?.nextBillingDate && (
            <p className="text-[13px] text-[#6b7280] text-center mb-5">
              Access until:{" "}
              <span className="font-semibold text-black">
                {new Date(summary.nextBillingDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </p>
          )}

          {cancelError && (
            <div className="mb-4 rounded-[8px] bg-[#fef2f2] border border-[#fecaca] px-3 py-2.5 text-[12px] text-[#dc2626]">
              {cancelError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { if (!cancelLoading) { setShowCancelModal(false); setCancelError(null); } }}
              disabled={cancelLoading}
              className="flex-1 h-[42px] rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors"
            >
              Keep Subscription
            </button>
            <button
              type="button"
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
              className="flex-1 h-[42px] rounded-[10px] bg-[#ef4444] text-white text-[14px] font-semibold hover:bg-[#dc2626] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {cancelLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Cancelling…
                </>
              ) : "Yes, Cancel"}
            </button>
          </div>

        </div>
      </div>
    )}
    <div className="grid 2xl:grid-cols-[800px_1fr] xl:gap-12 xl:grid-cols-1  gap-2.5 overflow-auto">
      {/* Left Column - Invoices (hidden for Free plan) */}
      {currentPlan !== "Free" && <div className="px-3.5 pt-6 bg-[#FBFBFB] rounded-[10px] border border-[#EBEBEB] h-fit">
        {/* Header with Filters */}
        <div className="flex items-center justify-between mb-[20px]">
          <p className="font-semibold leading-[20px] text-[16px] text-black tracking-[-1px]" style={{ fontVariationSettings: "'opsz' 14" }}>
            Invoices
          </p>
          <div className="flex items-center gap-[12px]">
            {/* Year filter */}
            <div className="relative">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="appearance-none bg-white border border-[#e5e5e5] rounded-[50px] h-[36px] px-[12px] pr-[32px] font-normal text-[14px] text-black outline-none cursor-pointer"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                <option value="all">Year</option>
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
              <div className="absolute right-[12px] top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>

            {/* Month filter */}
            <div className="relative">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="appearance-none bg-white border border-[#e5e5e5] rounded-[50px] h-[36px] px-[12px] pr-[32px] font-normal text-[14px] text-black outline-none cursor-pointer"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                <option value="all">Month</option>
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                  <option key={m} value={String(i + 1)}>{m}</option>
                ))}
              </select>
              <div className="absolute right-[12px] top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>

            {/* Domain filter */}
            <div className="relative">
              <select
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
                className="appearance-none bg-white border border-[#e5e5e5] rounded-[50px] h-[36px] px-[12px] pr-[32px] font-normal text-[14px] text-[#007AFF] outline-none cursor-pointer"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                <option value="all">All Domains ({domainSites.length || domainCount})</option>
                {domainSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.domain || s.name || s.id}
                  </option>
                ))}
              </select>
              <div className="absolute right-[12px] top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>
          </div>
        </div>

            {/* Table Header */}
            <div className="grid grid-cols-[100px_150px_90px_130px_120px_90px] text-left gap-[8px] mb-[16px] border-b border-[#000000]/10 pb-2.5">
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                Issue Date
              </p>
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                Invoice Number
              </p>
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                Amount
              </p>
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                Site
              </p>
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                Payment Method
              </p>
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                Status
              </p>
            </div>

        {/* Table Rows */}
        <div className="space-y-[20px] pb-6">
          {invoices.map((invoice, index) => (
            <div key={index} className={`grid grid-cols-[100px_150px_90px_130px_120px_90px] gap-[8px] items-center ${index === invoices.length - 1 ? "" : "border-b border-[#000000]/10"} py-4.5`}>
              <p className="font-normal leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>{invoice.date}</p>

              <div className="flex items-center gap-[6px]">
                <p className="font-normal leading-[20px] text-[12px] text-black truncate" style={{ fontVariationSettings: "'opsz' 14" }}>{invoice.invoiceNumber}</p>
                {invoice.hostedInvoiceUrl ? (
                  <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noreferrer"
                    className="bg-[#e6f1fd] border border-[#cedef0] rounded-[2px] size-[13px] flex items-center justify-center shrink-0" title="Open invoice">
                    <svg className="w-[7px] h-[7px]" fill="none" viewBox="0 0 7 7"><path d={svgPaths.p112ba780} fill="#007AFF" /></svg>
                  </a>
                ) : null}
                {invoice.invoicePdf ? (
                  <a href={invoice.invoicePdf} target="_blank" rel="noreferrer"
                    className="bg-[#e6f1fd] border border-[#cedef0] rounded-[2px] size-[13px] flex items-center justify-center shrink-0" title="Download PDF">
                    <svg className="w-[6px] h-[5px]" fill="none" viewBox="0 0 5.83333 4.66667">
                      <path d={svgPaths.pc41fd00} fill="#007AFF" /><path d={svgPaths.pbc14700} fill="#007AFF" />
                    </svg>
                  </a>
                ) : null}
              </div>

              <p className="font-normal leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>{invoice.amount}</p>

              {invoice.siteId ? (
                <button
                  type="button"
                  onClick={() => { setFilterDomain(invoice.siteId!); setActiveSiteId(invoice.siteId!); }}
                  className="font-normal leading-[20px] text-[12px] text-[#007aff] underline truncate text-left cursor-pointer"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                  title={`Filter by ${invoice.siteName}`}
                >
                  {invoice.siteName}
                </button>
              ) : (
                <p className="font-normal leading-[20px] text-[12px] text-black truncate" style={{ fontVariationSettings: "'opsz' 14" }} title={invoice.siteName}>{invoice.siteName}</p>
              )}

              <div className="flex items-center gap-[7px]">
                {pm && (
                  <span className="inline-flex relative w-6 h-4 shrink-0">
                    <span className="absolute left-0 top-0 w-4 h-4 rounded-full bg-[#eb001b] opacity-90" />
                    <span className="absolute left-2 top-0 w-4 h-4 rounded-full bg-[#f79e1b] opacity-90" />
                  </span>
                )}
                <p className="font-normal leading-[20px] text-[12px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>{invoice.paymentMethod}</p>
              </div>

              <div className="bg-[#b6f5cf] h-[19px] px-[8px] rounded-[50px] flex items-center gap-[4px] w-fit">
                <div className="size-[5px]">
                  <svg className="block size-full" fill="none" viewBox="0 0 5 5"><circle cx="2.5" cy="2.5" r="2.5" fill="#118A41" /></svg>
                </div>
                <p className="font-medium leading-[normal] text-[#118a41] text-[10px] tracking-[-0.5px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>{invoice.status}</p>
              </div>
            </div>
          ))}
          {invoiceLoading && <p className="text-sm text-[#6b7280]">Loading invoices...</p>}
          {invoiceError && <p className="text-sm text-[#b91c1c]">{invoiceError}</p>}
          {!invoiceLoading && !invoiceError && allFilteredInvoices.length === 0 && (
            <p className="text-sm text-[#6b7280]">No invoices found.</p>
          )}
        </div>

        {/* Invoice Pagination */}
        {invoiceTotalPages > 1 && (
          <div className="flex items-center justify-between px-3.5 py-3 border-t border-[#000000]/10">
            <p className="text-[12px] text-[#6b7280]">
              {(invoicePage - 1) * INVOICES_PER_PAGE + 1}–{Math.min(invoicePage * INVOICES_PER_PAGE, allFilteredInvoices.length)} of {allFilteredInvoices.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                disabled={invoicePage === 1}
                className="w-7 h-7 flex items-center justify-center rounded border border-[#e5e5e5] text-[#4b5563] disabled:opacity-40 hover:bg-[#f3f4f6]"
              >
                <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M5 1L1 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {Array.from({ length: invoiceTotalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setInvoicePage(p)}
                  className={`w-7 h-7 flex items-center justify-center rounded text-[12px] font-medium border ${p === invoicePage ? "bg-[#007AFF] text-white border-[#007AFF]" : "border-[#e5e5e5] text-[#4b5563] hover:bg-[#f3f4f6]"}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setInvoicePage((p) => Math.min(invoiceTotalPages, p + 1))}
                disabled={invoicePage === invoiceTotalPages}
                className="w-7 h-7 flex items-center justify-center rounded border border-[#e5e5e5] text-[#4b5563] disabled:opacity-40 hover:bg-[#f3f4f6]"
              >
                <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1L5 5L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>}

      {/* Right Column */}
      <div className="space-y-[10px]">

        {/* Your Current plan */}
        <div className="w-full max-w-[554px] bg-[#FBFBFB] border border-[#EBEBEB] rounded-lg overflow-hidden px-5 py-5">
          <div className="pb-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Your Current plan</h2>
            <span className="text-[18px] font-black text-[#007AFF]">{planLabel}</span>
          </div>


          <div className="pt-3 pb-3 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-[14px] font-normal text-[#6b7280] mb-1">No of Domains</p>
                <p className="text-[20px] font-bold text-[#5243C2]">{String(domainCount).padStart(2, "0")}</p>
              </div>
              <div>
                <p className="text-[14px] font-normal text-[#6b7280] mb-1">No of scans</p>
                <p className="text-[20px] font-bold text-[#5243C2]">{scansCount}</p>
              </div>
              <div>
                <p className="text-[14px] font-normal text-[#6b7280] mb-1">Compliance</p>
                <p className="text-[14px] font-bold text-[#5243C2]">GDPR/CCPA</p>
              </div>
            </div>
          </div>

          <div className="pt-3">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-[14px] font-normal text-[#6b7280] mb-1">No of Page views</p>
                <p className="text-[20px] font-bold text-[#5243C2]">{pageViews}</p>
              </div>
              <div>
                <p className="text-[14px] font-normal text-[#6b7280] mb-1">IAB / TCF</p>
                <p className="text-[14px] font-bold" style={{ color: (currentPlan === "Essential" || currentPlan === "Growth") ? "#5243C2" : undefined }}>
                  {(currentPlan === "Essential" || currentPlan === "Growth") ? "Supported" : <span className="text-gray-400">NIL</span>}
                </p>
              </div>
              <div />
            </div>
          </div>

          <div className="pt-5 flex gap-3">
            <button
              type="button"
              onClick={() => router.push(activeSiteId ? `/dashboard/${activeSiteId}/upgrade` : "/dashboard")}
              disabled={!canUpgrade}
              className="flex-1 min-h-[36px] bg-[#007AFF] hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {upgradeCta}
            </button>
            {isCancelled ? (
              <div className="flex-1 min-h-[36px] flex items-center justify-center gap-1.5 bg-[#fff7ed] border border-[#fed7aa] rounded-lg px-4">
                <span className="w-2 h-2 rounded-full bg-[#f97316] flex-shrink-0" />
                <span className="text-[13px] font-medium text-[#c2410c]">
                  Cancels {cancelDate
                    ? new Date(cancelDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "at period end"}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setCancelError(null); setShowCancelModal(true); }}
                disabled={currentPlan === "Free" || cancelLoading}
                className="flex-1 min-h-[36px] bg-[#E9E5E5] hover:bg-gray-300 text-[#4B5563] py-2 px-4 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* Billing Details + Payment Method — single card with blue border */}
       
<BillingDetailsCard
  name={userName}
  email={userEmail}
  country={summary?.billingCountry || "—"}
  address={summary?.billingAddress || "—"}
  pm={pm}
  onVisitStripePortal={handleVisitPortal}
  onEditCard={handleEditCard}
  onOpenPortal={handleOpenPortalFooter}
/>
      </div>
    </div>
    </>
  );
}
