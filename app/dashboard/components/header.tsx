"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import React from "react";


function Tooltip({ text, children, align = "left" }: { text: string; children: React.ReactNode; align?: "left" | "right" | "center" }) {
  return (
    <span className="relative group inline-flex items-center">
      {children}
      <span suppressHydrationWarning className={`pointer-events-none absolute top-full mt-2 w-max max-w-[200px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-normal text-[#374151] shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal ${align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"}`}>
        {text}
      </span>
    </span>
  );
}
import { usePathname, useRouter } from "next/navigation";
import { useDashboardSession } from "../DashboardSessionProvider";
import AddNewSiteModal from "./AddNewSiteModal";
import { getBillingUsage } from "@/lib/client-api";
import { resolvePlanTierForSiteContext } from "@/lib/dashboard-plan-tier";
import { UpgradePlanModal } from "./UpgradePlanModal";

/** Must stay in sync with `DashboardSessionProvider` RESERVED_DASHBOARD_SEGMENTS + pickActiveSiteIdFromPath. */
const DASHBOARD_PATH_RESERVED = new Set(["profile", "all-domain", "post-setup"]);

/** `/dashboard/[siteId]/...` → site UUID; reserved routes return null (use session activeSiteId). */
function pickSiteIdFromDashboardPath(pathname: string | null): string | null {
  const parts = (pathname || "").split("/").filter(Boolean);
  if (parts[0] !== "dashboard" || parts.length < 2) return null;
  const id = parts[1];
  if (!id || id === "one" || DASHBOARD_PATH_RESERVED.has(id)) return null;
  return id;
}

export default function Header() {
  const [domainOpen, setDomainOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [addSiteOpen, setAddSiteOpen] = useState(false);
  const [stripeReturnPending, setStripeReturnPending] = useState(false);
  const [stripeReturnCountdown, setStripeReturnCountdown] = useState(5);

  // Detect return from Stripe checkout (from AddNewSiteModal) on ANY page.
  // useLayoutEffect fires before paint — covers screen immediately, no flash.
  useLayoutEffect(() => {
    const key = 'cb_stripe_redirect_modal';
    const params = new URLSearchParams(window.location.search);
    // If this is a successful payment redirect (post-setup or upgraded), just clear the flag silently.
    const isSuccessRedirect = params.get('postSetup') === '1' || params.get('upgraded') === '1' || params.get('domain') !== null;
    const handleReturn = () => {
      sessionStorage.removeItem(key);
      if (!isSuccessRedirect) {
        setStripeReturnPending(true);
        window.history.pushState(null, '', window.location.href);
      }
    };
    if (sessionStorage.getItem(key) === '1') handleReturn();
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted && sessionStorage.getItem(key) === '1') handleReturn();
    }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  // Auto-dismiss cancel screen after 5s then open AddNewSiteModal.
  useEffect(() => {
    if (!stripeReturnPending) return;
    setStripeReturnCountdown(5);
    const interval = setInterval(() => {
      setStripeReturnCountdown((n) => {
        if (n <= 1) {
          clearInterval(interval);
          setStripeReturnPending(false);
          setAddSiteOpen(true);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stripeReturnPending]);
  const [hydrated, setHydrated] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'pageview' | 'scan'>('pageview');
  const [pageviewOverLimit, setPageviewOverLimit] = useState(false);
  const [pageviewUsage, setPageviewUsage] = useState<{ used: number; limit: number } | null>(null);
  const [scanOverLimit, setScanOverLimit] = useState(false);
  const [scanUsage, setScanUsage] = useState<{ used: number; limit: number } | null>(null);
  const domainRef = useRef<any>(null);
  const notifRef = useRef<any>(null);

  const router = useRouter();
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);

  const {
    sites,
    activeSiteId,
    activeOrganizationId,
    setActiveSiteId,
    logout,
    loading,
    effectivePlanId,
    authenticated,
  } = useDashboardSession();

  const pathSiteId = useMemo(() => pickSiteIdFromDashboardPath(pathname), [pathname]);

  // activeSiteId wins for display: it's updated synchronously on dropdown select (before pathname updates),
  // so it never lags. pathname is used only as a fallback for direct URL navigation.
  const activeSite = useMemo(() => {
    // 1. activeSiteId is set immediately on dropdown select — use it first to avoid flicker.
    if (activeSiteId) {
      const byId = sites.find((s: any) => String(s?.id) === String(activeSiteId));
      if (byId) return byId;
    }
    // 2. Fall back to URL (covers direct navigation / page refresh before context syncs).
    const pathId = pickSiteIdFromDashboardPath(pathname);
    if (pathId) {
      return sites.find((s: any) => String(s?.id) === pathId) || null;
    }
    return sites[0] || null;
  }, [sites, pathname, activeSiteId]);

  /** Plan label, CTA, skeleton — single memo so nothing references an undefined variable. */
  const planUi = useMemo(() => {
    const resolvedPlanKey = resolvePlanTierForSiteContext({
      activeSite,
      sites,
      effectivePlanId,
    });

    // `DashboardSessionProvider` stores empty `effectivePlanId` for free sites (`pickPlanIdFromSite`
    // returns null for free). Treat unknown/empty as free once init finished — same as SideBar / upgrade page.
    const waitingForSiteSync =
      authenticated &&
      !!pathSiteId &&
      sites.length > 0 &&
      !sites.some((s: any) => String(s?.id) === pathSiteId);

    // Avoid hydration mismatch: SSR can't read sessionStorage-seeded dashboard state,
    // so it often renders "loading/skeleton" while the client already has data.
    // Keep skeleton on the first client paint, then flip after hydration.
    const showPlanSkeleton =
      !hydrated ||
      loading ||
      waitingForSiteSync;

    const k = resolvedPlanKey || "free";
    const label =
      !k
        ? "—"
        : k === "free"
          ? "Free"
          : k === "basic"
            ? "Basic"
            : k === "essential"
              ? "Essential"
              : k === "growth"
                ? "Growth"
                : k;
    const isPaid = k === "basic" || k === "essential" || k === "growth";
    const planDisplay = {
      label,
      upgradeButtonText: isPaid ? "Change plan" : "Update to Pro",
      tooltipUpgrade: isPaid
        ? "Switch or modify your current subscription plan."
        : "Upgrade to a paid plan to unlock more features.",
    };

    return { resolvedPlanKey, showPlanSkeleton, planDisplay };
  }, [activeSite, effectivePlanId, hydrated, loading, authenticated, pathSiteId, sites]);

  const { resolvedPlanKey, showPlanSkeleton, planDisplay } = planUi;
  // Re-fetch billing usage whenever org, active site, or plan changes (covers post-upgrade refresh).
  useEffect(() => {
    if (!activeOrganizationId) return;
    // Reset stale flags before fetching so upgrading clears old alerts immediately.
    setPageviewOverLimit(false);
    setPageviewUsage(null);
    setScanOverLimit(false);
    setScanUsage(null);
    getBillingUsage(activeOrganizationId, activeSiteId ?? undefined)
      .then((data) => {
        if (data.pageviewsLimit > 0 && data.pageviewsUsed >= data.pageviewsLimit) {
          setPageviewOverLimit(true);
          setPageviewUsage({ used: data.pageviewsUsed, limit: data.pageviewsLimit });
        }
        if (data.scansLimit > 0 && data.scansUsed >= data.scansLimit) {
          setScanOverLimit(true);
          setScanUsage({ used: data.scansUsed, limit: data.scansLimit });
        }
      })
      .catch(() => {/* non-critical */});
  }, [activeOrganizationId, activeSiteId, resolvedPlanKey]);

  const notifications: { title: string; desc: string; time: string; action?: () => void }[] = [
    ...(pageviewOverLimit && pageviewUsage ? [{
      title: 'Pageview limit reached',
      desc: `${pageviewUsage.used.toLocaleString()} / ${pageviewUsage.limit.toLocaleString()} pageviews used. Tracking paused — upgrade to continue.`,
      time: 'Now',
      action: () => { setNotifOpen(false); setUpgradeReason('pageview'); setShowUpgradeModal(true); },
    }] : []),
    ...(scanOverLimit && scanUsage ? [{
      title: 'Scan limit reached',
      desc: `${scanUsage.used.toLocaleString()} / ${scanUsage.limit.toLocaleString()} scans used. Scheduled scans are paused — upgrade to continue.`,
      time: 'Now',
      action: () => { setNotifOpen(false); setUpgradeReason('scan'); setShowUpgradeModal(true); },
    }] : []),
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    function handleClick(e: any) {
      if (!domainRef.current?.contains(e.target)) setDomainOpen(false);
      if (!notifRef.current?.contains(e.target)) setNotifOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayDomain =
    activeSite?.domain || activeSite?.name || (!loading ? "Select a site" : null);

  // const handleSelectSite = (site: any) => {
    
  //   const nextId = site?.id ? String(site.id) : null;
  //   const currentId = pathSiteId || activeSiteId || null;
  //   if (String(nextId || "") === String(currentId || "")) {
  //     // No-op selection (already on this site) — don't navigate.
  //     setDomainOpen(false);
  //     return;
  //   }

  //   setActiveSiteId(nextId);
  //   setDomainOpen(false);
  //   if (!nextId) return;
  //   if ((pathname || "").startsWith("/dashboard/profile")) return;
  //   if ((pathname || "").startsWith("/dashboard/all-domain")) return;
  //   // Preserve current tab/sub-route when switching sites
  //   const currentSubPath = pathParts.slice(2).join('/');
  //   const targetPath = currentSubPath ? `/dashboard/${nextId}/${currentSubPath}` : `/dashboard/${nextId}`;
  //   if (targetPath !== (pathname || "")) {
  //     router.push(targetPath);
  //   }
  // };
const handleSelectSite = (site: any) => {
    
    const nextId = site?.id ? String(site.id) : null;
    const currentId = pathSiteId || activeSiteId || null;
    if( currentId==nextId) return

    setActiveSiteId(nextId);
    setDomainOpen(false);
    if (!nextId) return;
    if ((pathname || "").startsWith("/dashboard/profile")) return;
    if ((pathname || "").startsWith("/dashboard/all-domain")) return;
    // Preserve current tab/sub-route when switching sites
    const currentSubPath = pathParts.slice(2).join('/');
    const targetPath = currentSubPath ? `/dashboard/${nextId}/${currentSubPath}` : `/dashboard/${nextId}`;
    if (targetPath !== (pathname || "")) {
      console.log("Navigating to:", targetPath);
      router.push(targetPath);
    }
  };
  
  return (
    <header className="w-full bg-white border-b border-[#00000010] px-8 py-6.5 flex items-center justify-between rounded-t-xl">
      {/* LEFT SECTION */}
   {addSiteOpen && <AddNewSiteModal onClose={() => setAddSiteOpen(false)} />}
   {stripeReturnPending && (
     <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white gap-3">
       <div className="w-14 h-14 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-1">
         <svg className="w-7 h-7 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
           <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
         </svg>
       </div>
       <p className="text-[17px] font-semibold text-[#111827]">Payment not completed</p>
       <p className="text-sm text-[#6b7280]">You returned without completing the payment.</p>
       <p className="text-xs text-[#9CA3AF]">Returning to form in {stripeReturnCountdown}s…</p>
       <button
         type="button"
         onClick={() => { setStripeReturnPending(false); setAddSiteOpen(true); }}
         className="mt-2 px-6 py-2.5 rounded-lg bg-[#007aff] text-white text-sm font-medium hover:bg-[#0066d6] transition-colors"
       >
         Cancel Payment
       </button>
     </div>
   )}
      <div className="flex items-center gap-6">
        {/* Logo */}
       <img
  src="/images/ConsentBit-logo-Dark.png"
  alt="Consentbit"
  className="w-[100px] xl:w-[170px] h-auto"
/>

        {/* DOMAIN SELECTOR */}
        <div ref={domainRef} className="relative flex items-center gap-2">
          <button
            onClick={() => !loading && setDomainOpen(!domainOpen)}
            className="border-2 border-[#E6F1FD] bg-[#E6F1FD] flex gap-1 items-center rounded-md px-3 py-2 text-sm min-w-[120px]"
            suppressHydrationWarning
          >
            {!hydrated || loading ? (
              <span className="h-4 w-20 rounded bg-[#d0e4f7] animate-pulse inline-block" />
            ) : (
              displayDomain
            )}
            <svg width="10" height="5" viewBox="0 0 10 5" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0.5 0.5L3.26857 3.16493C4.04299 3.91036 5.26812 3.91036 6.04254 3.16493L8.81111 0.5" stroke="black" strokeLinecap="round"/>
</svg>
          </button>

          <button onClick={() =>{ 
            setAddSiteOpen(true)
            setDomainOpen(false)

          }}  className="w-9 cursor-pointer h-9 flex items-center justify-center rounded-md bg-[#E6F1FD] text-[#007AFF]">
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  className="lucide lucide-plus"
  aria-hidden="true"
>
  <path d="M5 12h14" />
  <path d="M12 5v14" />
</svg>
          </button>

          {domainOpen && (
            <div className="absolute top-[110%] left-0 w-[300px] bg-white rounded-xl shadow-[0_12px_40px_rgba(15,23,42,0.16)] overflow-hidden z-50">
              <div className="max-h-[240px] overflow-y-auto">
                {sites.map((s: any) => {
                  const domain = s?.domain || s?.name || s?.id;
                  const siteUrl = s?.domain ? (s.domain.startsWith("http") ? s.domain : `https://${s.domain}`) : null;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSite(s)}
                      className={`flex items-center justify-between px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 ${
                        activeSite?.id === s.id ? "bg-[#E6F1FD] text-[#007AFF]" : ""
                      }`}
                    >
                      <span className="truncate">{domain}</span>
                      {siteUrl && (
                        <a
                          href={siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="ml-2 shrink-0 text-[#9CA3AF] hover:text-[#007AFF] transition-colors"
                          aria-label={`Open ${domain} in new tab`}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 1H11M11 1V5M11 1L5 7M4.5 2H2C1.44772 2 1 2.44772 1 3V10C1 10.5523 1.44772 11 2 11H9C9.55228 11 10 10.5523 10 10V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-[#00000010]" />

              <div className="flex justify-between px-4 py-3 text-[15px] font-medium">
                <button className="text-[#007AFF] cursor-pointer" onClick={()=>router.push("/dashboard/all-domain")}>View All <svg className="inline" width="11" height="11" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.37879e-05 4.99166V3.88766H6.69609L3.34809 0.767663L4.10409 -0.000336647L8.40009 4.09166V4.75166L4.10409 8.85566L3.34809 8.08766L6.67209 4.99166H9.37879e-05Z" fill="currentColor"/>
</svg>
</button>
                <button className="text-[#007AFF] cursor-pointer" onClick={() =>{ 
            setAddSiteOpen(true)
            setDomainOpen(false)

          }}>
                  Add New +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* VIEW ALL DOMAINS */}
        <Tooltip text="See and manage all your connected domains.">
          <button onClick={()=>router.push("/dashboard/all-domain")} className="flex items-center gap-2 text-base cursor-pointer  text-[#4B5563]">
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  className="lucide lucide-globe"
  aria-hidden="true"
>
  <circle cx="12" cy="12" r="10" />
  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
  <path d="M2 12h20" />
</svg>
            View all Domains
          </button>
        </Tooltip>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-4">
        {/* PLAN — skeleton until dashboard-init finishes (no false "Free" on reload) */}
        <div
          className="flex items-center text-xs bg-[#E6F1FD] border border-[#E6F1FD] rounded-lg overflow-hidden"
          aria-busy={showPlanSkeleton}
        >
          <span className="px-2 py-3.5 bg-[#ffffff] ">
            Current Plan :
          </span>
          {showPlanSkeleton ? (
            <div className="mx-1 my-2 min-h-[28px] min-w-[72px] rounded bg-[#cfe8fc] animate-pulse" aria-hidden />
          ) : (
            <button
              type="button"
              onClick={() => {
                const id = pathSiteId || activeSiteId || sites[0]?.id;
                if (id) router.push(`/dashboard/${id}/upgrade`);
                else router.push("/dashboard");
              }}
              className="px-3 py-1 bg-[#E6F1FD] capitalize"
              suppressHydrationWarning
            >
              {planDisplay.label}
            </button>
          )}
        </div>

        {showPlanSkeleton ? (
          <div
            className="min-h-[42px] min-w-[112px] rounded-lg bg-[#c4c8e8] animate-pulse"
            aria-hidden
            aria-label="Loading plan actions"
          />
        ) : (
          <Tooltip text={planDisplay.tooltipUpgrade} align="right">
            <button
              type="button"
              onClick={() => {
                const id = pathSiteId || activeSiteId || sites[0]?.id;
                if (id) router.push(`/dashboard/${id}/upgrade`);
                else router.push("/dashboard");
              }}
              className="px-3.5 py-3.5 rounded-lg bg-[#747BE0] text-white text-xs"
              suppressHydrationWarning
            >
              {planDisplay.upgradeButtonText}
            </button>
          </Tooltip>
        )}

        {/* LOGOUT */}
        <button
          type="button"
          onClick={logout}
          disabled={!hydrated || loading}
          className="px-3 py-3.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Logout
        </button>

        {/* NOTIFICATION */}
        <div ref={notifRef} className="relative">
          <Tooltip text="View alerts for pageview or scan limit warnings." align="right">
            <div className="relative mt-1 cursor-pointer" role="button" aria-label="Notifications" onClick={() => setNotifOpen(!notifOpen)}>
              <img src="/images/bell.svg" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F97373] text-[9px] font-bold text-white">
                  {notifications.length}
                </span>
              )}
            </div>
          </Tooltip>

          {notifOpen && (
            <div className="absolute right-0 top-[180%] w-[412px] bg-white rounded-xl shadow-[0_12px_40px_rgba(15,23,42,0.16)] border border-[#E5E7EB] z-50">
              <div className="px-4 py-3 border-b border-[#E5E7EB]">
                <p className="text-sm font-semibold text-gray-800">Notifications</p>
              </div>
              <div className="max-h-[700px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-gray-500">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <div
                      key={i}
                      onClick={n.action}
                      className={`flex gap-3 px-5 py-4 border-b border-[#F3F4F6] last:border-none hover:bg-[#F9FAFB] transition-colors ${n.action ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-start pt-1">
                        <span className="w-2 h-2 rounded-full bg-[#F97373] shrink-0" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm font-semibold text-gray-900 leading-snug">{n.title}</p>
                          <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-snug">{n.desc}</p>
                        {n.action && (
                          <p className="text-xs text-[#007AFF] mt-1.5 font-medium">Upgrade Plan →</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* AVATAR */}
        <img src="/images/Icon.svg" role="button" aria-label="Profile" className="mt-1 rounded-full cursor-pointer" onClick={() => router.push("/dashboard/profile")} />
      </div>

      {showUpgradeModal && (
        <UpgradePlanModal
          currentPlanId={resolvedPlanKey}
          organizationId={activeOrganizationId ?? null}
          siteId={activeSiteId}
          reason={upgradeReason}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </header>
  );
}
