import AddSiteModal from "../components/AddSiteModal";
import ComplianceAlert from "../components/ComplianceAlert";

import GettingStarted from "../components/GettingStarted";

import InstallConsentModal from "../components/InstallConsentModal";
import SiteSummaryCards from "../components/SiteSummaryCards";


export default function page() {
  return (
      <>
        

        <div className="max-w-[1148px] mx-auto pb-4">
       
        <ComplianceAlert/>
        <SiteSummaryCards/>
        <GettingStarted/>
        {/* <AddSiteModal open={true}  /> */}
        {/* <InstallConsentModal open={true} /> */}
        </div>
        </>
    )
}
