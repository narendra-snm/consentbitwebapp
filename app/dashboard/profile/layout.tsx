import React from 'react'
import AddSiteModal from "../components/AddSiteModal";
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
      
{children}
      </>
  )
}
