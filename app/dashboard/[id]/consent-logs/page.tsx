'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSites } from '@/lib/client-api';
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
  const { sites, loading, activeOrganizationId } = useDashboardSession();
  const [fetchedSite, setFetchedSite] = useState<Record<string, unknown> | null>(null);

  const siteFromSession = useMemo(
    () => sites.find((s: { id?: string | number }) => String(s?.id) === String(siteId)),
    [sites, siteId],
  );

  // Session sites can be empty briefly after navigation; refetch if we have org but no match
  useEffect(() => {
    if (!siteId || loading) return;
    if (siteFromSession) {
      setFetchedSite(null);
      return;
    }
    if (!activeOrganizationId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await getSites(activeOrganizationId);
        if (cancelled || !res?.success) return;
        const list = (res as { sites?: Record<string, unknown>[] }).sites ?? [];
        const match = list.find((s) => String(s?.id) === String(siteId));
        if (match) setFetchedSite(match);
      } catch {
        if (!cancelled) setFetchedSite(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [siteId, siteFromSession, loading, activeOrganizationId]);

  const resolved = siteFromSession ?? fetchedSite;

  const siteDomain = useMemo(() => {
    if (loading) return '…';
    const label = pickSiteLabel(resolved as { name?: string; domain?: string });
    return label || '—';
  }, [loading, resolved]);

  if (!siteId) return null;

  return <ConsentLogsDashboard siteId={String(siteId)} siteDomain={siteDomain} />;
}
