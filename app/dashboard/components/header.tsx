"use client";

import { useState, useRef, useEffect } from "react";
import React from "react";
import { Globe, Plus } from "lucide-react";

function Tooltip({ text, children, align = "left" }: { text: string; children: React.ReactNode; align?: "left" | "right" | "center" }) {
  return (
    <span className="relative group inline-flex items-center">
      {children}
      <span className={`pointer-events-none absolute top-full mt-2 w-max max-w-[200px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-normal text-[#374151] shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal ${align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"}`}>
        {text}
      </span>
    </span>
  );
}
import { usePathname, useRouter } from "next/navigation";
import { useDashboardSession } from "../DashboardSessionProvider";
import AddNewSiteModal from "./AddNewSiteModal";
import { getBillingUsage } from "@/lib/client-api";
import { UpgradePlanModal } from "./UpgradePlanModal";

export default function Header() {
  const [domainOpen, setDomainOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [addSiteOpen, setAddSiteOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [pageviewOverLimit, setPageviewOverLimit] = useState(false);
  const [pageviewUsage, setPageviewUsage] = useState<{ used: number; limit: number } | null>(null);
  const [scanOverLimit, setScanOverLimit] = useState(false);
  const [scanUsage, setScanUsage] = useState<{ used: number; limit: number } | null>(null);
  const domainRef = useRef<any>(null);
  const notifRef = useRef<any>(null);

  const router = useRouter();
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);

  const { sites, activeSiteId, activeOrganizationId, setActiveSiteId, logout, loading, effectivePlanId } = useDashboardSession();

  const planLabel = (() => {
    const k = String(effectivePlanId || "free").toLowerCase();
    if (k === "free") return "Free";
    if (k === "basic") return "Basic";
    if (k === "essential") return "Essential";
    if (k === "growth") return "Growth";
    return effectivePlanId;
  })();
  const activeSite = sites.find((s: any) => String(s?.id) === String(activeSiteId)) || sites[0] || null;

  // Fetch billing usage once the org is known — check pageview and scan limits
  useEffect(() => {
    if (!activeOrganizationId) return;
    getBillingUsage(activeOrganizationId)
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
  }, [activeOrganizationId]);

  const notifications: { title: string; desc: string; time: string; action?: () => void }[] = [
    ...(pageviewOverLimit && pageviewUsage ? [{
      title: 'Pageview limit reached',
      desc: `${pageviewUsage.used.toLocaleString()} / ${pageviewUsage.limit.toLocaleString()} pageviews used. Tracking paused — upgrade to continue.`,
      time: 'Now',
      action: () => { setNotifOpen(false); setShowUpgradeModal(true); },
    }] : []),
    ...(scanOverLimit && scanUsage ? [{
      title: 'Scan limit reached',
      desc: `${scanUsage.used.toLocaleString()} / ${scanUsage.limit.toLocaleString()} scans used. Scheduled scans are paused — upgrade to continue.`,
      time: 'Now',
      action: () => { setNotifOpen(false); setShowUpgradeModal(true); },
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

  const handleSelectSite = (site: any) => {
    setActiveSiteId(site?.id ? String(site.id) : null);
    setDomainOpen(false);
    if (!site?.id) return;
    if ((pathname || "").startsWith("/dashboard/profile")) return;
    if ((pathname || "").startsWith("/dashboard/all-domain")) return;
    // Preserve current tab/sub-route when switching sites
    const currentSubPath = pathParts.slice(2).join('/');
    const targetPath = currentSubPath ? `/dashboard/${site.id}/${currentSubPath}` : `/dashboard/${site.id}`;
    router.push(targetPath);
  };

  return (
    <header className="w-full bg-white border-b border-[#00000010] px-8 py-6.5 flex items-center justify-between rounded-t-xl">
      {/* LEFT SECTION */}
   {  addSiteOpen && <AddNewSiteModal  onClose={() => setAddSiteOpen(false)} />}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <img
          src="/images/ConsentBit-logo-Dark.png"
          alt="Consentbit"
          width={170}
          height={21}
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
            <Plus size={16} />
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
            <Globe size={16} />
            View all Domains
          </button>
        </Tooltip>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-4">
        {/* PLAN */}
        <div className="flex items-center text-xs bg-[#E6F1FD] border border-[#E6F1FD] rounded-lg overflow-hidden">
          <span className="px-2 py-3.5 bg-[#ffffff] ">
            Current Plan :
          </span>
          <button
            type="button"
            onClick={() => {
              const id = activeSiteId || sites[0]?.id;
              if (id) router.push(`/dashboard/${id}/upgrade`);
              else router.push("/dashboard");
            }}
            className="px-3 py-1 bg-[#E6F1FD] "
            suppressHydrationWarning
          >
            {planLabel}
          </button>
        </div>

        {/* UPGRADE BUTTON */}
        <Tooltip text={String(effectivePlanId || "free").toLowerCase() === "free" ? "Upgrade to a paid plan to unlock more features." : "Switch or modify your current subscription plan."} align="right">
          <button
            type="button"
            onClick={() => {
              const id = activeSiteId || sites[0]?.id;
              if (id) router.push(`/dashboard/${id}/upgrade`);
              else router.push("/dashboard");
            }}
            className="px-3.5 py-3.5 rounded-lg bg-[#747BE0] text-white text-xs"
            suppressHydrationWarning
          >
            {String(effectivePlanId || "free").toLowerCase() === "free" ? "Update to Pro" : "Change plan"}
          </button>
        </Tooltip>

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
          currentPlanId={effectivePlanId}
          organizationId={activeOrganizationId ?? null}
          siteId={activeSiteId}
          reason="pageview"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </header>
  );
}
