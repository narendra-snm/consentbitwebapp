'use client';

// "Disable banner on specific pages" for one site (Profile → Advanced settings).
// Backed by /api/sites/banner-pages (consent-manager handlers/bannerPages.js).

import { useEffect, useState } from 'react';
import { parseApiResponse } from '@/lib/client-api';

export type BannerPageMode = 'hide' | 'off';
export type BannerPages = { paths: string[]; mode: BannerPageMode; plan?: string; planOk?: boolean };

const MAX_PATHS = 50;

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

export const modeLabel = (m: BannerPageMode) => (m === 'off' ? 'ConsentBit off' : 'Banner hidden');

/** What the user typed → '/path' or '/path/*', or an error message. Mirrors the server's rules. */
function cleanPath(input: string): { path?: string; error?: string } {
  let s = input.trim();
  if (!s) return {};
  if (/^https?:\/\//i.test(s)) {
    try { s = new URL(s).pathname || '/'; } catch { return { error: 'That is not a valid address.' }; }
  }
  s = s.split(/[?#]/)[0].toLowerCase();
  if (!s.startsWith('/')) s = '/' + s;
  const wildcard = s.endsWith('*');
  if (wildcard) s = s.slice(0, -1);
  if (s.includes('*')) return { error: 'Use * only at the end, like /landing/*.' };
  s = s.replace(/\/{2,}/g, '/');
  if (s.length > 1) s = s.replace(/\/+$/, '');
  if (wildcard && s === '/') return { error: '/* would hide the banner on every page. List the pages instead.' };
  if (!/^\/[a-z0-9\-._~%/@!$&'()+,;=:]*$/.test(s)) return { error: 'Use a path like /privacy-policy.' };
  return { path: wildcard ? `${s}/*` : s };
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

  const add = () => {
    const r = cleanPath(draft);
    if (r.error) return setDraftError(r.error);
    if (!r.path) return;
    if (paths.includes(r.path)) return setDraftError('Already added.');
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
  const host = (siteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[12px] shadow-xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <p className="font-semibold text-[16px] text-black mb-1">Disable banner on specific pages</p>
        <p className="text-[12px] text-[#6b7280] mb-5">
          Pages on <span className="font-mono text-[12px] text-black">{host}</span> where the cookie banner is not shown.
        </p>

        {loading ? (
          <p className="text-[13px] text-[#6b7280] py-8 text-center">Loading…</p>
        ) : (
          <>
            {initial.planOk === false && (
              <div className="rounded-[8px] border border-[#ddd6fe] bg-[#f5f3ff] p-3 text-[12px] text-[#5b21b6] mb-4">
                This setting is available on the <b>Growth</b> plan ({host} is on {initial.plan || 'a lower plan'}).{' '}
                {paths.length ? 'You can still remove all pages below. ' : ''}
                <a href={`/dashboard/${encodeURIComponent(siteId)}/upgrade`} className="underline font-medium">Upgrade to Growth</a>
              </div>
            )}
            <label htmlFor="bp-path" className="block text-[12px] font-medium text-[#374151] mb-2">Page path</label>
            <div className="flex gap-2 mb-1">
              <input
                id="bp-path"
                type="text"
                value={draft}
                disabled={saving || initial.planOk === false}
                placeholder="/privacy-policy"
                onChange={(e) => { setDraft(e.target.value); setDraftError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
                className="flex-1 min-w-0 h-[38px] rounded-[8px] border border-[#e5e5e5] px-3 text-[13px] text-black outline-none focus:border-[#007aff]"
              />
              <button
                type="button"
                onClick={add}
                disabled={saving || !draft.trim() || initial.planOk === false}
                className="h-[38px] px-4 rounded-[8px] border border-[#007aff] text-[#007aff] text-[13px] font-medium hover:bg-[#e6f1fd] disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {draftError ? (
              <p className="text-[11px] text-red-600 mb-3">{draftError}</p>
            ) : (
              <p className="text-[11px] text-[#6b7280] mb-3">
                One page, like <span className="font-mono">/privacy-policy</span>, or a section with <span className="font-mono">*</span>, like{' '}
                <span className="font-mono">/landing/*</span> (that page and everything under it). You can paste a full URL.
              </p>
            )}

            {paths.length === 0 ? (
              <div className="rounded-[8px] border border-dashed border-[#e5e5e5] p-4 text-[12px] text-[#6b7280] mb-5">
                No pages added. The banner shows on every page.
              </div>
            ) : (
              <div className="rounded-[8px] border border-[#e5e5e5] divide-y divide-[#e5e5e5] mb-5">
                {paths.map((p) => (
                  <div key={p} className="flex items-center gap-3 px-3 py-2.5 text-[13px]">
                    <span className="flex-1 min-w-0 truncate font-mono text-[12px] text-black">{p}</span>
                    <button
                      type="button"
                      onClick={() => { setPaths((x) => x.filter((y) => y !== p)); setSaved(false); }}
                      disabled={saving}
                      className="text-[12px] text-[#b91c1c] hover:underline disabled:opacity-50 shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {paths.length > 0 && (
              <>
                <p className="text-[12px] font-medium text-[#374151] mb-2">On these pages</p>
                <div className="grid gap-2 mb-5" role="radiogroup" aria-label="Behaviour on these pages">
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
                        className={`text-left rounded-[8px] border p-3 transition-colors ${on ? 'border-[#007aff] bg-[#e6f1fd]' : 'border-[#e5e5e5] hover:bg-[#f9fafb]'}`}
                      >
                        <span className={`block text-[13px] font-medium ${on ? 'text-[#007aff]' : 'text-black'}`}>{o.title}</span>
                        <span className="block text-[11px] leading-[16px] text-[#6b7280] mt-1">{o.desc}</span>
                      </button>
                    );
                  })}
                </div>
                {mode === 'off' && (
                  <div className="rounded-[8px] bg-[#fff7ed] p-3 text-[12px] text-[#9a3412] mb-5">
                    Trackers on these pages will run without the visitor&apos;s consent. Only use this if the banner stops the page from working.
                  </div>
                )}
              </>
            )}
          </>
        )}

        {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}
        {saved && !error && <p className="text-[12px] text-[#15803d] mb-3">Saved. It applies on the next page load.</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-[38px] px-4 rounded-[8px] border border-[#e5e5e5] text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] disabled:opacity-50"
          >
            {dirty ? 'Cancel' : 'Close'}
          </button>
          {!loading && (
            <button
              type="button"
              disabled={saving || !dirty}
              onClick={save}
              className="h-[38px] px-4 rounded-[8px] bg-[#007aff] text-white text-[13px] font-medium hover:bg-[#0062cc] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
