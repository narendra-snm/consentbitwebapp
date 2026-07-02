
'use client';




import { useParams } from 'next/navigation';
import { CookieScanDashboard } from './CookieScanDashboard';

export default function ScanPage() {
  const params = useParams<{ id: string }>();
  const siteId = params?.id;

  if (!siteId) return null;

  return (
    <div className="pt-1.5 px-4">
      <CookieScanDashboard siteId={String(siteId)} />
    </div>
  );
}
