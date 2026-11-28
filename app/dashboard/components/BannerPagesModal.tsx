'use client';

// "Disable banner on specific pages" (Cookie Banner → Settings → Disable banner on pages).
//   BannerPagesPanel — the page: on/off switch + every site you can manage, pencil per site
//   BannerPagesModal — "Choose pages" dialog for one site
// Backed by /api/sites/banner-pages (consent-manager handlers/bannerPages.js).
// Switching the panel off PAUSES every site's pages (kept, not applied); switching on resumes them.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseApiResponse } from '@/lib/client-api';
import { useDashboardSession } from '../DashboardSessionProvider';
import { siteTeamRole } from '@/lib/team-role';

export type BannerPageMode = 'hide' | 'off';
export type BannerPages = { paths: string[]; mode: BannerPageMode; paused?: boolean; plan?: string; planOk?: boolean };

const MAX_PATHS = 50;
const TEXT2 = 'text-[#4B5563]';
const BTN = 'h-[40px] rounded-[6px] px-4 inline-flex items-center gap-[6px] text-[14px] font-medium whitespace-nowrap border-0 cursor-pointer disabled:cursor-not-allowed';
const BTN_WHITE = `${BTN} bg-white text-[#111827] shadow-[inset_0_0_0_1px_#E5E5E5] hover:bg-[#F9F9FA] disabled:opacity-50`;
const BTN_BLUE = `${BTN} bg-[#007AFF] text-white hover:bg-[#0062CC] disabled:opacity-50 disabled:hover:bg-[#007AFF]`;

async function call<T>(method: 'GET' | 'POST', query: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/sites/banner-pages${query}`, {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers: method === 'POST' ? { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } : undefined,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
  const data = await parseApiResponse(res);
  if (res.status === 404 && data?.error === 'Not Found') {
    throw new Error('This setting is not available on the server yet.');
  }
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data as T;
}

/** Saved pages for a list of sites (only sites that have some). Never throws. */
export async function fetchBannerPages(siteIds: string[]): Promise<Record<string, BannerPages>> {
  const ids = siteIds.filter(Boolean);
  if (!ids.length) return {};
  try {
    const data = await call<{ pages: Record<string, BannerPages> }>('GET', `?siteIds=${encodeURIComponent(ids.join(','))}`);
    return data.pages || {};
  } catch {
    return {};
  }
}

/** Banner on every page again for this site. Throws with the server's message on failure. */
export async function clearBannerPages(siteId: string): Promise<void> {
  await call('POST', '', { siteId, paths: [], mode: 'hide' });
}

/** Keep a site's pages but stop (paused) or resume applying them. */
async function setBannerPagesPaused(siteId: string, v: BannerPages, paused: boolean): Promise<void> {
  await call('POST', '', { siteId, paths: v.paths, mode: v.mode, paused });
}

export const modeLabel = (m: BannerPageMode) => (m === 'off' ? 'ConsentBit off' : 'Banner hidden');

const hostOf = (u: string) => String(u || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');

/** What the user typed → '/path' or '/path/*', or an error message. Mirrors the server's rules. */
function cleanPath(input: string, siteHost: string): { path?: string; error?: string } {
  let s = input.trim();
  if (!s) return {};
  // A full URL, or "www.site.com/x" / "site.com/x" for this site → keep the path only.
  const bareHost = !/^https?:\/\//i.test(s) && !s.startsWith('/') ? hostOf(s) : '';
  if (/^https?:\/\//i.test(s) || /^www\./i.test(s) || (bareHost && bareHost === siteHost)) {
    let u: URL;
    try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return { error: 'That is not a valid address.' }; }
    const h = u.hostname.toLowerCase().replace(/^www\./, '');
    if (siteHost && h !== siteHost) return { error: `That link is on ${h}. Add pages for ${siteHost} only.` };
    s = u.pathname || '/';
  }
  s = s.split(/[?#]/)[0].toLowerCase();
  if (!s.startsWith('/')) s = '/' + s;
  const wildcard = s.endsWith('*');
  if (wildcard) s = s.slice(0, -1);
  if (s.includes('*')) return { error: 'Use * only at the end, like /landing/*' };
  if (/\s/.test(s)) return { error: "A path can't contain spaces." };
  s = s.replace(/\/{2,}/g, '/');
  if (s.length > 1) s = s.replace(/\/+$/, '');
  if (wildcard && s === '/') return { error: '/* would hide the banner on every page. List the pages instead.' };
  if (!/^\/[a-z0-9\-._~%/@!$&'()+,;=:]*$/.test(s)) return { error: 'Use a path like /privacy-policy.' };
  return { path: wildcard ? `${s}/*` : s };
}

const isSection = (p: string) => p.endsWith('/*');

/** "2 pages hidden", "1 section hidden", "1 page, 1 section hidden". */
function hiddenLabel(paths: string[]): string {
  const sec = paths.filter(isSection).length;
  const pg = paths.length - sec;
  const parts = [pg ? `${pg} page${pg === 1 ? '' : 's'}` : '', sec ? `${sec} section${sec === 1 ? '' : 's'}` : ''].filter(Boolean);
  return `${parts.join(', ')} hidden`;
}

const MODE_OPTIONS: { id: BannerPageMode; title: string; desc: string }[] = [
  {
    id: 'hide',
    title: 'Hide banner, keep blocking',
    desc: 'The banner is not shown on these pages. Cookies and trackers stay blocked until the visitor accepts on another page. Best for your privacy or cookie policy page.',
  },
  {
    id: 'off',
    title: 'Turn ConsentBit off on these pages',
    desc: 'Nothing runs on these pages: no banner and no blocking, so trackers there load without consent. Use only for a page the banner breaks.',
  },
];

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.8 4.3h10.4M6.3 4.3V2.8h3.4v1.5M4.2 4.3l.6 8.9h6.4l.6-8.9" />
  </svg>
);
const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.8 2.7a1.6 1.6 0 0 1 2.3 2.3L5.6 12.5l-3 .8.8-3z" />
    <path d="M8.5 13.3h5" />
  </svg>
);
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="7" cy="7" r="4.5" />
    <path d="m10.5 10.5 3 3" />
  </svg>
);

export default function BannerPagesModal({
  siteId,
  siteUrl,
  onClose,
  onSaved,
}: {
  siteId: string;
  siteUrl: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [initial, setInitial] = useState<BannerPages>({ paths: [], mode: 'hide' });
  const [paths, setPaths] = useState<string[]>([]);
  const [mode, setMode] = useState<BannerPageMode>('hide');
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const host = hostOf(siteUrl);

  const apply = (v: BannerPages) => {
    setInitial(v);
    setPaths(v.paths || []);
    setMode(v.mode || 'hide');
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    call<BannerPages>('GET', `?siteId=${encodeURIComponent(siteId)}`)
      .then((v) => alive && apply(v))
      .catch((e) => alive && setError(e?.message || 'Could not load.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [siteId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const locked = initial.planOk === false;
  const add = () => {
    const r = cleanPath(draft, host);
    if (r.error) return setDraftError(r.error);
    if (!r.path) return;
    if (paths.includes(r.path)) return setDraftError(`${r.path} is already in the list.`);
    if (paths.length >= MAX_PATHS) return setDraftError(`You can add up to ${MAX_PATHS} pages.`);
    setPaths((p) => [...p, r.path!]);
    setDraft('');
    setDraftError(null);
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      apply(await call<BannerPages>('POST', '', { siteId, paths, mode }));
      setSaved(true);
      onSaved?.();
    } catch (e: any) {
      setError(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const dirty = paths.join(',') !== initial.paths.join(',') || (paths.length > 0 && mode !== initial.mode);
  const status = error
    ? <span className="text-[#AC2734]">{error}</span>
    : dirty
      ? 'Unsaved changes'
      : saved
        ? <span className="text-[#15803D]">{initial.paused ? 'Saved. Turn the setting on to apply it.' : 'Saved. It applies on the next page load.'}</span>
        : '';

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(17,24,39,0.4)] grid place-items-center p-5"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pp-t"
        className="w-[640px] max-w-full max-h-[90vh] bg-white rounded-[12px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col text-[#111827] tracking-[-0.02em] antialiased"
      >
        <div className="px-7 pt-6">
          <h2 id="pp-t" className="m-0 text-[20px] font-semibold text-black">Disable banner on specific pages</h2>
          <p className={`m-0 mt-1 text-[14px] leading-[20px] ${TEXT2}`}>
            Pages on <span className="text-[#111827]">{host}</span> where the cookie banner is not shown.
          </p>
        </div>

        <div className="px-7 pt-5 pb-6 flex flex-col gap-4 overflow-y-auto">
          {loading ? (
            <p className={`text-[14px] ${TEXT2} py-8 text-center`}>Loading…</p>
          ) : (
            <>
              {locked && (
                <div className="rounded-[8px] bg-[#F5F3FF] shadow-[inset_0_0_0_1px_#DDD6FE] p-3 text-[13px] text-[#5B21B6]">
                  This setting is available on the <b>Growth</b> plan ({host} is on {initial.plan || 'a lower plan'}).{' '}
                  {paths.length ? 'You can still remove pages below. ' : ''}
                  <a href={`/dashboard/${encodeURIComponent(siteId)}/upgrade`} className="underline font-medium">Upgrade to Growth</a>
                </div>
              )}
              <div>
                <label htmlFor="pp-in" className="block text-[14px] font-medium mb-2">Page path</label>
                <div className="flex gap-[10px]">
                  <input
                    id="pp-in"
                    type="text"
                    value={draft}
                    disabled={saving || locked}
                    placeholder="/privacy-policy"
                    aria-describedby="pp-help"
                    aria-invalid={!!draftError}
                    onChange={(e) => { setDraft(e.target.value); setDraftError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
                    className={`flex-1 min-w-0 h-[44px] rounded-[8px] border-0 px-[14px] text-[15px] text-[#111827] outline-none bg-white disabled:bg-[#F9F9FA] focus:shadow-[inset_0_0_0_1px_#007AFF] ${draftError ? 'shadow-[inset_0_0_0_1px_#AC2734]' : 'shadow-[inset_0_0_0_1px_#D9D9D9]'}`}
                  />
                  <button
                    type="button"
                    onClick={add}
                    disabled={saving || !draft.trim() || locked}
                    className={`${BTN} h-[44px] px-5 bg-white text-[#007AFF] shadow-[inset_0_0_0_1px_#007AFF] hover:bg-[#E6F1FD] disabled:opacity-50 disabled:hover:bg-white`}
                  >
                    Add
                  </button>
                </div>
                {draftError && <div role="alert" className="text-[13px] text-[#AC2734] mt-[6px]">{draftError}</div>}
                <p id="pp-help" className={`m-0 mt-[6px] text-[13px] leading-[18px] ${TEXT2}`}>
                  One page, like /privacy-policy, or a section with *, like /landing/* (that page and everything under it). You can paste a full URL.
                </p>
              </div>

              {paths.length === 0 ? (
                <div className={`rounded-[8px] border border-dashed border-[#D9D9D9] p-5 text-[14px] ${TEXT2}`}>
                  No pages added. The banner shows on every page.
                </div>
              ) : (
                <div className="rounded-[8px] shadow-[inset_0_0_0_1px_#E5E5E5]">
                  <div className={`flex justify-between items-center px-[14px] py-[10px] bg-[#F9F9FA] rounded-t-[8px] text-[12px] font-medium ${TEXT2}`}>
                    <span>Banner hidden on</span>
                    <span>{paths.length === 1 ? '1 path' : `${paths.length} paths`}</span>
                  </div>
                  {paths.map((p) => (
                    <div key={p} className="flex items-center gap-3 py-[10px] pl-[14px] pr-2 border-t border-[#E5E5E5]">
                      <span className="flex-1 min-w-0 truncate font-mono text-[13px] tracking-normal">{p}</span>
                      <span className={`text-[12px] font-medium px-2 py-[2px] rounded-[6px] ${isSection(p) ? 'bg-[#E6F1FD] text-[#0062CC]' : `bg-[#F1F5F9] ${TEXT2}`}`}>
                        {isSection(p) ? 'Section' : 'Page'}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setPaths((x) => x.filter((y) => y !== p)); setSaved(false); }}
                        disabled={saving}
                        aria-label={`Remove ${p}`}
                        className={`w-8 h-8 rounded-[6px] grid place-items-center ${TEXT2} hover:bg-[#FEF2F2] hover:text-[#AC2734] disabled:opacity-50`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {paths.length > 0 && (
                <div>
                  <p className="m-0 text-[14px] font-medium mb-2">On these pages</p>
                  <div className="grid gap-2" role="radiogroup" aria-label="What happens on these pages">
                    {MODE_OPTIONS.map((o) => {
                      const on = mode === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          disabled={saving}
                          onClick={() => { setMode(o.id); setSaved(false); }}
                          className={`flex items-start gap-3 text-left rounded-[8px] px-[14px] py-3 ${on ? 'bg-[rgba(103,144,234,0.1)] shadow-[inset_0_0_0_1px_#007AFF]' : 'bg-white shadow-[inset_0_0_0_1px_#E5E5E5] hover:bg-[#F9F9FA]'}`}
                        >
                          <span className={`mt-[2px] w-4 h-4 rounded-full grid place-items-center shrink-0 border-[1.5px] ${on ? 'border-[#007AFF]' : 'border-[#4B5563]'}`}>
                            {on && <span className="w-2 h-2 rounded-full bg-[#007AFF]" />}
                          </span>
                          <span>
                            <span className="block text-[14px] font-medium">{o.title}</span>
                            <span className={`block text-[12px] leading-[17px] mt-[2px] ${TEXT2}`}>{o.desc}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {mode === 'off' && (
                    <div className="mt-2 rounded-[8px] bg-[#FFF7ED] p-3 text-[13px] text-[#9A3412]">
                      Trackers on these pages will run without the visitor&apos;s consent. Only use this if the banner stops the page from working.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-7 py-4 border-t border-[#E5E5E5] bg-[#F9F9FA] rounded-b-[12px] flex items-center justify-end gap-2">
          <span className={`flex-1 min-w-0 text-[13px] ${TEXT2}`}>{status}</span>
          <button type="button" onClick={onClose} disabled={saving} className={BTN_WHITE}>
            {dirty ? 'Cancel' : 'Close'}
          </button>
          {!loading && (
            <button type="button" disabled={saving || !dirty} onClick={save} className={BTN_BLUE}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type SiteRow = { id: string; domain: string; plan: string };
const PREF_KEY = 'cb_adv_bannerpages_on';

/** Own sites + sites the user is Admin of (the server allows the same); unassigned licences have no domain. */
function useAdminSites(): { rows: SiteRow[]; loading: boolean } {
  const { sites, loading } = useDashboardSession();
  const rows = useMemo<SiteRow[]>(
    () =>
      (Array.isArray(sites) ? sites : [])
        .filter((s: any) => s?.id && !s?._isUnassigned && siteTeamRole(s) !== 'member')
        .map((s: any) => ({
          id: String(s.id),
          domain: String(s.domain || s.name || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
          plan: String(s?.planId ?? s?.plan_id ?? s?.subscription_plan ?? s?.plan ?? 'free').toLowerCase(),
        }))
        .filter((r) => r.domain)
        .sort((a, b) => a.domain.localeCompare(b.domain)),
    [sites],
  );
  return { rows, loading };
}

/** The page under Cookie Banner → Settings. With `siteId` it shows only that site (the one
 *  picked in the header dropdown); without it, every site the user can manage. */
export function BannerPagesPanel({ siteId, header }: { siteId?: string; header?: React.ReactNode } = {}) {
  const { rows: allRows, loading } = useAdminSites();
  const rows = useMemo(() => (siteId ? allRows.filter((r) => r.id === siteId) : allRows), [allRows, siteId]);
  const single = !!siteId;
  const prefKey = siteId ? `${PREF_KEY}:${siteId}` : PREF_KEY;
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<SiteRow | null>(null);
  const [pages, setPages] = useState<Record<string, BannerPages>>({});
  const [loaded, setLoaded] = useState(false);
  const [wantOn, setWantOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try { setWantOn(window.localStorage.getItem(prefKey) === '1'); } catch { /* storage blocked */ }
  }, [prefKey]);
  const rememberOn = (v: boolean) => {
    setWantOn(v);
    try { window.localStorage.setItem(prefKey, v ? '1' : '0'); } catch { /* storage blocked */ }
  };

  // One site: the server's own plan check for it (same one the save uses), so a downgrade or
  // cancellation shows here even if the session's site list is stale.
  const [planInfo, setPlanInfo] = useState<{ ok: boolean; plan?: string } | null>(null);

  const ids = useMemo(() => rows.map((r) => r.id).join(','), [rows]);
  const reload = useCallback(() => {
    if (!ids) { setPages({}); setLoaded(true); return; }
    if (siteId) {
      call<BannerPages>('GET', `?siteId=${encodeURIComponent(siteId)}`)
        .then((v) => {
          setPages(v.paths?.length ? { [siteId]: v } : {});
          setPlanInfo(typeof v.planOk === 'boolean' ? { ok: v.planOk, plan: v.plan } : null);
          setLoaded(true);
        })
        .catch(() => fetchBannerPages([siteId]).then((p) => { setPages(p); setPlanInfo(null); setLoaded(true); }));
      return;
    }
    fetchBannerPages(ids.split(',')).then((p) => { setPages(p); setLoaded(true); });
  }, [ids, siteId]);
  useEffect(() => { reload(); }, [reload]);

  // Growth only: the served script ignores saved pages on any other plan, so the switch must too.
  const eligible = (r: SiteRow) => (single && planInfo ? planInfo.ok : r.plan === 'growth');
  const eligibleIds = new Set(rows.filter(eligible).map((r) => r.id));
  const planLocked = loaded && rows.length > 0 && eligibleIds.size === 0;
  const lockedPlan = planLocked && single ? (planInfo?.plan || rows[0]?.plan || '') : '';

  const activeIds = Object.keys(pages).filter((id) => eligibleIds.has(id) && !pages[id].paused);
  const pausedIds = Object.keys(pages).filter((id) => eligibleIds.has(id) && pages[id].paused);
  // On while any Growth site applies its pages; with only paused sites it is off; with none, it
  // follows the switch. Never on when no site here is on Growth.
  const on = loaded && !planLocked && (activeIds.length > 0 || (pausedIds.length === 0 && wantOn));

  const toggle = async () => {
    if (planLocked) return;
    setError(null);
    const next = !on;
    const targets = next ? pausedIds : activeIds;
    if (!targets.length) return rememberOn(next);
    setBusy(true);
    const failed: string[] = [];
    for (const id of targets) {
      try { await setBannerPagesPaused(id, pages[id], !next); }
      catch { failed.push(rows.find((r) => r.id === id)?.domain || id); }
    }
    rememberOn(next);
    if (failed.length) {
      setError(next
        ? `Could not turn this on for ${failed.join(', ')}. Pages are applied only on the Growth plan.`
        : `Could not turn this off for ${failed.join(', ')}. Try again.`);
    }
    setBusy(false);
    reload();
  };

  const q = search.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.domain.toLowerCase().includes(q)) : rows;
  const withPages = rows.filter((r) => pages[r.id]).length;

  return (
    <main className="w-full max-w-[1228px] mx-auto box-border px-4 sm:px-10 pt-8 pb-20 flex flex-col gap-5 text-[#111827] tracking-[-0.02em] antialiased">
      {header}
      <div>
        <h2 className="m-0 text-[20px] font-semibold tracking-[-0.5px] text-black">Disable banner on specific pages</h2>
        <p className={`m-0 mt-[6px] text-[15px] leading-[22px] max-w-[760px] ${TEXT2}`}>
          Hide the cookie banner on pages where it gets in the way, like your privacy or cookie policy. Visitors can still change their
          choices from the preferences link.
        </p>
      </div>

      <section className="rounded-[10px] shadow-[inset_0_0_0_1px_#E5E5E5] bg-white max-w-[1074px]">
        <div className="flex items-start gap-4 px-6 py-[22px]">
          <div className="flex-1 min-w-0">
            <h2 className="m-0 text-[18px] font-semibold text-black">Disable banner on specific pages</h2>
            <p className={`m-0 mt-1 text-[14px] leading-[20px] ${TEXT2}`}>
              Don&apos;t show the cookie banner on chosen pages of a site, for example your privacy or cookie policy page.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Disable banner on specific pages"
            disabled={!loaded || busy || planLocked}
            title={planLocked ? 'Available on the Growth plan' : undefined}
            onClick={toggle}
            className={`relative shrink-0 w-[52px] h-[28px] rounded-[14px] border-0 p-0 cursor-pointer ${planLocked ? 'disabled:cursor-not-allowed' : 'disabled:cursor-wait'} disabled:opacity-60 ${on ? 'bg-[#007AFF]' : 'bg-[#9CA3AF]'}`}
          >
            <span className={`absolute left-[3px] top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform ${on ? 'translate-x-[24px]' : 'translate-x-0'}`} />
          </button>
        </div>
        {error && <p className="m-0 px-6 pb-4 text-[13px] text-[#AC2734]">{error}</p>}

        <div className={on ? '' : 'opacity-[0.45] pointer-events-none'} aria-disabled={!on}>
          {!single && (
          <div className="px-6 pt-4 pb-[18px] border-t border-[#E5E5E5] flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[260px] max-w-[400px]">
              <label htmlFor="dp-q" className={`block text-[14px] mb-[10px] ${TEXT2}`}>Click the pencil on a site to choose its pages.</label>
              <div className={`flex items-center gap-2 h-[44px] rounded-[8px] shadow-[inset_0_0_0_1px_#E5E5E5] bg-white px-[14px] ${TEXT2} focus-within:shadow-[inset_0_0_0_1px_#007AFF]`}>
                <SearchIcon />
                <input
                  id="dp-q"
                  type="text"
                  value={search}
                  tabIndex={on ? 0 : -1}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search domain"
                  className="flex-1 min-w-0 h-full border-0 outline-0 bg-transparent text-[15px] text-[#111827]"
                />
              </div>
            </div>
            {loaded && rows.length > 0 && (
              <span className={`text-[13px] ml-auto ${TEXT2}`}>
                {withPages} of {rows.length} site{rows.length === 1 ? '' : 's'} hide the banner somewhere
              </span>
            )}
          </div>
          )}

          {loading && !rows.length ? (
            <p className={`m-0 px-6 py-7 border-t border-[#E5E5E5] text-[14px] ${TEXT2}`}>Loading…</p>
          ) : !shown.length ? (
            <p className={`m-0 px-6 py-7 border-t border-[#E5E5E5] text-center text-[14px] ${TEXT2}`}>
              {q ? `No domains match "${search.trim()}".` : single ? 'Only the site owner or an Admin can change this for this site.' : 'No sites yet.'}
            </p>
          ) : (
            shown.map((r) => {
              const p = pages[r.id];
              const growth = eligible(r);
              return (
                <div key={r.id} className="flex items-center gap-4 px-6 py-[14px] border-t border-[#E5E5E5]">
                  <div className="flex-1 min-w-0">
                    <span className={`block text-[12px] ${TEXT2}`}>Domain</span>
                    <span className="block text-[16px] font-semibold text-black mt-[2px] truncate">{r.domain}</span>
                    {p && <span className={`block text-[12px] mt-[2px] truncate ${TEXT2}`} title={p.paths.join('\n')}>{p.paths.join(', ')}</span>}
                  </div>
                  {p && !growth ? (
                    // Saved pages on a site that left Growth: kept, but the script ignores them.
                    <span
                      title="Saved pages are kept but not applied: this setting needs the Growth plan"
                      className={`inline-flex items-center h-[22px] px-[9px] rounded-[38px] text-[12px] font-medium whitespace-nowrap bg-[#F1F5F9] ${TEXT2}`}
                    >
                      Not applied · needs Growth
                    </span>
                  ) : p ? (
                    <span
                      title={p.mode === 'off' ? 'ConsentBit does not run on these pages (no blocking)' : undefined}
                      className={`inline-flex items-center h-[22px] px-[9px] rounded-[38px] text-[12px] font-medium whitespace-nowrap ${p.mode === 'off' ? 'bg-[#FFF7ED] text-[#9A3412]' : 'bg-[#E6F1FD] text-[#0062CC]'}`}
                    >
                      {hiddenLabel(p.paths)}{p.mode === 'off' ? ' · ConsentBit off' : ''}
                    </span>
                  ) : (
                    <span className={`inline-flex items-center h-[22px] px-[9px] rounded-[38px] text-[12px] font-medium whitespace-nowrap bg-[#F1F5F9] ${TEXT2}`}>
                      Banner on every page
                    </span>
                  )}
                  {/* Pencil on every row, as in the design. Non-Growth sites open the
                      dialog in its locked state, which explains the plan and links to upgrade. */}
                  <button
                    type="button"
                    onClick={() => setOpen(r)}
                    tabIndex={on ? 0 : -1}
                    aria-label={`Choose pages for ${r.domain}`}
                    title={growth || p ? undefined : `${r.domain} needs the Growth plan for this setting`}
                    className="w-[44px] h-[44px] shrink-0 rounded-[8px] shadow-[inset_0_0_0_1px_#E5E5E5] bg-white text-[#111827] grid place-items-center hover:bg-[#F9F9FA] hover:text-[#007AFF]"
                  >
                    <PencilIcon />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {planLocked ? (
          <div className="px-6 py-[14px] border-t border-[#DDD6FE] text-[13px] bg-[#F5F3FF] text-[#5B21B6] rounded-b-[10px]">
            This setting is available on the <b>Growth</b> plan
            {single ? <> ({rows[0]?.domain} is on {lockedPlan || 'a lower plan'})</> : null}. The banner shows on every page.
            {Object.keys(pages).length ? ' Your saved pages are kept and apply again on Growth.' : ''}{' '}
            {single && (
              <a href={`/dashboard/${encodeURIComponent(siteId!)}/upgrade`} className="underline font-medium">Upgrade to Growth</a>
            )}
          </div>
        ) : !on && loaded && (
          <div className={`px-6 py-[14px] border-t border-[#E5E5E5] text-[13px] bg-[#F9F9FA] rounded-b-[10px] ${TEXT2}`}>
            Off: the banner shows on every page of every site.{pausedIds.length ? ' Your saved pages are kept for when you turn this back on.' : ''}
          </div>
        )}
      </section>

      {open && <BannerPagesModal siteId={open.id} siteUrl={open.domain} onClose={() => setOpen(null)} onSaved={reload} />}
    </main>
  );
}
