'use client';

// Profile → Advanced settings. Sections for rarely-needed settings; the first is Cross-domain
// consent (Captain Compliance style). Its toggle shows the site list; it is on whenever any site
// is linked, and turning it off stops sharing on every linked group (after a confirm).
// Backed by /api/sites/consent-family.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDashboardSession } from '../../DashboardSessionProvider';
import { siteTeamRole } from '@/lib/team-role';
import { parseApiResponse } from '@/lib/client-api';
import CrossDomainConsentModal, {
  directionLabel,
  fetchShareLinks,
  stopConsentSharing,
  type ShareLink,
} from '../../components/CrossDomainConsentModal';
import BannerPagesModal, { clearBannerPages, fetchBannerPages, modeLabel, type BannerPages } from '../../components/BannerPagesModal';

type SiteRow = { id: string; domain: string; plan: string };

// Cross-domain consent and Disable banner on pages are Growth features (decided 2026-11-24).
// The server enforces it (handlers/consentFamily.js, bannerPages.js); this only labels the UI.
const isGrowth = (r: SiteRow) => r.plan === 'growth';

function GrowthPill() {
  return (
    <span
      title="Available on the Growth plan"
      className="inline-flex items-center h-[20px] px-[8px] rounded-full bg-[#ede9fe] text-[#6d28d9] text-[11px] font-semibold align-middle ml-2"
    >
      Growth
    </span>
  );
}

function UpgradeButton({ siteId, domain }: { siteId: string; domain: string }) {
  return (
    <a
      href={`/dashboard/${encodeURIComponent(siteId)}/upgrade`}
      title={`${domain} needs the Growth plan for this setting`}
      className="shrink-0 h-[38px] px-3 flex items-center justify-center rounded-[8px] border border-[#ddd6fe] bg-[#f5f3ff] text-[#6d28d9] text-[12px] font-medium hover:bg-[#ede9fe] transition-colors"
    >
      Upgrade to Growth
    </a>
  );
}

// Builder addresses: every customer gets a subdomain there and browsers keep them apart, so a
// site on one can never share consent (same list as consent-manager handlers/consentFamily.js).
const BUILDER_SUFFIXES = [
  'webflow.io', 'framer.website', 'framer.app', 'framer.media', 'framer.ai', 'framercanvas.com',
  'pages.dev', 'workers.dev', 'vercel.app', 'netlify.app', 'github.io', 'gitlab.io',
  'herokuapp.com', 'onrender.com', 'fly.dev', 'web.app', 'firebaseapp.com',
  'azurewebsites.net', 'azurestaticapps.net', 'cloudfront.net', 'amplifyapp.com',
  'wixsite.com', 'wixstudio.io', 'myshopify.com', 'squarespace.com', 'wordpress.com',
  'wpengine.com', 'wpenginepowered.com', 'blogspot.com', 'hs-sites.com', 'hubspotpagebuilder.com',
  'webnode.page', 'carrd.co', 'glitch.me', 'repl.co', 'replit.app', 'surge.sh', 'ngrok.io', 'ngrok-free.app',
  'myftpupload.com', 'godaddysites.com', 'weebly.com', 'jimdosite.com', 'strikingly.com', 'notion.site',
];

function hostOf(domain: string): string {
  let h = String(domain || '').trim().toLowerCase();
  try {
    h = new URL(/^https?:\/\//.test(h) ? h : `https://${h}`).hostname;
  } catch {
    h = h.split('/')[0];
  }
  return h.replace(/^www\./, '');
}
const isBuilderHost = (host: string) => BUILDER_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));

const PREF_KEY = 'cb_adv_crossdomain_on';

const PaperclipIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

function Toggle({ on, disabled, onChange, label }: { on: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-[24px] w-[44px] shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-[#007aff]' : 'bg-[#d1d5db]'}`}
    >
      <span className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[23px]' : 'translate-x-[3px]'}`} />
    </button>
  );
}

export default function AdvancedPage() {
  return (
    <div className="max-w-[860px]">
      <p className="font-semibold leading-[20px] text-[16px] text-black tracking-[-1px] mb-[4px]">Advanced settings</p>
      <p className="text-[13px] text-[#6b7280] mb-6">Settings most sites don&apos;t need. Leave them off unless you know you want them.</p>
      <div className="space-y-5">
        <BannerStatusSection />
        {/* Cross-domain consent moved to Cookie Banner → Settings (2026-11-24). CrossDomainSection kept below, unused. */}
        <BannerPagesSection />
      </div>
    </div>
  );
}

/** Own sites + sites the user is Admin of (the server allows the same); unassigned licences have no domain. */
function useAdminSites(): { rows: SiteRow[]; loading: boolean } {
  const { sites, loading } = useDashboardSession();
  const rows = useMemo<SiteRow[]>(
    () =>
      (Array.isArray(sites) ? sites : [])
        .filter((s: any) => s?.id && !s?._isUnassigned && siteTeamRole(s) !== 'member')
        .map((s: any) => ({
          id: String(s.id),
          domain: String(s.domain || s.name || ''),
          plan: String(s?.planId ?? s?.plan_id ?? s?.subscription_plan ?? s?.plan ?? 'free').toLowerCase(),
        }))
        .filter((r) => r.domain)
        .sort((a, b) => a.domain.localeCompare(b.domain)),
    [sites],
  );
  return { rows, loading };
}

function usePref(key: string): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try { setOn(window.localStorage.getItem(key) === '1'); } catch { /* storage blocked */ }
  }, [key]);
  const set = useCallback((v: boolean) => {
    setOn(v);
    try { window.localStorage.setItem(key, v ? '1' : '0'); } catch { /* storage blocked */ }
  }, [key]);
  return [on, set];
}

// ── Banner display status (like CookieYes): switch a site's script off to test/debug ──
async function bannerStatusCall<T>(method: 'GET' | 'POST', query: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/sites/banner-status${query}`, {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers: method === 'POST' ? { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } : undefined,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
  const data = await parseApiResponse(res);
  if (res.status === 404 && data?.error === 'Not Found') throw new Error('This setting is not available on the server yet.');
  if (!res.ok || data?.success === false) throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  return data as T;
}

function BannerStatusSection() {
  const { rows, loading } = useAdminSites();
  const [disabled, setDisabled] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [siteId, setSiteId] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedFor, setSavedFor] = useState<string | null>(null);

  const ids = useMemo(() => rows.map((r) => r.id).join(','), [rows]);
  const reload = useCallback(() => {
    if (!ids) { setDisabled({}); setLoaded(true); return; }
    bannerStatusCall<{ disabled: Record<string, string> }>('GET', `?siteIds=${encodeURIComponent(ids)}`)
      .then((d) => setDisabled(d.disabled || {}))
      .catch(() => setDisabled({}))
      .finally(() => setLoaded(true));
  }, [ids]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (!siteId && rows.length) setSiteId(rows[0].id); }, [rows, siteId]);

  const setStatus = async (id: string, enabled: boolean) => {
    setSaving(id);
    setError(null);
    setSavedFor(null);
    try {
      await bannerStatusCall('POST', '', { siteId: id, enabled });
      setDisabled((d) => {
        const next = { ...d };
        if (enabled) delete next[id];
        else next[id] = new Date().toISOString();
        return next;
      });
      setSavedFor(id);
    } catch (e: any) {
      setError(e?.message || 'Could not save.');
    } finally {
      setSaving(null);
    }
  };

  const domainOf = (id: string) => rows.find((r) => r.id === id)?.domain || id;
  const disabledIds = Object.keys(disabled).filter((id) => rows.some((r) => r.id === id));
  const isOff = !!disabled[siteId];

  return (
    <section className="rounded-[12px] border border-[#e5e7eb] bg-white px-5 py-5">
      <p className="text-[15px] font-semibold text-black mb-1">Banner display status</p>
      <p className="text-[12px] leading-[18px] text-[#6b7280] max-w-[620px] mb-4">
        Disable ConsentBit on a site to test and debug issues. While disabled, the script on that site does nothing: no banner and no
        blocking, so cookies and trackers load without consent. Turn it back on when you are done.
      </p>

      {disabledIds.length > 0 && (
        <div className="rounded-[8px] bg-[#fff7ed] border border-[#fed7aa] p-3 mb-4">
          <p className="text-[12px] font-medium text-[#9a3412] mb-2">
            Disabled now ({disabledIds.length}) — visitors on {disabledIds.length === 1 ? 'this site get' : 'these sites get'} no banner and no blocking:
          </p>
          <div className="flex flex-col gap-2">
            {disabledIds.map((id) => (
              <div key={id} className="flex items-center gap-3">
                <span className="flex-1 min-w-0 truncate text-[13px] text-black">{domainOf(id)}</span>
                <button
                  type="button"
                  disabled={saving === id}
                  onClick={() => setStatus(id, true)}
                  className="h-[30px] px-3 rounded-[8px] border border-[#007aff] text-[#007aff] text-[12px] font-medium hover:bg-[#e6f1fd] disabled:opacity-50 shrink-0"
                >
                  {saving === id ? 'Enabling…' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && !rows.length ? (
        <p className="text-[13px] text-[#6b7280]">Loading…</p>
      ) : !rows.length ? (
        <p className="text-[13px] text-[#6b7280]">No sites yet.</p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 min-w-0 flex-1 max-w-[360px]">
            <span className="text-[11px] text-[#6b7280]">Site</span>
            <select
              value={siteId}
              onChange={(e) => { setSiteId(e.target.value); setSavedFor(null); setError(null); }}
              className="h-[38px] rounded-[8px] border border-[#e5e5e5] bg-white px-3 text-[13px] text-black outline-none focus:border-[#007aff]"
            >
              {rows.map((r) => (
                <option key={r.id} value={r.id}>{r.domain}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#6b7280]">Status</span>
            <select
              value={isOff ? 'disabled' : 'enabled'}
              disabled={!loaded || !siteId || saving === siteId}
              onChange={(e) => setStatus(siteId, e.target.value === 'enabled')}
              className={`h-[38px] rounded-[8px] border px-3 text-[13px] outline-none focus:border-[#007aff] disabled:opacity-50 ${isOff ? 'border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]' : 'border-[#e5e5e5] bg-white text-black'}`}
            >
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          {saving === siteId && <span className="text-[12px] text-[#6b7280] pb-[10px]">Saving…</span>}
          {savedFor === siteId && !saving && !error && (
            <span className="text-[12px] text-[#15803d] pb-[10px]">Saved. It applies on the next page load.</span>
          )}
        </div>
      )}
      {error && <p className="mt-3 text-[12px] text-red-600">{error}</p>}
    </section>
  );
}

const BANNER_PAGES_PREF = 'cb_adv_bannerpages_on';

function BannerPagesSection() {
  const { rows, loading } = useAdminSites();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<SiteRow | null>(null);
  const [pages, setPages] = useState<Record<string, BannerPages>>({});
  const [loaded, setLoaded] = useState(false);
  const [wantOn, rememberOn] = usePref(BANNER_PAGES_PREF);
  const [confirmOff, setConfirmOff] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ids = useMemo(() => rows.map((r) => r.id).join(','), [rows]);
  const reload = useCallback(() => {
    if (!ids) { setPages({}); setLoaded(true); return; }
    fetchBannerPages(ids.split(',')).then((p) => { setPages(p); setLoaded(true); });
  }, [ids]);
  useEffect(() => { reload(); }, [reload]);

  const withPages = Object.keys(pages);
  const enabled = withPages.length > 0 || wantOn;

  const onToggle = (v: boolean) => {
    setError(null);
    if (v) return rememberOn(true);
    if (withPages.length) return setConfirmOff(true);
    rememberOn(false);
  };

  const clearAll = async () => {
    setClearing(true);
    setError(null);
    try {
      for (const id of withPages) await clearBannerPages(id);
      rememberOn(false);
      setConfirmOff(false);
    } catch (e: any) {
      setError(e?.message || 'Could not turn this off.');
    } finally {
      setClearing(false);
      reload();
    }
  };

  const q = search.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.domain.toLowerCase().includes(q)) : rows;

  return (
    <section className="rounded-[12px] border border-[#e5e7eb] bg-white">
      <div className="flex items-start gap-4 px-5 py-5">
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-black mb-1">Disable banner on specific pages<GrowthPill /></p>
          <p className="text-[12px] leading-[18px] text-[#6b7280] max-w-[620px]">
            Don&apos;t show the cookie banner on chosen pages of a site, for example your privacy or cookie policy page.
          </p>
        </div>
        <Toggle on={enabled} disabled={!loaded || clearing} onChange={onToggle} label="Disable banner on specific pages" />
      </div>

      {confirmOff && (
        <div className="mx-5 mb-5 rounded-[8px] bg-[#fef2f2] p-4">
          <p className="text-[13px] text-[#991b1b] mb-3">
            Turn this off? The pages you added are removed and the banner shows on every page again.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={clearing}
              onClick={() => setConfirmOff(false)}
              className="h-[34px] px-4 rounded-[8px] border border-[#e5e5e5] bg-white text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={clearing}
              onClick={clearAll}
              className="h-[34px] px-4 rounded-[8px] bg-[#dc2626] text-white text-[13px] font-medium hover:bg-[#b91c1c] disabled:opacity-50"
            >
              {clearing ? 'Turning off…' : 'Turn off'}
            </button>
          </div>
        </div>
      )}
      {error && <p className="mx-5 mb-4 text-[12px] text-red-600">{error}</p>}

      {enabled && (
        <div className="border-t border-[#e5e7eb]">
          <div className="px-5 pt-4 pb-3">
            <p className="text-[12px] text-[#6b7280]">Click the pencil on a site to choose its pages.</p>
            {rows.length > 5 && (
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search domain"
                className="mt-3 w-full max-w-[320px] h-[36px] rounded-[8px] border border-[#e5e5e5] px-3 text-[13px] text-black outline-none focus:border-[#007aff]"
              />
            )}
          </div>

          {loading && !rows.length ? (
            <p className="px-5 pb-5 text-[13px] text-[#6b7280]">Loading…</p>
          ) : !shown.length ? (
            <p className="px-5 pb-5 text-[13px] text-[#6b7280]">{q ? 'No domains match.' : 'No sites yet.'}</p>
          ) : (
            <div className="divide-y divide-[#e5e7eb] border-t border-[#e5e7eb]">
              {shown.map((r) => {
                const p = pages[r.id];
                return (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[#6b7280] mb-[2px]">Domain</p>
                      <div className="flex flex-wrap items-center gap-[8px]">
                        <span className="text-[14px] font-semibold text-black truncate max-w-full">{r.domain}</span>
                        {p && (
                          <>
                            <span
                              title={p.paths.join('\n')}
                              className="inline-flex items-center h-[22px] px-[7px] rounded-[6px] border border-[#e5e5e5] text-[11px] text-[#374151] font-mono"
                            >
                              {p.paths.length} page{p.paths.length === 1 ? '' : 's'}
                            </span>
                            <span
                              className={`inline-flex items-center h-[22px] px-[7px] rounded-[6px] border text-[11px] font-mono ${p.mode === 'off' ? 'border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]' : 'border-[#e5e5e5] text-[#374151]'}`}
                            >
                              {modeLabel(p.mode)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {isGrowth(r) || p ? (
                      <button
                        type="button"
                        onClick={() => setOpen(r)}
                        title="Choose pages"
                        aria-label={`Choose pages without the banner for ${r.domain}`}
                        className="shrink-0 h-[38px] w-[44px] flex items-center justify-center rounded-[8px] border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6] hover:text-[#007aff] transition-colors"
                      >
                        <PencilIcon size={16} />
                      </button>
                    ) : (
                      <UpgradeButton siteId={r.id} domain={r.domain} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {open && <BannerPagesModal siteId={open.id} siteUrl={open.domain} onClose={() => setOpen(null)} onSaved={reload} />}
    </section>
  );
}

const PencilIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

function CrossDomainSection() {
  const { rows: allRows, loading } = useAdminSites();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<SiteRow | null>(null);
  const [links, setLinks] = useState<Record<string, ShareLink>>({});
  const [linksLoaded, setLinksLoaded] = useState(false);
  const [wantOn, rememberOn] = usePref(PREF_KEY);
  const [confirmOff, setConfirmOff] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Builder addresses can never share consent, so they are not listed here.
  const rows = useMemo(() => allRows.filter((r) => !isBuilderHost(hostOf(r.domain))), [allRows]);
  const ids = useMemo(() => rows.map((r) => r.id).join(','), [rows]);

  const reload = useCallback(() => {
    if (!ids) { setLinks({}); setLinksLoaded(true); return; }
    fetchShareLinks(ids.split(',')).then((l) => { setLinks(l); setLinksLoaded(true); });
  }, [ids]);
  useEffect(() => { reload(); }, [reload]);

  const primaries = useMemo(
    () => [...new Set(Object.values(links).map((l) => l.primaryId))],
    [links],
  );
  const hasLinks = primaries.length > 0;
  const enabled = hasLinks || wantOn;

  const onToggle = (v: boolean) => {
    setError(null);
    if (v) return rememberOn(true);
    if (hasLinks) return setConfirmOff(true);
    rememberOn(false);
  };

  const stopAll = async () => {
    setStopping(true);
    setError(null);
    try {
      for (const p of primaries) await stopConsentSharing(p);
      rememberOn(false);
      setConfirmOff(false);
      reload();
    } catch (e: any) {
      setError(e?.message || 'Could not stop sharing.');
      reload();
    } finally {
      setStopping(false);
    }
  };

  const q = search.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.domain.toLowerCase().includes(q)) : rows;

  return (
      <section className="rounded-[12px] border border-[#e5e7eb] bg-white">
        <div className="flex items-start gap-4 px-5 py-5">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-black mb-1">Cross-domain consent<GrowthPill /></p>
            <p className="text-[12px] leading-[18px] text-[#6b7280] max-w-[620px]">
              Share a visitor&apos;s cookie choice between your sites on the same main domain (for example www.example.com and
              app.example.com), so they are not asked again on each one.
            </p>
          </div>
          <Toggle on={enabled} disabled={!linksLoaded || stopping} onChange={onToggle} label="Cross-domain consent" />
        </div>

        {confirmOff && (
          <div className="mx-5 mb-5 rounded-[8px] bg-[#fef2f2] p-4">
            <p className="text-[13px] text-[#991b1b] mb-3">
              Turn off cross-domain consent? This stops sharing on all linked domains, and visitors will be asked again on each one.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={stopping}
                onClick={() => setConfirmOff(false)}
                className="h-[34px] px-4 rounded-[8px] border border-[#e5e5e5] bg-white text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={stopping}
                onClick={stopAll}
                className="h-[34px] px-4 rounded-[8px] bg-[#dc2626] text-white text-[13px] font-medium hover:bg-[#b91c1c] disabled:opacity-50"
              >
                {stopping ? 'Turning off…' : 'Turn off'}
              </button>
            </div>
          </div>
        )}
        {error && <p className="mx-5 mb-4 text-[12px] text-red-600">{error}</p>}

        {enabled && (
          <div className="border-t border-[#e5e7eb]">
            <div className="px-5 pt-4 pb-3">
              <p className="text-[12px] text-[#6b7280]">
                Click the paperclip on the main site to choose which domains share its consent.
              </p>
              {rows.length > 5 && (
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search domain"
                  className="mt-3 w-full max-w-[320px] h-[36px] rounded-[8px] border border-[#e5e5e5] px-3 text-[13px] text-black outline-none focus:border-[#007aff]"
                />
              )}
            </div>

            {loading && !rows.length ? (
              <p className="px-5 pb-5 text-[13px] text-[#6b7280]">Loading…</p>
            ) : !shown.length ? (
              <p className="px-5 pb-5 text-[13px] text-[#6b7280]">
                {q ? 'No domains match.' : 'No sites on a custom domain yet. Cross-domain consent needs your own domain.'}
              </p>
            ) : (
              <div className="divide-y divide-[#e5e7eb] border-t border-[#e5e7eb]">
                {shown.map((r) => {
                  const link = links[r.id];
                  return (
                    <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-[#6b7280] mb-[2px]">Domain</p>
                        <div className="flex flex-wrap items-center gap-[8px]">
                          <span className="text-[14px] font-semibold text-black truncate max-w-full">{r.domain}</span>
                          {link?.role === 'member' && (
                            <span
                              title={`Shares consent with ${link.primaryDomain}`}
                              className="inline-flex items-center gap-[4px] max-w-full h-[22px] px-[7px] rounded-[6px] border border-[#e5e5e5] text-[11px] text-[#374151] font-mono"
                            >
                              <PaperclipIcon size={11} />
                              <span className="truncate">Linked to {link.primaryDomain}</span>
                            </span>
                          )}
                          {link && (
                            <span
                              title={link.role === 'primary' ? `Shares consent with ${link.linkedCount} linked domain${link.linkedCount === 1 ? '' : 's'}` : undefined}
                              className="inline-flex items-center h-[22px] px-[7px] rounded-[6px] border border-[#e5e5e5] text-[11px] text-[#374151] font-mono"
                            >
                              {directionLabel(link.direction)}
                            </span>
                          )}
                        </div>
                      </div>
                      {isGrowth(r) || link ? (
                        <button
                          type="button"
                          onClick={() => setOpen(r)}
                          title="Cross-domain consent"
                          aria-label={`Cross-domain consent for ${r.domain}`}
                          className="shrink-0 h-[38px] w-[44px] flex items-center justify-center rounded-[8px] border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6] hover:text-[#007aff] transition-colors"
                        >
                          <PaperclipIcon size={16} />
                        </button>
                      ) : (
                        <UpgradeButton siteId={r.id} domain={r.domain} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {open && (
          <CrossDomainConsentModal siteId={open.id} siteUrl={open.domain} onClose={() => setOpen(null)} onSaved={reload} />
        )}
      </section>
  );
}
