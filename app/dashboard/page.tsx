"use client";
import { usePathname, useRouter } from "next/navigation";
import DashboardTabs from "./components/DashboardTabs";
import GettingStarted from "./components/GettingStarted";
import Header from "./components/header";
import InstallConsentModal from "./components/InstallConsentModal";
import SiteSummaryCards from "./components/SiteSummaryCards";
import StepWizard from "./components/StepWizard";
import { useEffect, useMemo, useState } from "react";
import { useDashboardSession } from "./DashboardSessionProvider";
import { firstSetup } from "@/lib/client-api";
import ComplianceAlert from "./components/ComplianceAlert";
export default function DashboardPage() {
 const router = useRouter();
 const pathname = usePathname();
 const { loading, authenticated, user, sites, activeOrganizationId, activeSiteId, refresh } = useDashboardSession();
 const activeSite = sites.find((s: any) => String(s?.id) === String(activeSiteId)) || null;
 const userEmail = user?.email ?? "";
 /**
  * First-time wizard must stay mounted after firstSetup creates a site. Otherwise refresh()
  * makes sites.length > 0, showOnboarding flips false, and the payment + install steps vanish.
  */
 const [hydrated, setHydrated] = useState(false);
 useEffect(() => setHydrated(true), []);
 const [wizardSticky, setWizardSticky] = useState(false);
 /** User chose "Skip to Dashboard" — hide wizard even if they never created a site. */
 const [wizardSkipped, setWizardSkipped] = useState(false);
 useEffect(() => {
   if (loading || !authenticated) return;
   if ((sites?.length || 0) === 0) {
     setWizardSticky(true);
   }
 }, [loading, authenticated, sites?.length]);

 const showOnboarding =
   authenticated &&
   !wizardSkipped &&
   (((sites?.length || 0) === 0) || wizardSticky);
 const userName = useMemo(() => {
   const name = user?.name?.trim();
   if (name) return name.charAt(0).toUpperCase() + name.slice(1);
   return userEmail || undefined;
 }, [user?.name, userEmail]);
 const [showInstallModal, setShowInstallModal] = useState(false);
 const [postSetupInstall, setPostSetupInstall] = useState<{
   scriptUrl: string; siteId: string; siteDomain: string; cdnScriptId?: string; returnTo?: string;
 } | null>(null);
 const [pendingPostSetupDomain, setPendingPostSetupDomain] = useState<string | null>(null);
 const [pendingPostSetupSiteId, setPendingPostSetupSiteId] = useState<string | null>(null);
 const [pendingPostSetupReturnTo, setPendingPostSetupReturnTo] = useState<string | null>(null);

 const computeReturnTarget = (siteId: string, returnTo: string | null): string => {
   const r = String(returnTo || "").trim();
   if (!r) return `/dashboard/${siteId}`;
   // If returnTo looks like /dashboard/<oldId>/... keep the sub-path and swap in the new siteId.
   const parts = r.split("?")[0].split("#")[0].split("/").filter(Boolean);
   if (parts[0] === "dashboard") {
     if (parts.length >= 2 && parts[1] && !["profile", "all-domain", "post-setup"].includes(parts[1])) {
       const sub = parts.slice(2).join("/");
       return sub ? `/dashboard/${siteId}/${sub}` : `/dashboard/${siteId}`;
     }
     // For /dashboard, /dashboard/profile, /dashboard/all-domain: go to the new site's dashboard root.
     return `/dashboard/${siteId}`;
   }
   return `/dashboard/${siteId}`;
 };

 const normalizeDomain = (raw: string) =>
   String(raw || "")
     .trim()
     .replace(/^https?:\/\//i, "")
     .replace(/^www\./i, "")
     .split("/")[0]
     .split("?")[0]
     .split("#")[0]
     .replace(/\.+$/, "")
     .toLowerCase();

 // Detect ?postSetup=1&domain=X on return from Stripe payment
 useEffect(() => {
   const params = new URLSearchParams(window.location.search);
   if (params.get('postSetup') === '1') {
      const domain = params.get('domain') ?? '';
      const siteId = params.get('siteId') ?? '';
      const returnTo = params.get('returnTo') ?? '';
      if (domain) setPendingPostSetupDomain(normalizeDomain(domain));
      if (siteId) setPendingPostSetupSiteId(String(siteId));
      if (returnTo) setPendingPostSetupReturnTo(String(returnTo));
      if (domain || siteId) {
        setWizardSkipped(true);
        window.history.replaceState({}, '', '/dashboard');
      }
   }
 }, []);

  // Also accept post-setup signal from the Stripe success tab (window.postMessage or storage event).
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.origin !== window.location.origin) return;
      const data = ev.data as any;
      if (data?.type === "CONSENTBIT_POST_SETUP") {
        if (data?.domain) setPendingPostSetupDomain(normalizeDomain(String(data.domain)));
        if (data?.siteId) setPendingPostSetupSiteId(String(data.siteId));
        if (data?.returnTo) setPendingPostSetupReturnTo(String(data.returnTo));
        setWizardSkipped(true);
      }
    }
    function onStorage(ev: StorageEvent) {
      if (ev.key !== "cb_post_setup" || !ev.newValue) return;
      try {
        const parsed = JSON.parse(ev.newValue) as { domain?: string; siteId?: string; returnTo?: string };
        if (parsed?.domain) setPendingPostSetupDomain(normalizeDomain(parsed.domain));
        if (parsed?.siteId) setPendingPostSetupSiteId(String(parsed.siteId));
        if (parsed?.returnTo) setPendingPostSetupReturnTo(String(parsed.returnTo));
        if (parsed?.domain || parsed?.siteId) {
          setWizardSkipped(true);
        }
      } catch {}
    }
    window.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

 // Once authenticated, create the site and show install code.
 // Stripe's webhook may arrive after this tab loads — poll session so paid plan replaces "free" in the header.
 useEffect(() => {
   if (!pendingPostSetupDomain || loading || !authenticated) return;
   const domain = pendingPostSetupDomain;
   setPendingPostSetupDomain(null);
   let poll: ReturnType<typeof setInterval> | null = null;
   let cancelled = false;
   firstSetup({ websiteUrl: domain })
     .then((result) => {
       if (cancelled) return;
       const siteId = result?.siteId ?? result?.site?.id;
       const scriptUrl = result?.site?.embedScriptUrl ?? result?.scriptUrl ?? result?.site?.scriptUrl;
       const cdnScriptId = result?.site?.cdnScriptId;
       if (siteId && scriptUrl) {
         setPostSetupInstall({ scriptUrl, siteId, siteDomain: domain, cdnScriptId, returnTo: pendingPostSetupReturnTo || undefined });
       }
       void refresh({ showLoading: false });
       let ticks = 0;
       poll = setInterval(() => {
         if (cancelled) {
           if (poll) clearInterval(poll);
           poll = null;
           return;
         }
         ticks += 1;
         void refresh({ showLoading: false });
         if (ticks >= 24) {
           if (poll) clearInterval(poll);
           poll = null;
         }
       }, 1500);
     })
     .catch(console.error);
   return () => {
     cancelled = true;
     if (poll) clearInterval(poll);
   };
 }, [pendingPostSetupDomain, loading, authenticated, refresh, pendingPostSetupReturnTo]);

  // If we returned from Stripe with a siteId (upgrade / existing site), show its install code in the wizard UI.
  useEffect(() => {
    if (!pendingPostSetupSiteId || loading || !authenticated) return;
    const id = String(pendingPostSetupSiteId);
    const match = (Array.isArray(sites) ? sites : []).find((s: any) => String(s?.id) === id);
    if (match?.scriptUrl) {
      setPostSetupInstall({
        scriptUrl: String(match.scriptUrl),
        siteId: String(match.id),
        siteDomain: String(match.domain || ''),
        cdnScriptId: match?.cdnScriptId ? String(match.cdnScriptId) : undefined,
        returnTo: pendingPostSetupReturnTo || undefined,
      });
      setPendingPostSetupSiteId(null);
    } else {
      // Keep `pendingPostSetupSiteId` set so when `refresh()` updates `sites`,
      // this effect reruns and picks up the scriptUrl.
      void refresh({ showLoading: false });
    }
  }, [pendingPostSetupSiteId, loading, authenticated, refresh, sites, pendingPostSetupReturnTo]);

 /** Raw URL from API (`Site.embedScriptUrl`); modal resolves to absolute — keeps snippet identical to stored value. */
 const rawInstallScriptUrl = activeSite?.scriptUrl ?? "";

  // When sites exist, keep selected siteId in URL.
  useEffect(() => {
    if (loading) return;
    if (!authenticated) return;
    if (showOnboarding) return;
    if (!activeSiteId) return;
    if (pathname === "/dashboard") {
      // router.replace(`/dashboard/${activeSiteId}`);
    }
  }, [activeSiteId, authenticated, loading, pathname, router, showOnboarding]);

  const handleWizardComplete = async () => {
    setWizardSticky(false);
    setWizardSkipped(false);
    await refresh({ showLoading: false });
  };

  const dismissOnboardingWizard = () => {
    setWizardSticky(false);
    setWizardSkipped(true);
  };




  // Post-payment pending: show a clean full-screen loader so the user never sees dashboard skeleton
  if (hydrated && (pendingPostSetupDomain || pendingPostSetupSiteId)) {
    return (
      <div className="min-h-screen bg-[#E6F1FD] flex flex-col">
        <div className="flex justify-between items-center px-8 pt-7.5 pb-5.25 border-b border-[#000000]/10 rounded-t-xl">
          <img src="/images/ConsentBit-logo-Dark.png" alt="logo" className="h-6" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <svg className="animate-spin h-8 w-8 text-[#007AFF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-[#374151] text-sm font-medium">Setting up your site…</p>
        </div>
      </div>
    );
  }

  // Show skeleton until hydrated (prevents server/client mismatch) or while session loads
  if (!hydrated || loading) {
    // return (
    //   <>
    //     <Header />
    //     <div className="max-w-[1148px] mx-auto pb-4">
    //       <DashboardTabs />
    //       {/* Skeleton cards */}
    //       <div className="grid grid-cols-2 gap-6 mt-4 animate-pulse">
    //         <div className="bg-white border border-gray-200 rounded-xl p-5 h-[260px]">
    //           <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
    //           <div className="h-20 bg-gray-100 rounded-lg mb-3" />
    //           <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
    //           <div className="h-4 bg-gray-200 rounded w-1/4" />
    //         </div>
    //         <div className="bg-white border border-gray-200 rounded-xl p-5 h-[260px]">
    //           <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
    //           <div className="h-20 bg-gray-100 rounded-lg mb-3" />
    //           <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
    //           <div className="h-4 bg-gray-200 rounded w-1/4" />
    //         </div>
    //       </div>
    //       <div className="bg-gray-100 rounded-xl mt-5 h-[120px] animate-pulse" />
    //     </div>
    //   </>
    // );
 
 return null
  }

  // Post-payment: show the same 3-step wizard Confirm UI (not the dashboard cards)
  if (authenticated && postSetupInstall) {
    return (
      <div className="min-h-screen bg-[#E6F1FD] pb-4">
        <div className="flex justify-between items-center px-8 pt-7.5 pb-5.25 border-b border-[#000000]/10  rounded-t-xl">
          <img
            src="/images/ConsentBit-logo-Dark.png"
            alt="logo"
            className="h-6"
          />
          <button
            type="button"
            onClick={() => {
              setPostSetupInstall(null);
              const sid = postSetupInstall?.siteId ? String(postSetupInstall.siteId) : "";
              const target = sid ? computeReturnTarget(sid, postSetupInstall?.returnTo || null) : "/dashboard";
              router.replace(target);
            }}
            className="cursor-pointer text-xs bg-white text-[#007AFF] px-3.75 py-3.5 rounded-lg font-medium"
          >
            Skip to Dashboard →
          </button>
        </div>
        <div className="flex justify-center mt-20 px-4">
          <StepWizard
            userName={userName}
            organizationId={activeOrganizationId}
            initialStep={3}
            initialSelectedPlan={'paid'}
            initialSiteData={{
              scriptUrl: postSetupInstall.scriptUrl,
              siteId: postSetupInstall.siteId,
              cdnScriptId: postSetupInstall.cdnScriptId,
              domain: postSetupInstall.siteDomain,
            }}
            onWizardComplete={async () => {
              setPostSetupInstall(null);
              await refresh({ showLoading: false });
            }}
          />
        </div>
      </div>
    );
  }

  if (authenticated && !showOnboarding) {
    return (
      <>
      <Header/>
      <div className="max-w-[1148px] mx-auto pb-4">
      <DashboardTabs/>
      <ComplianceAlert
        userName={userName}
        siteDomain={activeSite?.domain}
        bannerActive={Boolean(activeSite?.verified === 1 || activeSite?.verified === true)}
      />
      <SiteSummaryCards site={activeSite} onOpenInstall={() => setShowInstallModal(true)} />
      <GettingStarted activeSiteId={activeSiteId} />
      <InstallConsentModal
        open={showInstallModal}
        scriptUrl={rawInstallScriptUrl}
        siteDomain={activeSite?.domain}
        siteId={activeSite?.id ? String(activeSite.id) : undefined}
        cdnScriptId={activeSite?.cdnScriptId ? String(activeSite.cdnScriptId) : undefined}
        onClose={() => setShowInstallModal(false)}
      />
      {/* Post-payment: show install code after successful Stripe checkout */}
      <InstallConsentModal
        open={postSetupInstall !== null}
        scriptUrl={postSetupInstall?.scriptUrl ?? ''}
        siteDomain={postSetupInstall?.siteDomain}
        siteId={postSetupInstall?.siteId}
        cdnScriptId={postSetupInstall?.cdnScriptId}
        onClose={() => {
          const sid = postSetupInstall?.siteId ? String(postSetupInstall.siteId) : "";
          const target = sid ? computeReturnTarget(sid, postSetupInstall?.returnTo || null) : null;
          setPostSetupInstall(null);
          if (target) router.replace(target);
        }}
      />
      </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#E6F1FD] pb-4">
      {/* Navbar */}
      <div className="flex justify-between items-center px-8 pt-7.5 pb-5.25 border-b border-[#000000]/10  rounded-t-xl">
        <img
          src="/images/ConsentBit-logo-Dark.png"
          alt="logo"
          className="h-6"
        />
        <button
          type="button"
          onClick={() => {
            dismissOnboardingWizard();
            const target = activeSiteId ? `/dashboard/${activeSiteId}` : "/dashboard";
            router.replace(target);
          }}
          className="cursor-pointer text-xs bg-white text-[#007AFF] px-3.75 py-3.5 rounded-lg font-medium"
        >
          Skip to Dashboard →
        </button>
      </div>

      {/* Wizard */}
      {authenticated && showOnboarding && (
        <div className="flex justify-center mt-20">
          <StepWizard
            onWizardComplete={handleWizardComplete}
            organizationId={activeOrganizationId}
            userName={userName}
          />
        </div>
      )}
    </div>
  );
}