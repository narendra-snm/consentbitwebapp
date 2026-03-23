import React from 'react'

export const runtime = 'edge'
import AddSiteModal from "../components/AddSiteModal";
import ComplianceAlert from "../components/ComplianceAlert";
import DashboardTabs from "../components/DashboardTabs";
import GettingStarted from "../components/GettingStarted";
import Header from "../components/header";
import InstallConsentModal from "../components/InstallConsentModal";
import SiteSummaryCards from "../components/SiteSummaryCards";
import StepWizard from "../components/StepWizard";
export default function layout({children}:{children:React.ReactNode}) {

  return (
    <>
      
<Header/>
      <div className="max-w-[1148px] mx-auto pb-4">
      <DashboardTabs/>
      
      </div>
{children}
      </>
  )
}
