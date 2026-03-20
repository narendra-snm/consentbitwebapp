import { CookieScanDashboard } from "./CookieScanDashboard";
import  LoadingPopup  from "./component/LoadingPopup";
export default function page() {
  return (
    <div className="pt-1.5">
      <CookieScanDashboard/>
      {/* <LoadingPopup/> */}
    </div>
  )
}
