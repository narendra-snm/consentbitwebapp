export const runtime = 'edge';
import { DomainManagementDashboard } from "./component/DomainManagementDashboard";

export default function page() {
  return (
    <div>
      <DomainManagementDashboard/>
    </div>
  )
}
