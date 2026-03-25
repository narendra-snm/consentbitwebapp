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
 const userName = useMemo(() => (userEmail ? userEmail.split("@")[0] : undefined), [userEmail]);
 const [showInstallModal, setShowInstallModal] = useState(false);

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
    await refresh();
  };

  const dismissOnboardingWizard = () => {
    setWizardSticky(false);
    setWizardSkipped(true);
  };




  if (!loading && authenticated && !showOnboarding) {
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
      {/* <AddSiteModal open={true}  /> */}
      {/* {<AddNewSiteModal onClose={() => router.push("/dashboard/one")} />} */}
      {/* <InstallConsentModal open={true} /> */}
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
            router.push("/dashboard");
          }}
          className=" cursor-pointer text-xs bg-white text-[#007AFF] px-3.75 py-3.5 rounded-lg font-medium "
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