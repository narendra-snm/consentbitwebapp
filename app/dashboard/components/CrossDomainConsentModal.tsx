'use client';

// Cross-domain consent, Captain Compliance style. Opened on one site (the primary); lists the
// account's other sites on the same main domain as checkboxes, plus the consent direction.
// Backed by /api/sites/consent-family (consent-manager handlers/consentFamily.js).

import { useEffect, useState } from 'react';
import { parseApiResponse } from '@/lib/client-api';

export type Direction = 'one_way' | 'two_way';

type Candidate = {
  id: string;
  domain: string;
  name: string | null;
  host: string;
  linked: boolean;
  linkedElsewhere: string | null; // 'primary' = has its own links; otherwise the site it is linked to
  canAdmin: boolean;
};

type ShareState = {
  success: boolean;
  error?: string;
  site: { id: string; domain: string; host: string };
  mainDomain: string | null;
  supported: boolean;
  reason: string | null;
  platform: string | null;
  memberOf: { id: string; domain: string | null; direction?: Direction } | null;
  direction: Direction | null;
  candidates: Candidate[];
};

export type ShareLink = {
  role: 'primary' | 'member';
  primaryId: string;
  primaryDomain: string;
  direction: Direction;
  linkedCount: number;
};

const MAX_LINKED = 10;

async function call<T>(method: 'GET' | 'POST', query: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/sites/consent-family${query}`, {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers: method === 'POST' ? { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } : undefined,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
  const data = await parseApiResponse(res);
  if (res.status === 404 && data?.error === 'Not Found') {
    throw new Error('Cross-domain consent is not available on the server yet.');
  }
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data as T;
}

/** Link badges for the site list. Never throws: no badges on failure. */
export async function fetchShareLinks(siteIds: string[]): Promise<Record<string, ShareLink>> {
  const ids = siteIds.filter(Boolean);
  if (!ids.length) return {};
  try {
    const data = await call<{ links: Record<string, ShareLink> }>('GET', `?siteIds=${encodeURIComponent(ids.join(','))}`);
    return data.links || {};
  } catch {
    return {};
  }
}

/** Unlink every site from this primary's group. Throws with the server's message on failure. */
export async function stopConsentSharing(primaryId: string): Promise<void> {
  await call('POST', '', { siteId: primaryId, siteIds: [], direction: 'one_way' });
}

export const directionLabel = (d: Direction) => (d === 'two_way' ? 'Two-way' : 'One-way');

const DIRECTION_OPTIONS: { id: Direction; title: string; desc: string }[] = [
  {
    id: 'one_way',
    title: 'One-way from primary',
    desc: 'This site writes the shared choice; linked domains read it and keep their own overrides.',
  },
  {
    id: 'two_way',
    title: 'Two-way within domain family',
    desc: 'Any linked domain can update the shared choice for the same main domain.',
  },
];

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

const mono = 'font-mono text-[12px]';

export default function CrossDomainConsentModal({
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
  const [state, setState] = useState<ShareState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [direction, setDirection] = useState<Direction>('one_way');
  const [confirmStop, setConfirmStop] = useState(false);

  const apply = (s: ShareState) => {
    setState(s);
    setSelected((s.candidates || []).filter((c) => c.linked).map((c) => c.id));
    setDirection(s.direction || 'one_way');
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    call<ShareState>('GET', `?siteId=${encodeURIComponent(siteId)}`)
      .then((s) => alive && apply(s))
      .catch((e) => alive && setError(e?.message || 'Could not load cross-domain consent.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [siteId]);

  const save = async (ids: string[]) => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      apply(await call<ShareState>('POST', '', { siteId, siteIds: ids, direction }));
      setSaved(true);
      setConfirmStop(false);
      onSaved?.();
    } catch (e: any) {
      setError(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (id: string) => {
    setSaved(false);
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_LINKED ? prev : [...prev, id]));
  };

  const host = state?.site.host || (siteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const candidates = state?.candidates || [];
  const linkedNow = candidates.filter((c) => c.linked).map((c) => c.id).sort().join(',');
  const removing = !!linkedNow && selected.length === 0;
  const dirty =
    !!state &&
    ([...selected].sort().join(',') !== linkedNow || (selected.length > 0 && !!linkedNow && direction !== (state.direction || 'one_way')));
  const showPicker = !!state && state.supported && !state.memberOf && candidates.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[12px] shadow-xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <p className="font-semibold text-[16px] text-black mb-1">Cross-domain consent</p>
        <p className="text-[12px] text-[#6b7280] mb-5">
          Choose which domains share consent with <span className={`${mono} text-black`}>{host}</span>.
        </p>

        {loading ? (
          <p className="text-[13px] text-[#6b7280] py-8 text-center">Loading…</p>
        ) : !state ? (
          <p className="text-[12px] text-red-600 mb-3">{error}</p>
        ) : !state.supported ? (
          <div className="rounded-[8px] bg-[#fff7ed] p-4 text-[13px] text-[#9a3412] mb-5">
            {state.reason === 'platform'
              ? `Sites on a builder address (${state.platform}) can't share consent: browsers keep every ${state.platform} site separate. Connect a custom domain first.`
              : 'This site’s address can’t share consent with other sites.'}
          </div>
        ) : state.memberOf ? (
          <div className="rounded-[8px] border border-[#e5e5e5] p-4 text-[13px] text-[#374151] mb-5">
            This site is linked to <span className={`${mono} text-black`}>{state.memberOf.domain || 'another site'}</span>
            {state.memberOf.direction ? ` (${directionLabel(state.memberOf.direction)})` : ''}. To change or remove the link, open
            Cross-domain on that site.
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center text-center py-6 mb-2">
            <span className="w-10 h-10 rounded-full border border-[#e5e5e5] flex items-center justify-center text-[#374151] mb-3">
              <LinkIcon />
            </span>
            <p className="text-[13px] font-semibold text-black mb-1">No domains to link</p>
            <p className="text-[12px] text-[#4b5563]">
              Only domains under <span className={mono}>{state.mainDomain}</span> can share its consent.
              <br />
              Add one of its subdomains as a site and it will show up here.
            </p>
          </div>
        ) : null}

        {showPicker && (
          <>
            <p className="text-[12px] font-medium text-[#374151] mb-2">Domains under {state!.mainDomain}</p>
            <div className="rounded-[8px] border border-[#e5e5e5] divide-y divide-[#e5e5e5] mb-5">
              {candidates.map((c) => {
                const blocked = !!c.linkedElsewhere || !c.canAdmin;
                const on = selected.includes(c.id);
                const note = c.linkedElsewhere === 'primary'
                  ? 'Has its own linked domains'
                  : c.linkedElsewhere
                    ? `Linked to ${c.linkedElsewhere}`
                    : !c.canAdmin
                      ? 'You are not an Admin of this site'
                      : null;
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 px-3 py-2.5 text-[13px] ${blocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-[#f9fafb]'}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={saving || blocked || (!on && selected.length >= MAX_LINKED)}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 accent-[#007aff] shrink-0"
                    />
                    <span className="flex-1 min-w-0">
                      <span className={`block truncate text-black ${mono}`}>{c.host}</span>
                      {note && <span className="block text-[11px] text-[#6b7280]">{note}</span>}
                    </span>
                  </label>
                );
              })}
            </div>

            <p className="text-[12px] font-medium text-[#374151] mb-2">Consent direction</p>
            <div className="grid gap-2 mb-4" role="radiogroup" aria-label="Consent direction">
              {DIRECTION_OPTIONS.map((o) => {
                const on = direction === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={saving}
                    onClick={() => {
                      setDirection(o.id);
                      setSaved(false);
                    }}
                    className={`text-left rounded-[8px] border p-3 transition-colors ${on ? 'border-[#007aff] bg-[#e6f1fd]' : 'border-[#e5e5e5] hover:bg-[#f9fafb]'}`}
                  >
                    <span className={`block text-[13px] font-medium ${on ? 'text-[#007aff]' : 'text-black'}`}>{o.title}</span>
                    <span className="block text-[11px] leading-[16px] text-[#6b7280] mt-1">{o.desc}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] leading-[16px] text-[#6b7280] mb-5">
              Use the same banner type for a region on every linked domain, and say in your banner or privacy policy that the choice
              applies across them.
            </p>
          </>
        )}

        {confirmStop && (
          <div className="rounded-[8px] bg-[#fef2f2] p-3 text-[12px] text-[#991b1b] mb-3">
            Stop sharing consent with all linked domains? Visitors will be asked again on each one.
          </div>
        )}
        {error && state && <p className="text-[12px] text-red-600 mb-3">{error}</p>}
        {saved && !error && <p className="text-[12px] text-[#15803d] mb-3">Saved. It applies on the next page load.</p>}

        <div className="flex justify-end gap-3">
          {showPicker && (dirty || confirmStop) ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="h-[38px] px-4 rounded-[8px] border border-[#e5e5e5] text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] disabled:opacity-50"
              >
                Cancel
              </button>
              {removing && !confirmStop ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setConfirmStop(true)}
                  className="h-[38px] px-4 rounded-[8px] bg-[#dc2626] text-white text-[13px] font-medium hover:bg-[#b91c1c] disabled:opacity-50"
                >
                  Stop sharing
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save(selected)}
                  className={`h-[38px] px-4 rounded-[8px] text-white text-[13px] font-medium disabled:opacity-50 ${confirmStop ? 'bg-[#dc2626] hover:bg-[#b91c1c]' : 'bg-[#007aff] hover:bg-[#0062cc]'}`}
                >
                  {saving ? 'Saving…' : confirmStop ? 'Confirm' : 'Save'}
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-[38px] px-4 rounded-[8px] border border-[#e5e5e5] text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] disabled:opacity-50"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
