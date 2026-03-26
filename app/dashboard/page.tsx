"use client";
import { usePathname, useRouter } from "next/navigation";
import AddSiteModal from "./components/AddSiteModal";
import ComplianceAlert from "./components/ComplianceAlert";
import DashboardTabs from "./components/DashboardTabs";
import GettingStarted from "./components/GettingStarted";
import Header from "./components/header";
import InstallConsentModal from "./components/InstallConsentModal";
import SiteSummaryCards from "./components/SiteSummaryCards";
import StepWizard from "./components/StepWizard";
import { useEffect, useMemo, useState } from "react";
import { useDashboardSession } from "./DashboardSessionProvider";
import { firstSetup } from "@/lib/client-api";
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
   scriptUrl: string; siteId: string; siteDomain: string; cdnScriptId?: string;
 } | null>(null);
 const [pendingPostSetupDomain, setPendingPostSetupDomain] = useState<string | null>(null);

 // Detect ?postSetup=1&domain=X on return from Stripe payment
 useEffect(() => {
   const params = new URLSearchParams(window.location.search);
   if (params.get('postSetup') === '1') {
     const domain = params.get('domain') ?? '';
     if (domain) {
       setPendingPostSetupDomain(domain);
       setWizardSkipped(true);
       window.history.replaceState({}, '', '/dashboard');
     }
   }
 }, []);

 // Once authenticated, create the site and show install code
 useEffect(() => {
   if (!pendingPostSetupDomain || loading || !authenticated) return;
   const domain = pendingPostSetupDomain;
   setPendingPostSetupDomain(null);
   firstSetup({ websiteUrl: domain }).then((result) => {
     const siteId = result?.siteId ?? result?.site?.id;
     const scriptUrl = result?.site?.embedScriptUrl ?? result?.scriptUrl ?? result?.site?.scriptUrl;
     const cdnScriptId = result?.site?.cdnScriptId;
     if (siteId && scriptUrl) {
       setPostSetupInstall({ scriptUrl, siteId, siteDomain: domain, cdnScriptId });
     }
     void refresh({ showLoading: false });
   }).catch(console.error);
 }, [pendingPostSetupDomain, loading, authenticated, refresh]);

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




  // Show skeleton while loading or while post-payment site setup is in progress
  if (loading || pendingPostSetupDomain) {
    return (
      <>
        <Header />
        <div className="max-w-[1148px] mx-auto pb-4">
          <DashboardTabs />
          {/* Skeleton cards */}
          <div className="grid grid-cols-2 gap-6 mt-4 animate-pulse">
            <div className="bg-white border border-gray-200 rounded-xl p-5 h-[260px]">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-20 bg-gray-100 rounded-lg mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 h-[260px]">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-20 bg-gray-100 rounded-lg mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
          <div className="bg-gray-100 rounded-xl mt-5 h-[120px] animate-pulse" />
          {pendingPostSetupDomain && (
            <div className="flex items-center justify-center gap-2 mt-6 text-sm text-gray-500">
              <svg className="animate-spin h-4 w-4 text-[#007AFF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Setting up your site…
            </div>
          )}
        </div>
      </>
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
        onClose={() => setPostSetupInstall(null)}
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