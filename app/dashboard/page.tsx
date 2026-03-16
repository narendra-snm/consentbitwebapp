"use client";
import { useRouter } from "next/navigation";
import AddSiteModal from "./components/AddSiteModal";
import ComplianceAlert from "./components/ComplianceAlert";
import DashboardTabs from "./components/DashboardTabs";
import GettingStarted from "./components/GettingStarted";
import Header from "./components/header";
import InstallConsentModal from "./components/InstallConsentModal";
import SiteSummaryCards from "./components/SiteSummaryCards";
import StepWizard from "./components/StepWizard";

export default function DashboardPage() {
  const isNewUser = true; // later this can come from DB/session
 const router = useRouter();
  if (!isNewUser) {
    return (
      <>
      <Header/>
      <div className="max-w-[1148px] mx-auto pb-4">
      <DashboardTabs/>
      <ComplianceAlert/>
      <SiteSummaryCards/>
      <GettingStarted/>
      {/* <AddSiteModal open={true}  /> */}
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

        <button   onClick={() => router.push("/dashboard/one")}  className=" cursor-pointer text-xs bg-white text-[#007AFF] px-3.75 py-3.5 rounded-lg font-medium ">
        Skip to Dashboard → 
        </button>
      </div>

      {/* Wizard */}
      <div className="flex justify-center mt-20">
        <StepWizard />
      </div>
    </div>
  );
}