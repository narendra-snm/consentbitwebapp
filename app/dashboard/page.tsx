
"use client";
export const runtime = 'edge';
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import DashboardTabs from "./components/DashboardTabs";
import GettingStarted from "./components/GettingStarted";
import Header from "./components/header";
import InstallConsentModal from "./components/InstallConsentModal";
import SiteSummaryCards from "./components/SiteSummaryCards";
import StepWizard from "./components/StepWizard";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardSession } from "./DashboardSessionProvider";
import { firstSetup } from "@/lib/client-api";
import ComplianceAlert from "./components/ComplianceAlert";
import FeedbackDesign from "./components/FeedbackDesign";
export default function DashboardPage() {
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();
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
 /** True when the URL signals a post-payment / post-setup return — suppresses wizard on first render. */
 const isPostPaymentFlow = (() => {
   if (typeof window === 'undefined') return false;
   const p = new URLSearchParams(window.location.search);
   return p.get('postSetup') === '1' || p.get('upgraded') === '1';
 })();
 const [wizardSkipped, setWizardSkipped] = useState(() => isPostPaymentFlow);
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
 const [pendingPostSetupSiteId, setPendingPostSetupSiteId] = useState<string | null>(() => {
   if (typeof window === 'undefined') return null;
   const p = new URLSearchParams(window.location.search);
   if (p.get('postSetup') === '1') return p.get('siteId') || null;
   return null;
 });
 const [pendingPostSetupReturnTo, setPendingPostSetupReturnTo] = useState<string | null>(() => {
   if (typeof window === 'undefined') return null;
   const p = new URLSearchParams(window.location.search);
   if (p.get('postSetup') === '1') return p.get('returnTo') || null;
   return null;
 });

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

 // Detect ?postSetup=1&domain=X on return from Stripe payment.
 // IMPORTANT: In App Router, changing only search params may not remount this page,
 // so we must react to `useSearchParams()` changes (not just on mount).
 const lastPostSetupSig = useRef<string>("");
 useEffect(() => {
   const params = searchParams;
   if (!params) return;
   if (params.get("postSetup") !== "1") return;

   const domain = params.get("domain") ?? "";
   const siteId = params.get("siteId") ?? "";
   const returnTo = params.get("returnTo") ?? "";
   const sig = `${domain}|${siteId}|${returnTo}`;
   if (sig && lastPostSetupSig.current === sig) return;
   lastPostSetupSig.current = sig;

   // domain= case is handled by PostSetupOverlay (works on any dashboard page).
   // page.tsx only handles siteId= (StepWizard first-time flow on /dashboard).
   if (domain) return;
   if (siteId) setPendingPostSetupSiteId(String(siteId));
   if (returnTo) setPendingPostSetupReturnTo(String(returnTo));
   if (siteId) setWizardSkipped(true);
 }, [searchParams]);

  // Detect ?upgraded=1&siteId=X&returnTo=Y on return from plan upgrade via UpgradePlanModal.
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

  // If we returned from Stripe with a siteId (upgrade / existing site), show its install code popup.
  // We render the popup immediately using a fallback script URL (derived from siteId) and then
  // upgrade it to the canonical `embedScriptUrl` once `sites` refresh completes.
  useEffect(() => {
    if (!pendingPostSetupSiteId || !authenticated) return;
    const id = String(pendingPostSetupSiteId);

    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    // Ensure modal opens immediately (even if sites/session still loading).
    setPostSetupInstall((prev) => {
      if (prev?.siteId === id) return prev;
      return {
        scriptUrl: "",
        siteId: id,
        siteDomain: "",
        cdnScriptId: undefined,
        returnTo: pendingPostSetupReturnTo || undefined,
      };
    });

    const tryResolve = async () => {
      if (cancelled) return;
      const match = (Array.isArray(sites) ? sites : []).find((s: any) => String(s?.id) === id);
      const scriptUrl =
        (match?.embedScriptUrl ?? match?.embed_script_url ?? match?.scriptUrl ?? match?.script_url) || null;
      const planId = match?.planId ?? match?.plan_id ?? match?.subscription_plan ?? match?.plan ?? null;
      const planReady = planId && String(planId).toLowerCase() !== "free";

      if (match && scriptUrl) {
        setPostSetupInstall({
          scriptUrl: String(scriptUrl),
          siteId: String(match.id),
          siteDomain: String(match.domain || ""),
          cdnScriptId: match?.cdnScriptId ? String(match.cdnScriptId) : undefined,
          returnTo: pendingPostSetupReturnTo || undefined,
        });
        // Keep polling until plan is also updated (Stripe webhook may lag)
        if (planReady || attempts >= 20) {
          setPendingPostSetupSiteId(null);
          return;
        }
      }

      // Not ready yet — refresh and retry a few times (webhook/session can lag).
      attempts += 1;
      if (attempts <= 20) {
        try {
          await refresh({ showLoading: false });
        } catch {
          // ignore
        }
        t = setTimeout(tryResolve, 1500);
      } else {
        // Give up polling; keep the fallback modal open (still usable), and clear pending flag.
        setPendingPostSetupSiteId(null);
      }
    };

    void tryResolve();

    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, [pendingPostSetupSiteId, authenticated, refresh, sites, pendingPostSetupReturnTo]);

 /** Raw URL from API (`Site.embedScriptUrl`); modal resolves to absolute — keeps snippet identical to stored value. */
 const rawInstallScriptUrl = (activeSite as any)?.embedScriptUrl ?? (activeSite as any)?.scriptUrl ?? "";

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


console.log("DashboardPage render", { loading, authenticated, user, sites, activeOrganizationId, activeSiteId, showOnboarding });

  // Post-payment pending: show a clean full-screen loader so the user never sees dashboard skeleton.
  // Also keep showing loader when wizardSkipped=true but postSetupInstall not yet ready (avoids
  // flashing the wizard + dashboard before the install modal appears).
  if (hydrated && (pendingPostSetupDomain || pendingPostSetupSiteId || (wizardSkipped && !postSetupInstall && !showOnboarding && loading))) {
    const loadingLabel = pendingPostSetupSiteId
      ? "Payment succeeded — updating your plan…"
      : "Setting up your site…";
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
          <p className="text-[#374151] text-sm font-medium">{loadingLabel}</p>
        </div>
      </div>
    );
  }

  // Post-payment: if install info is ready, always show the install popup even while session is still loading.
  if (hydrated && authenticated && postSetupInstall) {
    return (
      <div className="min-h-screen bg-[#E6F1FD]">
        <Header />
        <InstallConsentModal
          open={true}
          scriptUrl={postSetupInstall.scriptUrl}
          siteDomain={postSetupInstall.siteDomain}
          siteId={postSetupInstall.siteId}
          cdnScriptId={postSetupInstall.cdnScriptId}
          onClose={() => {
            const sid = postSetupInstall?.siteId ? String(postSetupInstall.siteId) : "";
            const target = sid ? computeReturnTarget(sid, postSetupInstall?.returnTo || null) : null;
            setPostSetupInstall(null);
            if (target) router.replace(target);
          }}
        />
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
//     return (
//       <div className="min-h-screen bg-[#E6F1FD] pb-4">
//         <div className="flex justify-between items-center px-8 pt-7.5 pb-5.25 border-b border-[#000000]/10  rounded-t-xl">
//           <img
//             src="/images/ConsentBit-logo-Dark.png"
//             alt="logo"
//             className="h-6"
//           />
//           <button
//             type="button"
//             onClick={() => {
//               setPostSetupInstall(null);
//               const sid = postSetupInstall?.siteId ? String(postSetupInstall.siteId) : "";
//               const target = sid ? computeReturnTarget(sid, postSetupInstall?.returnTo || null) : "/dashboard";
//               router.replace(target);
//             }}
//             className="cursor-pointer text-xs bg-white text-[#007AFF] px-3.75 py-3.5 rounded-lg font-medium"
//           >
//             Skip to Dashboard < svg className="inline ml-1" width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
// <path d="M9.37879e-05 4.99166V3.88766H6.69609L3.34809 0.767663L4.10409 -0.000336647L8.40009 4.09166V4.75166L4.10409 8.85566L3.34809 8.08766L6.67209 4.99166H9.37879e-05Z" fill="currentColor"/>
// </svg>

//           </button>
//         </div>
//         <div className="flex justify-center  px-4">
//           <StepWizard
//             userName={userName}
//             organizationId={activeOrganizationId}
//             initialStep={3}
//             initialSelectedPlan={'paid'}
//             initialSiteData={{
//               scriptUrl: postSetupInstall?.scriptUrl,
//               siteId: postSetupInstall?.siteId,
//               cdnScriptId: postSetupInstall?.cdnScriptId,
//               domain: postSetupInstall?.siteDomain,
//             }}
//             onWizardComplete={async () => {
//               setPostSetupInstall(null);
//               await refresh({ showLoading: false });
//             }}
//           />
//         </div>
//       </div>
//     );
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
      <FeedbackDesign/>
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
      </div>

      {/* Wizard — never render during post-payment flows; PostSetupOverlay handles those */}
      {authenticated && showOnboarding && loading===false && !isPostPaymentFlow && (
        <div className=" ">
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