'use client';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useDashboardSession } from '../../DashboardSessionProvider';
import { ConsentLogsDashboard}  from './ConsentLogsDashboard';
import { ConsentRetentionCard } from './ConsentRetentionCard';

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
  return (
    <>
      {/* Retention period for the D1 Consent table. Sits above the log because the
          dashboard below is min-h-screen and would push it out of view. */}
      <div className="w-full bg-white px-8 pt-5">
        <div className="max-w-[1259px] mx-auto">
          <ConsentRetentionCard siteId={effectiveSiteId} />
        </div>
      </div>
      <ConsentLogsDashboard siteId={effectiveSiteId} siteDomain={siteDomain} legacyDomain={siteDomainRaw} isLegacy={isLegacy} platformSiteId={platformSiteId} platform={platform} />
    </>
  );
}
