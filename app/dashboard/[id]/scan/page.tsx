
'use client';




import { useParams } from 'next/navigation';
import { CookieScanDashboard } from './CookieScanDashboard';
// import { TransparencyPageCard } from './TransparencyPageCard'; // card hidden, see below

export default function ScanPage() {
  const params = useParams<{ id: string }>();
  const siteId = params?.id;

  if (!siteId) return null;

  return (
    <div className="pt-1.5 px-4">
      <CookieScanDashboard siteId={String(siteId)} />
      {/* Transparency page card hidden in production 2026-10-16: the worker has
          TRANSPARENCY_PAGE = "0" in production. Restore with the import above. */}
      {/* <TransparencyPageCard siteId={String(siteId)} /> */}
    </div>
  );
}
