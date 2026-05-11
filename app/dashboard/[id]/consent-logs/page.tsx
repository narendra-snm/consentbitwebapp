'use client';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useDashboardSession } from '../../DashboardSessionProvider';
import { ConsentLogsDashboard}  from './ConsentLogsDashboard';

function pickSiteLabel(site: { name?: string; domain?: string } | null | undefined) {
  if (!site) return '';
  const domain = typeof site.domain === 'string' ? site.domain.trim() : '';
  const name = typeof site.name === 'string' ? site.name.trim() : '';
  // Prefer the actual domain (e.g. biaw.com) over the Webflow shortName (e.g. biaw-stage)
  return domain || name || '';
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
console.log('resolved', resolved)
  const isLegacy = !!(resolved as any)?.isLegacy;
  const platform = (resolved as any)?.platform ?? null;
  const platformSiteId = (resolved as any)?.platformSiteId ?? (resolved as any)?.platformsiteid ?? null;
  // Migrated webapp users (isLegacy + platformSiteId) write new consents to the Consent table
  // using their webapp siteId — read from the new API, not the legacy store.
  const siteDomainRaw = (resolved as any)?.domain ?? (resolved as any)?.Domain ?? '';
  const effectiveSiteId = String(siteId);

  if (!siteId) return null;

  // Pass raw isLegacy — ConsentLogsDashboard uses the selected date to decide KV vs D1:
  // legacy + date ≤ June 2026 → legacy store (Framer KV for framer platform, KV/R2 otherwise),
  // legacy + date > June 2026 → D1.
  return <ConsentLogsDashboard siteId={effectiveSiteId} siteDomain={siteDomain} legacyDomain={siteDomainRaw} isLegacy={isLegacy} platformSiteId={platformSiteId} platform={platform} />;
}
