
export const runtime = 'edge';
import { DomainManagementDashboard } from "./component/DomainManagementDashboard";

export default function page() {
  return (
    <div className="min-h-screen  pb-4 px-4">
      <DomainManagementDashboard/>
    </div>
  )
}
