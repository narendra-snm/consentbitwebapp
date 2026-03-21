'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useDashboardSession } from '../../DashboardSessionProvider';
import { ConsentLogsDashboard } from './ConsentLogsDashboard';

function pickSiteLabel(site: { name?: string; domain?: string } | null | undefined) {
  if (!site) return '';
  const name = typeof site.name === 'string' ? site.name.trim() : '';
  const domain = typeof site.domain === 'string' ? site.domain.trim() : '';
  // Match SiteSummaryCards: friendly name first, then domain
  return name || domain || '';
}

export default function ConsentLogsPage() {
  const params = useParams<{ id: string }>();
  const siteId = params?.id;
  const { sites, loading } = useDashboardSession();

  const siteFromSession = useMemo(
    () => sites.find((s: { id?: string | number }) => String(s?.id) === String(siteId)),
    [sites, siteId],
  );

  const resolved = siteFromSession;

  const siteDomain = useMemo(() => {
    if (loading) return '…';
    const label = pickSiteLabel(resolved as { name?: string; domain?: string });
    return label || '—';
  }, [loading, resolved]);

  if (!siteId) return null;

  return <ConsentLogsDashboard siteId={String(siteId)} siteDomain={siteDomain} />;
}
