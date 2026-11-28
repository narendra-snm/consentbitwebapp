'use client';

// Cross-domain consent, Captain Compliance style. Opened on one site (the primary).
// Matches the "Cross-domain consent" design canvas (claude.ai artifact cf84cd2f…, 2026-11-24):
// master switch + primary domain chip, (1) Subdomains of the main domain (one shared cookie),
// (2) Other domains (separate main domains: the choice travels with the visitor on links between
// them), (3) Consent direction, (4) Tell visitors (list switch + optional list-of-sites link);
// right panel = tree of how consent is shared + what a visitor sees; unsaved-changes bar; Link
// domain and Unlink dialogs. Every domain is its own site in the account with its own script, so
// "Add subdomain" / "Add a new domain" for a domain that isn't a site yet opens Add site.
// Not built from the canvas: the "Renew consents" banner (no re-ask mechanism yet).
// Backed by /api/sites/consent-family (consent-manager handlers/consentFamily.js).

import { useEffect, useMemo, useState } from 'react';
import { parseApiResponse } from '@/lib/client-api';
import { resolveInstallScriptUrl } from '@/lib/consentbit-script';
import { useDashboardSession } from '../DashboardSessionProvider';

export type Direction = 'one_way' | 'two_way';

type Candidate = {
  id: string;
  domain: string;
  name: string | null;
  host: string;
  root?: string | null;
  sameRoot?: boolean; // false = a different main domain ("Other domains")
  linked: boolean;
  linkedElsewhere: string | null; // 'primary' = has its own links; otherwise the site it is linked to
  canAdmin: boolean;
  plan?: string;
  planOk?: boolean; // Growth only (server enforces it)
  lastSharedAt?: string | number | null; // last consent carried over to it
  scriptLive?: boolean; // server: banner sweep's scriptStatus over the sticky verified flag
};

type ShareState = {
  success: boolean;
  error?: string;
  site: { id: string; domain: string; host: string; plan?: string; planOk?: boolean };
  requiredPlan?: string;
  mainDomain: string | null;
  supported: boolean;
  reason: string | null;
  platform: string | null;
  memberOf: { id: string; domain: string | null; direction?: Direction } | null;
  direction: Direction | null;
  showList?: boolean;
  listUrl?: string;
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
const SETUP_GUIDE_URL = 'https://www.consentbit.com/help-document';

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

/** "2 h ago" from an ISO string or epoch (s or ms). */
function timeAgo(v: string | number | null | undefined): string | null {
  if (v == null || v === '') return null;
  let ms = typeof v === 'number' || /^\d+$/.test(String(v)) ? Number(v) : Date.parse(String(v));
  if (!Number.isFinite(ms)) return null;
  if (ms < 1e12) ms *= 1000;
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? '1 day ago' : `${d} days ago`;
}

const cleanDomain = (v: string) => v.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
const validListUrl = (u: string) => !u.trim() || /^https:\/\/\S+\.\S+/.test(u.trim());

const openAddSite = () => {
  try {
    window.dispatchEvent(new CustomEvent('cb:open-add-site'));
  } catch {}
};

// ── Design tokens (from the canvas) ──
const BLUE = '#007AFF';
const TEXT2 = 'text-[#4B5563]';
const HATCH = 'repeating-linear-gradient(135deg, #fff 0 6px, #F9F9FA 6px 12px)';
const btnBase =
  'h-[40px] rounded-[6px] px-4 inline-flex items-center gap-[6px] text-[14px] font-medium whitespace-nowrap border-0 disabled:opacity-50 disabled:cursor-not-allowed';
const btnPrimary = `${btnBase} bg-[#007AFF] text-white hover:bg-[#0062cc]`;
const btnSecondary = `${btnBase} bg-white text-[#111827] shadow-[inset_0_0_0_1px_#E5E5E5] hover:bg-[#f9fafb]`;
const btnDanger = `${btnBase} bg-[#AC2734] text-white hover:bg-[#8f1f2b]`;
const btnSmall = '!h-[32px] !px-3 !text-[13px]';
const card = 'rounded-[10px] shadow-[inset_0_0_0_1px_#E5E5E5] bg-white';
const ROW = 'grid grid-cols-[18px_minmax(0,1fr)_150px_120px_32px] gap-[14px] items-center px-5';

const Ic = {
  link: (size = 16) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.3 11.7a3.5 3.5 0 0 0 5 0l2.6-2.6a3.5 3.5 0 0 0-5-5l-.8.8" />
      <path d="M11.7 8.3a3.5 3.5 0 0 0-5 0l-2.6 2.6a3.5 3.5 0 0 0 5 5l.8-.8" />
    </svg>
  ),
  globe: (size = 14) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" />
      <path d="M1.8 8h12.4M8 1.8c1.7 1.8 2.5 3.9 2.5 6.2S9.7 12.4 8 14.2C6.3 12.4 5.5 10.3 5.5 8S6.3 3.6 8 1.8z" />
    </svg>
  ),
  plus: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3.3v9.4M3.3 8h9.4" />
    </svg>
  ),
  trash: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.8 4.3h10.4M6.3 4.3V2.8h3.4v1.5M4.2 4.3l.6 8.9h6.4l.6-8.9" />
    </svg>
  ),
  check: (size = 12) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  ),
  warn: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 mt-[1px]">
      <path d="M8 2.2 1.8 13.3h12.4z" />
      <path d="M8 6.5v3.2M8 11.4v.1" />
    </svg>
  ),
  close: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  oneWay: () => (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8h10M9.5 4.5 13 8l-3.5 3.5" />
    </svg>
  ),
  twoWay: () => (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 5.5h10M10.5 3 13 5.5 10.5 8" />
      <path d="M13 10.5H3M5.5 8 3 10.5 5.5 13" />
    </svg>
  ),
};

function Pill({ tone, children }: { tone: 'green' | 'amber' | 'red'; children: React.ReactNode }) {
  const c = {
    green: { bg: 'rgba(46,192,79,0.1)', fg: '#118A41' },
    amber: { bg: '#FFF6E6', fg: '#965200' },
    red: { bg: '#FFEFEF', fg: '#AC2734' },
  }[tone];
  return (
    <span
      className="inline-flex items-center gap-[6px] h-[24px] px-[10px] rounded-[38px] text-[12px] font-medium whitespace-nowrap justify-self-start"
      style={{ background: c.bg, color: c.fg }}
    >
      <span className="w-[6px] h-[6px] rounded-full" style={{ background: c.fg }} aria-hidden="true" />
      {children}
    </span>
  );
}

function Checkbox({ on, disabled, onChange, label }: { on: boolean; disabled?: boolean; onChange: () => void; label: string }) {
  return (
    <label className={`relative grid place-items-center w-[18px] h-[18px] ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={on}
        disabled={disabled}
        onChange={onChange}
        aria-label={label}
        className="peer absolute inset-0 opacity-0 m-0 cursor-[inherit]"
      />
      <span
        aria-hidden="true"
        className="w-[16px] h-[16px] rounded-[4px] grid place-items-center pointer-events-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#007AFF] peer-focus-visible:ring-offset-1"
        style={on ? { background: BLUE } : { boxShadow: 'inset 0 0 0 1.5px #4B5563' }}
      >
        {on && Ic.check()}
      </span>
    </label>
  );
}

function Switch({ on, disabled, onChange, label, muted }: { on: boolean; disabled?: boolean; onChange: () => void; label: string; muted?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="relative w-[40px] h-[22px] rounded-[11px] border-0 p-0 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      // muted: on, but not in effect (sharing paused) — grey track, still clickable to turn off.
      style={{ background: on ? (muted ? '#9CA3AF' : BLUE) : '#9CA3AF' }}
    >
      <span
        className="absolute left-[3px] top-[3px] w-[16px] h-[16px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform duration-150"
        style={{ transform: `translateX(${on ? 18 : 0}px)` }}
      />
    </button>
  );
}

function SectionHead({ n, title, desc, right }: { n: number; title: string; desc: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 px-5 pt-[18px] pb-[14px] flex-wrap">
      <div className="flex-1 min-w-[240px]">
        <h2 className="m-0 text-[16px] font-semibold text-black flex items-center gap-2">
          <span className="w-[22px] h-[22px] rounded-full bg-[#007AFF] text-white text-[12px] font-semibold grid place-items-center shrink-0">{n}</span>
          {title}
        </h2>
        <p className={`m-0 mt-1 text-[14px] leading-[20px] ${TEXT2}`}>{desc}</p>
      </div>
      {right}
    </div>
  );
}

/** One node in the "How consent is shared" tree. */
function TreeNode({ host, sub, active, twoWay }: { host: string; sub: string; active: boolean; twoWay: boolean }) {
  return (
    <div className="relative">
      <span className="absolute left-[-22px] top-1/2 w-[16px] border-t-[1.5px] border-[#9FBCE4]" aria-hidden="true" />
      <span
        className="absolute left-[-19px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-white grid place-items-center"
        style={{ boxShadow: `inset 0 0 0 1.5px ${active ? BLUE : '#D9D9D9'}`, color: active ? BLUE : '#6B7280' }}
        aria-hidden="true"
      >
        {twoWay ? Ic.twoWay() : Ic.oneWay()}
      </span>
      <div
        className="rounded-[8px] px-3 py-[10px] text-[13px] font-medium"
        style={active ? { boxShadow: 'inset 0 0 0 1px #E5E5E5', background: '#fff' } : { boxShadow: 'inset 0 0 0 1px #D9D9D9', background: HATCH, color: '#4B5563' }}
      >
        <span className="block truncate">{host}</span>
        <span className={`block text-[11px] font-normal ${TEXT2}`}>{sub}</span>
      </div>
    </div>
  );
}

/** Inline version for Cookie Banner → Settings (no overlay, no Close button). */
export function CrossDomainConsentPanel({ siteId, siteUrl, header }: { siteId: string; siteUrl: string; header?: React.ReactNode }) {
  return <CrossDomainConsentModal siteId={siteId} siteUrl={siteUrl} onClose={() => {}} inline header={header} />;
}

export default function CrossDomainConsentModal({
  siteId,
  siteUrl,
  onClose,
  onSaved,
  inline = false,
  header,
}: {
  siteId: string;
  siteUrl: string;
  onClose: () => void;
  onSaved?: () => void;
  inline?: boolean;
  /** Inline only: the Settings page header + tabs, shown above the title. */
  header?: React.ReactNode;
}) {
  const { sites } = useDashboardSession();
  const [state, setState] = useState<ShareState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [direction, setDirection] = useState<Direction>('one_way');
  const [shareOn, setShareOn] = useState(false);
  const [showList, setShowList] = useState(true);
  const [listUrl, setListUrl] = useState('');
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [sub, setSub] = useState('');
  const [subErr, setSubErr] = useState<{ text: string; addSite?: boolean } | null>(null);
  const [subOpen, setSubOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [ndErr, setNdErr] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // Script status = the site's existing "verified" flag; install snippet = the site's own embed script.
  const siteInfo = useMemo(() => {
    const m = new Map<string, { verified: boolean; snippet: string }>();
    (Array.isArray(sites) ? sites : []).forEach((s: any) => {
      if (!s?.id) return;
      const url = resolveInstallScriptUrl(s?.embedScriptUrl ?? s?.scriptUrl ?? null, String(s.id), s?.cdnScriptId ?? null);
      m.set(String(s.id), {
        verified: s?.verified === 1 || s?.verified === true,
        snippet: url ? `<script id="consentbit" type="text/javascript" src="${url}"></script>` : '',
      });
    });
    return m;
  }, [sites]);
  // Prefer the server's scriptLive (banner sweep found the script removed → not installed);
  // fall back to the sticky verified flag when the worker predates that field.
  const isVerified = (id: string) => {
    const c = state?.candidates?.find((x) => x.id === id);
    if (c && typeof c.scriptLive === 'boolean') return c.scriptLive;
    return !!siteInfo.get(id)?.verified;
  };

  const apply = (s: ShareState) => {
    const linked = (s.candidates || []).filter((c) => c.linked).map((c) => c.id);
    setState(s);
    setSelected(linked);
    setDirection(s.direction || 'one_way');
    setShareOn(linked.length > 0);
    setShowList(s.showList !== false);
    setListUrl(s.listUrl || '');
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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || saving) return;
      if (confirmUnlink) setConfirmUnlink(false);
      else if (linkOpen) setLinkOpen(false);
      else if (!inline) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmUnlink, linkOpen, saving, onClose, inline]);

  const host = state?.site.host || (siteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const root = state?.mainDomain || host;
  const candidates = state?.candidates || [];
  const subCands = candidates.filter((c) => c.sameRoot !== false);
  const otherCands = candidates.filter((c) => c.sameRoot === false);
  const linkedIds = candidates.filter((c) => c.linked).map((c) => c.id);
  const savedDirection = state?.direction || 'one_way';
  const listBad = !validListUrl(listUrl);
  const dirty =
    !!state &&
    ([...selected].sort().join(',') !== [...linkedIds].sort().join(',') ||
      (selected.length > 0 && linkedIds.length > 0 && direction !== savedDirection) ||
      showList !== (state.showList !== false) ||
      listUrl.trim() !== (state.listUrl || ''));
  const removed = candidates.filter((c) => c.linked && !selected.includes(c.id));
  const canEdit = !!state && state.supported && !state.memberOf && (state.site.planOk !== false || linkedIds.length > 0);
  const locked = !canEdit;
  // Main domain left Growth with links still saved: the banner script stops sharing for the whole
  // group (worker cdnTest/cdnM), links are kept and resume on Growth. Only unlinking is possible.
  const paused = !!state && state.site.planOk === false && linkedIds.length > 0;
  const twoWay = direction === 'two_way';

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      apply(await call<ShareState>('POST', '', { siteId, siteIds: selected, direction, showList, listUrl: listUrl.trim() }));
      setConfirmUnlink(false);
      setToast(selected.length || linkedIds.length === 0 ? 'Cross-domain settings saved' : 'Consent sharing stopped');
      onSaved?.();
    } catch (e: any) {
      setError(e?.message || 'Could not save.');
      setConfirmUnlink(false);
    } finally {
      setSaving(false);
    }
  };

  const onSave = () => (listBad ? null : removed.length ? setConfirmUnlink(true) : save());
  const discard = () => {
    if (state) apply(state);
    setError(null);
    setSubErr(null);
  };

  const blockNote = (c: Candidate): string | null => {
    if (c.linkedElsewhere === 'primary') return 'Has its own linked domains';
    if (c.linkedElsewhere) return `Linked to ${c.linkedElsewhere}`;
    if (!c.canAdmin) return 'You are not an Admin of this site';
    if (paused && !c.linked) return 'Linking new domains needs the Growth plan';
    // One-way: linked sites may be on any plan. Two-way: each needs Growth (server enforces both).
    if (twoWay && c.planOk === false && !c.linked) return `Two-way needs the Growth plan (on ${c.plan || 'a lower plan'})`;
    return null;
  };
  // Picked sites that block two-way sharing (not on Growth).
  const twoWayBlockers = candidates.filter((c) => selected.includes(c.id) && c.planOk === false);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_LINKED ? prev : [...prev, id]));

  const toggleShare = () => {
    if (shareOn) {
      setShareOn(false);
      setSelected([]);
    } else {
      setShareOn(true);
      setSelected(linkedIds);
    }
  };

  // "Add subdomain": it must be a site in the account (it runs its own script).
  const addSub = () => {
    const label = cleanDomain(sub);
    if (!label) return;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(label)) {
      setSubErr({ text: 'Use letters, numbers and hyphens, like help' });
      return;
    }
    const full = label === root || label.endsWith(`.${root}`) ? label : `${label}.${root}`;
    const c = subCands.find((x) => cleanDomain(x.host) === full);
    if (!c) {
      setSubErr({ text: `${full} isn't a site in your account yet. Add it as a site first, then pick it here.`, addSite: true });
      return;
    }
    pickSub(c);
  };
  const pickSub = (c: Candidate) => {
    const note = blockNote(c);
    if (note) return setSubErr({ text: `${c.host} can't be linked: ${note}.` });
    if (!selected.includes(c.id)) {
      if (selected.length >= MAX_LINKED) return setSubErr({ text: `You can link up to ${MAX_LINKED} domains.` });
      setSelected((p) => [...p, c.id]);
    }
    setSubErr(null);
    setSub('');
    setSubOpen(false);
  };
  // Subdomains are no longer listed automatically: the table shows only the ones
  // picked or already linked, and the add box suggests the rest of the account's
  // sites under the main domain (all on focus, filtered as you type).
  const subRows = subCands.filter((c) => c.linked || selected.includes(c.id));
  const subQuery = cleanDomain(sub);
  const subSuggest = subCands.filter(
    (c) => !c.linked && !selected.includes(c.id) && (!subQuery || cleanDomain(c.host).includes(subQuery)),
  );

  // Link domain dialog
  const linkable = otherCands.filter((c) => !selected.includes(c.id));
  const ndProblem = (v: string) => {
    const d = cleanDomain(v);
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) return 'Enter a domain like example.com';
    if (d === root || d.endsWith(`.${root}`)) return `That's part of ${root}. Add it under Subdomains.`;
    const known = otherCands.find((c) => cleanDomain(c.host) === d);
    if (known && selected.includes(known.id)) return 'That domain is already linked.';
    return '';
  };
  const openLink = () => {
    setPick(null);
    setNewDomain('');
    setNdErr('');
    setLinkOpen(true);
  };
  const doLink = () => {
    if (pick) {
      if (selected.length >= MAX_LINKED) return setNdErr(`You can link up to ${MAX_LINKED} domains.`);
      setSelected((p) => (p.includes(pick) ? p : [...p, pick]));
      setLinkOpen(false);
      return;
    }
    const err = ndProblem(newDomain);
    if (err) return setNdErr(err);
    const d = cleanDomain(newDomain);
    const known = otherCands.find((c) => cleanDomain(c.host) === d);
    if (known) {
      const note = blockNote(known);
      if (note) return setNdErr(`${d} can't be linked: ${note}.`);
      setSelected((p) => [...p, known.id]);
      setLinkOpen(false);
      return;
    }
    // A brand-new domain becomes a site first (it needs its own script and plan).
    setLinkOpen(false);
    setToast(`Add ${d} as a site, then link it here`);
    openAddSite();
  };

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((x) => (x === id ? null : x)), 1500);
    } catch {
      setError('Could not copy. Select the code and copy it manually.');
    }
  };

  const selSubs = subCands.filter((c) => selected.includes(c.id));
  const selOthers = otherCands.filter((c) => selected.includes(c.id));
  const subMissing = selSubs.filter((c) => !isVerified(c.id));
  const firstLinked = (selSubs[0] || selOthers[0])?.host || `app.${root}`;

  const syncText = (c: Candidate, on: boolean) => {
    if (!on) return c.linked ? 'Unlinks after you save' : 'Not sharing';
    if (!c.linked) return 'Shares after you save';
    if (!isVerified(c.id)) return 'Waiting for script';
    const ago = timeAgo(c.lastSharedAt);
    return ago ? `Synced ${ago}` : 'No visits yet';
  };
  const treeSub = (c: Candidate, pendingText: string) =>
    !c.linked ? 'Links after you save' : isVerified(c.id) ? 'Shares consent' : pendingText;

  return (
    <div
      className={inline ? 'min-h-full' : 'fixed inset-0 z-50 bg-[rgba(17,24,39,0.4)] flex items-center justify-center p-4'}
      onMouseDown={inline ? undefined : (e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div
        role={inline ? 'region' : 'dialog'}
        aria-modal={inline ? undefined : true}
        aria-labelledby="cdc-title"
        className={`bg-white text-[#111827] tracking-[-0.02em] antialiased relative flex flex-col ${inline ? '' :'rounded-[12px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] w-full max-w-[1228px] max-h-[92vh]'}`}
      >
        <main className={`w-full max-w-[1228px] mx-auto box-border px-4 sm:px-10 ${inline ? 'pt-8 pb-[120px]' : 'pt-10 pb-10 overflow-y-auto'} flex flex-col gap-5`}>
          {inline && header}
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              {inline ? (
                <h2 id="cdc-title" className="m-0 text-[20px] font-semibold tracking-[-0.5px] text-black">Cross-domain consent</h2>
              ) : (
                <h1 id="cdc-title" className="m-0 text-[25px] font-semibold tracking-[-1px] text-black">Cross-domain consent</h1>
              )}
              <p className={`m-0 ${inline ? 'mt-[6px] text-[15px]' : 'mt-2 text-[16px]'} leading-[22px] max-w-[760px] ${TEXT2}`}>
                Ask visitors once. Their cookie choices on {host} carry over to your subdomains and other sites you link, so they
                don&apos;t see the banner again.
              </p>
            </div>
            {!inline && (
              <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="w-[40px] h-[40px] grid place-items-center rounded-[8px] text-[#4B5563] hover:bg-[#F3F4F6]">
                {Ic.close()}
              </button>
            )}
          </div>

          {loading ? (
            <p className={`text-[14px] ${TEXT2} py-10 text-center`}>Loading…</p>
          ) : !state ? (
            <p className="text-[14px] text-[#AC2734]">{error}</p>
          ) : (
            <>
              {!state.supported ? (
                <div role="status" className="flex items-start gap-[10px] rounded-[10px] px-[18px] py-[14px] bg-[#FFF6E6] text-[14px] leading-[20px]">
                  <span className="text-[#965200] flex">{Ic.warn()}</span>
                  <span>
                    {state.reason === 'platform'
                      ? `Sites on a builder address (${state.platform}) can't share consent: browsers keep every ${state.platform} site separate. Connect a custom domain to use this.`
                      : 'This site’s address can’t share consent with other sites.'}
                  </span>
                </div>
              ) : state.memberOf ? (
                <div className={`${card} px-5 py-4 text-[14px] leading-[20px]`}>
                  This site is linked to <b className="font-semibold">{state.memberOf.domain || 'another site'}</b>
                  {state.memberOf.direction ? ` (${directionLabel(state.memberOf.direction)})` : ''}. To change or remove the link, open
                  Cross-domain consent on that site.
                </div>
              ) : state.site.planOk === false && linkedIds.length === 0 ? (
                <div className="rounded-[10px] px-[18px] py-[14px] bg-[#f5f3ff] text-[14px] text-[#5b21b6]">
                  Cross-domain consent is available on the <b>Growth</b> plan. <b>{host}</b> is on {state.site.plan || 'a lower plan'}.{' '}
                  <a href={`/dashboard/${encodeURIComponent(siteId)}/upgrade`} className="underline font-medium">Upgrade to Growth</a>
                </div>
              ) : paused ? (
                <div className="rounded-[10px] px-[18px] py-[14px] bg-[#fff7ed] text-[14px] leading-[20px] text-[#9a3412]">
                  <b>Sharing is paused.</b> Cross-domain consent needs the <b>Growth</b> plan and <b>{host}</b> is on {state.site.plan || 'a lower plan'}, so
                  visitors&apos; choices are not shared with your linked domains right now. Your links are kept and sharing starts again when you upgrade.
                  Other changes are locked until you upgrade; you can still turn sharing off with the switch below.{' '}
                  <a href={`/dashboard/${encodeURIComponent(siteId)}/upgrade`} className="underline font-medium">Upgrade to Growth</a>
                </div>
              ) : null}

              {/* Master switch */}
              <section className={`${card} px-5 py-[18px] flex items-center gap-4`}>
                <span className="w-[44px] h-[44px] rounded-[8px] bg-[#E6F1FD] text-[#007AFF] grid place-items-center shrink-0">{Ic.link(22)}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="m-0 text-[16px] font-semibold text-black">Share consent across domains</h2>
                  <p className={`m-0 mt-1 text-[14px] leading-[20px] ${TEXT2}`}>
                    Primary domain{' '}
                    <span className="inline-flex items-center gap-[6px] h-[26px] px-[10px] rounded-[6px] bg-[#F9F9FA] shadow-[inset_0_0_0_1px_#E5E5E5] text-[13px] font-medium text-[#111827] align-middle">
                      {Ic.globe(14)}
                      {host}
                    </span>
                    &nbsp; Visitors&apos; choices here are the source for every linked domain.
                  </p>
                </div>
                {paused && shareOn && (
                  <span
                    title="Links are saved but not in effect until the main domain is on Growth"
                    className="inline-flex items-center h-[22px] px-[9px] rounded-[38px] text-[12px] font-medium whitespace-nowrap bg-[#FFF7ED] text-[#9A3412]"
                  >
                    Paused
                  </span>
                )}
                <Switch
                  on={shareOn}
                  muted={paused}
                  disabled={locked || saving}
                  onChange={toggleShare}
                  label={paused && shareOn ? 'Share consent across domains (paused)' : 'Share consent across domains'}
                />
              </section>

              <div className="flex flex-wrap gap-4 items-start">
                {/* Left column */}
                <div
                  className={`flex-[999_1_600px] min-w-0 flex flex-col gap-4 ${locked || !shareOn ? 'opacity-50 pointer-events-none select-none' : ''}`}
                  aria-disabled={locked || !shareOn ? true : undefined}
                >
                  {/* 1. Subdomains */}
                  <section className={card}>
                    <SectionHead
                      n={1}
                      title={`Subdomains of ${root}`}
                      desc={`Checked subdomains share one consent cookie set on .${root}.`}
                      right={<span className={`text-[12px] whitespace-nowrap ${TEXT2}`}>{selSubs.length} sharing</span>}
                    />
                    <div className="border-t border-[#E5E5E5] overflow-x-auto">
                      <div className="min-w-[560px]">
                        <div className={`${ROW} py-[9px] bg-[#F9F9FA] text-[12px] font-medium border-b border-[#E5E5E5] ${TEXT2}`}>
                          <span />
                          <span>Subdomain</span>
                          <span>ConsentBit script</span>
                          <span>Last sync</span>
                          <span />
                        </div>
                        {subRows.map((c) => {
                          const on = selected.includes(c.id);
                          const note = blockNote(c);
                          const full = !on && selected.length >= MAX_LINKED;
                          return (
                            <div key={c.id} className={`${ROW} py-3 border-b border-[#E5E5E5] ${note ? 'opacity-60' : ''}`}>
                              <Checkbox on={on} disabled={saving || paused || !!note || full} onChange={() => toggle(c.id)} label={`Share consent with ${c.host}`} />
                              <div className={`text-[14px] font-medium truncate ${on ? '' : 'text-[#4B5563]'}`}>
                                {c.host}
                                <span className={`block text-[12px] font-normal mt-[1px] truncate ${TEXT2}`}>
                                  {note || (full ? `Up to ${MAX_LINKED} linked domains` : 'Site in your account')}
                                </span>
                              </div>
                              {isVerified(c.id) ? <Pill tone="green">Script installed</Pill> : <Pill tone="red">Script not found</Pill>}
                              <span className={`text-[12px] ${TEXT2}`}>{syncText(c, on)}</span>
                              <span />
                            </div>
                          );
                        })}
                        {subRows.length === 0 && (
                          <div className={`px-5 py-4 text-[13px] border-b border-[#E5E5E5] ${TEXT2}`}>
                            {subCands.length
                              ? `No subdomains added yet. Click the box below to pick one of your ${root} sites.`
                              : `No subdomains of ${root} in your account yet. Add one as a site first.`}
                          </div>
                        )}
                      </div>
                    </div>
                    {subMissing.length > 0 && (
                      <div className="flex gap-[10px] items-start text-[13px] leading-[18px] rounded-[8px] px-3 py-[10px] mx-5 my-[14px] bg-[#FFF6E6]">
                        <span className="text-[#965200] flex">{Ic.warn()}</span>
                        <span>
                          We couldn&apos;t find the ConsentBit script on{' '}
                          <b className="font-semibold">{subMissing.map((c) => c.host).join(', ')}</b>. Add that site&apos;s ConsentBit script
                          (from its own dashboard). Sharing starts there once it runs.
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2 items-start px-5 py-3 border-t border-[#E5E5E5] bg-[#F9F9FA] rounded-b-[10px] flex-wrap">
                      <div className="flex-1 min-w-[200px] relative">
                        <label htmlFor="cd-sub" className="sr-only">Add a subdomain</label>
                        <div
                          className="h-[40px] rounded-[8px] bg-white flex items-center"
                          style={{ boxShadow: `inset 0 0 0 1px ${subErr ? '#AC2734' : subOpen ? '#007AFF' : '#D9D9D9'}` }}
                        >
                          <input
                            id="cd-sub"
                            disabled={paused}
                            placeholder="help"
                            autoComplete="off"
                            role="combobox"
                            aria-expanded={subOpen && subSuggest.length > 0}
                            aria-controls="cd-sub-list"
                            value={sub}
                            onFocus={() => setSubOpen(true)}
                            onBlur={() => setTimeout(() => setSubOpen(false), 150)}
                            onChange={(e) => {
                              setSub(e.target.value);
                              setSubErr(null);
                              setSubOpen(true);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                // Enter picks the only match, else checks the typed name.
                                if (subSuggest.length === 1 && subQuery) pickSub(subSuggest[0]);
                                else addSub();
                              } else if (e.key === 'Escape') {
                                setSubOpen(false);
                              }
                            }}
                            className="flex-1 min-w-0 h-full border-0 outline-none pl-3 pr-1 text-[14px] text-right bg-transparent text-[#111827] placeholder:text-[#9CA3AF]"
                          />
                          <span className={`pr-3 text-[14px] ${TEXT2}`}>.{root}</span>
                        </div>
                        {subOpen && (
                          <div
                            id="cd-sub-list"
                            role="listbox"
                            aria-label={`Your sites under ${root}`}
                            className="absolute left-0 right-0 bottom-[calc(100%+4px)] z-20 max-h-[240px] overflow-y-auto rounded-[8px] bg-white shadow-[0_8px_24px_rgba(17,24,39,0.12),inset_0_0_0_1px_#E5E5E5] py-1"
                          >
                            <div className={`px-3 pt-1 pb-[6px] text-[11px] font-medium uppercase tracking-[0.04em] ${TEXT2}`}>
                              Your sites under {root}
                            </div>
                            {subSuggest.length === 0 ? (
                              <div className={`px-3 py-2 text-[13px] ${TEXT2}`}>
                                {subQuery ? `No site matching "${subQuery}". Press Enter to check it.` : 'All of them are already added.'}
                              </div>
                            ) : (
                              subSuggest.map((c) => {
                                const note = blockNote(c);
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    role="option"
                                    aria-selected={false}
                                    disabled={!!note}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => pickSub(c)}
                                    className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-[#F1F5F9] disabled:opacity-60 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                  >
                                    <span className="flex-1 min-w-0">
                                      <span className="block text-[14px] font-medium text-[#111827] truncate">{c.host}</span>
                                      {note && <span className={`block text-[12px] truncate ${TEXT2}`}>{note}</span>}
                                    </span>
                                    {isVerified(c.id) ? <Pill tone="green">Script installed</Pill> : <Pill tone="red">Script not found</Pill>}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                        {subErr && (
                          <div className="text-[12px] text-[#AC2734] mt-[5px] flex flex-wrap items-center gap-2">
                            <span>{subErr.text}</span>
                            {subErr.addSite && (
                              <button type="button" onClick={openAddSite} className="text-[#007AFF] underline">
                                Add site
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          // Empty box: open the list of the account's sites under the main domain.
                          if (!subQuery) {
                            setSubErr(null);
                            setSubOpen(true);
                            (document.getElementById('cd-sub') as HTMLInputElement | null)?.focus();
                            return;
                          }
                          if (subSuggest.length === 1) pickSub(subSuggest[0]);
                          else addSub();
                        }}
                        disabled={saving || paused}
                        className={btnSecondary}
                      >
                        {Ic.plus()}Add subdomain
                      </button>
                    </div>
                  </section>

                  {/* 2. Other domains */}
                  <section className={card}>
                    <SectionHead
                      n={2}
                      title="Other domains"
                      desc="Separate sites you own, like a store or a regional site. Consent is passed between them when visitors follow a link."
                      right={
                        <button type="button" onClick={openLink} disabled={saving || paused} className={btnSecondary}>
                          {Ic.plus()}Link domain
                        </button>
                      }
                    />
                    <div className="border-t border-[#E5E5E5] overflow-x-auto">
                      <div className="min-w-[560px]">
                        <div className={`${ROW} py-[9px] bg-[#F9F9FA] text-[12px] font-medium border-b border-[#E5E5E5] ${TEXT2}`}>
                          <span />
                          <span>Domain</span>
                          <span>ConsentBit script</span>
                          <span>Last sync</span>
                          <span />
                        </div>
                        {selOthers.map((c, i) => {
                          const installed = isVerified(c.id);
                          return (
                            <div key={c.id} className={`${ROW} py-3 ${i < selOthers.length - 1 ? 'border-b border-[#E5E5E5]' : ''}`}>
                              <span className="text-[#007AFF] grid place-items-center">{Ic.link(16)}</span>
                              <div className="text-[14px] font-medium truncate">
                                {c.host}
                                <span className={`block text-[12px] font-normal mt-[1px] truncate ${TEXT2}`}>
                                  {!c.linked ? 'Links after you save' : installed ? 'Linked' : 'Install the script to finish linking'}
                                </span>
                              </div>
                              {installed ? <Pill tone="green">Script installed</Pill> : <Pill tone="amber">Pending install</Pill>}
                              <span className={`text-[12px] ${TEXT2}`}>{syncText(c, true)}</span>
                              <button
                                type="button"
                                onClick={() => toggle(c.id)}
                                disabled={saving || paused}
                                aria-label={`Unlink ${c.host}`}
                                title={`Unlink ${c.host}`}
                                className="w-[32px] h-[32px] rounded-[6px] border-0 bg-transparent text-[#4B5563] grid place-items-center cursor-pointer hover:bg-[#F3F4F6] hover:text-[#AC2734] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              >
                                {Ic.trash()}
                              </button>
                            </div>
                          );
                        })}
                        {selOthers.length === 0 && (
                          <div className={`px-5 py-4 text-[13px] ${TEXT2}`}>
                            No other domains linked yet. Use <b className="font-semibold text-[#111827]">Link domain</b> to add a site you own
                            on a different domain.
                          </div>
                        )}
                      </div>
                    </div>
                    {selOthers
                      .filter((c) => !isVerified(c.id) && siteInfo.get(c.id)?.snippet)
                      .map((c) => {
                        const code = siteInfo.get(c.id)!.snippet;
                        return (
                          <div key={c.id} className="px-5 pt-[14px] pb-4 border-t border-[#E5E5E5]">
                            <span className="text-[14px] font-medium block">Install on {c.host}</span>
                            <p className={`text-[12px] mt-[5px] mb-2 leading-[17px] ${TEXT2}`}>
                              Paste this before the closing &lt;/head&gt; tag. Linking finishes automatically once we detect it.
                            </p>
                            <div className="flex gap-2 items-center">
                              <div className="flex-1 min-w-0 font-mono text-[12px] bg-[#F9F9FA] shadow-[inset_0_0_0_1px_#E5E5E5] rounded-[8px] px-3 py-[10px] text-[#111827] break-all tracking-normal">
                                {code}
                              </div>
                              <button type="button" onClick={() => copy(c.id, code)} className={`${btnSecondary} ${btnSmall}`}>
                                {copied === c.id ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </section>

                  {/* 3. Direction */}
                  <section className={card}>
                    <SectionHead n={3} title="Consent direction" desc="What happens when a visitor changes their choices on a linked domain." />
                    <div role="radiogroup" aria-label="Consent direction" className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[10px] px-5 pb-[18px]">
                      {([
                        { id: 'one_way' as Direction, title: 'One-way from primary', rec: true, desc: `Choices made on ${host} apply everywhere. Changes on a linked domain stay on that domain.` },
                        { id: 'two_way' as Direction, title: 'Two-way', rec: false, desc: `A change on any linked domain updates consent on every domain, ${host} included.` },
                      ]).map((o) => {
                        const on = direction === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            disabled={saving || paused}
                            onClick={() => setDirection(o.id)}
                            className="flex gap-[10px] items-start p-[14px] rounded-[8px] border-0 text-left cursor-pointer disabled:opacity-60"
                            style={on ? { background: 'rgba(103,144,234,0.1)', boxShadow: `inset 0 0 0 1px ${BLUE}` } : { background: '#fff', boxShadow: 'inset 0 0 0 1px #E5E5E5' }}
                          >
                            <span
                              aria-hidden="true"
                              className="w-[16px] h-[16px] mt-[2px] rounded-full shrink-0 grid place-items-center box-border"
                              style={{ border: `1.5px solid ${on ? BLUE : '#4B5563'}` }}
                            >
                              {on && <span className="w-[8px] h-[8px] rounded-full" style={{ background: BLUE }} />}
                            </span>
                            <span>
                              <span className="flex items-center gap-2 text-[14px] font-semibold leading-[20px]" style={{ color: on ? BLUE : '#111827' }}>
                                {o.title}
                                {o.rec && (
                                  <span className="text-[11px] font-medium text-[#118A41] bg-[rgba(46,192,79,0.1)] rounded-[4px] px-[6px] py-[1px]">Recommended</span>
                                )}
                              </span>
                              <span className={`block text-[13px] leading-[18px] mt-[3px] ${TEXT2}`}>{o.desc}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {twoWay && twoWayBlockers.length > 0 && (
                      <div role="alert" className="flex gap-[10px] items-start text-[13px] leading-[18px] rounded-[8px] px-3 py-[10px] mx-5 mb-[18px] -mt-[6px] bg-[#FFF6E6]">
                        <span className="text-[#965200] flex">{Ic.warn()}</span>
                        <span>
                          Two-way sharing needs every linked domain on the Growth plan. Not on Growth:{' '}
                          <b className="font-semibold">{twoWayBlockers.map((c) => `${c.host} (${c.plan || 'lower plan'})`).join(', ')}</b>. Upgrade them,
                          remove them, or use one-way.
                        </span>
                      </div>
                    )}
                    {/* A linked domain left Growth: the server switched the link to one-way. */}
                    {!twoWay && savedDirection === 'one_way' && candidates.some((c) => c.linked && c.planOk === false) && (
                      <div role="status" className="flex gap-[10px] items-start text-[13px] leading-[18px] rounded-[8px] px-3 py-[10px] mx-5 mb-[18px] -mt-[6px] bg-[#FFF6E6]">
                        <span className="text-[#965200] flex">{Ic.warn()}</span>
                        <span>
                          Consent is shared one-way. Two-way is not available while a linked domain is off the Growth plan:{' '}
                          <b className="font-semibold">
                            {candidates.filter((c) => c.linked && c.planOk === false).map((c) => `${c.host} (${c.plan || 'lower plan'})`).join(', ')}
                          </b>. Upgrade it to use two-way again.
                        </span>
                      </div>
                    )}
                  </section>

                  {/* 4. Tell visitors */}
                  <section className={card}>
                    <SectionHead n={4} title="Tell visitors which sites are covered" desc="Privacy laws like the GDPR expect visitors to know where their consent applies." />
                    <div className="flex gap-4 items-center px-5 py-4 border-t border-[#E5E5E5]">
                      <div className="flex-1 min-w-0">
                        <span className="text-[14px] font-medium block">List linked domains in the banner</span>
                        <span className={`block text-[13px] mt-[3px] leading-[18px] ${TEXT2}`}>
                          Adds &ldquo;Your choice also applies to &hellip;&rdquo; with each linked domain under the banner text.
                        </span>
                      </div>
                      <Switch on={showList} disabled={saving || paused} onChange={() => setShowList((v) => !v)} label="List linked domains in the banner" />
                    </div>
                    <div className="px-5 pt-4 pb-[18px] border-t border-[#E5E5E5]">
                      <label htmlFor="cd-list" className="text-[14px] font-medium block">
                        Link to your list of sites <span className={`font-normal ${TEXT2}`}>(optional)</span>
                      </label>
                      <input
                        id="cd-list"
                        disabled={paused}
                        placeholder={`https://${root}/cookie-policy`}
                        value={listUrl}
                        onChange={(e) => setListUrl(e.target.value)}
                        className="w-full h-[40px] border-0 rounded-[8px] px-3 text-[14px] text-[#111827] outline-none bg-white mt-2 box-border disabled:bg-[#F9F9FA] disabled:text-[#9CA3AF] disabled:cursor-not-allowed"
                        style={{ boxShadow: `inset 0 0 0 1px ${listBad ? '#AC2734' : '#D9D9D9'}` }}
                      />
                      {listBad ? (
                        <div className="text-[12px] text-[#AC2734] mt-[5px]">Enter a full link starting with https://</div>
                      ) : (
                        <div className={`text-[12px] mt-[5px] leading-[17px] ${TEXT2}`}>
                          A page, such as your cookie or privacy policy, that names every domain covered. Shown in the banner as a
                          &ldquo;See all sites&rdquo; link after the domain list.
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right: how consent is shared */}
                <aside aria-label="How consent is shared" className={`${card} flex-[1_1_320px] max-w-full min-w-0`}>
                  <div className="px-5 pt-[18px] pb-5 flex flex-col gap-[14px]">
                    <div className={`text-[12px] font-semibold uppercase tracking-[.04em] ${TEXT2}`}>How consent is shared</div>
                    {!shareOn ? (
                      <p className={`m-0 text-[14px] leading-[20px] ${TEXT2}`}>Sharing is off. Each domain asks visitors for consent on its own.</p>
                    ) : (
                      <div className="flex flex-col gap-[14px]">
                        <div className="flex flex-col">
                          <div className="rounded-[8px] px-3 py-[10px] flex items-center gap-[10px] text-[13px] font-medium bg-[#007AFF] text-white">
                            <span className="w-[28px] h-[28px] rounded-[6px] grid place-items-center bg-[rgba(255,255,255,0.18)]">{Ic.globe(16)}</span>
                            <span className="min-w-0">
                              <span className="block truncate">{host}</span>
                              <span className="block text-[11px] font-normal text-[rgba(255,255,255,0.9)]">Primary domain</span>
                            </span>
                          </div>
                          {selSubs.length + selOthers.length > 0 ? (
                            <div className="ml-5 pl-[22px] border-l-[1.5px] border-[#9FBCE4] flex flex-col gap-2 pt-3">
                              {selSubs.length > 0 && <div className={`text-[11px] font-semibold mt-[6px] -mb-[2px] ${TEXT2}`}>Subdomains</div>}
                              {selSubs.map((c) => (
                                <TreeNode key={c.id} host={c.host} sub={treeSub(c, 'Starts once script is found')} active={c.linked && isVerified(c.id)} twoWay={twoWay} />
                              ))}
                              {selOthers.length > 0 && <div className={`text-[11px] font-semibold mt-[6px] -mb-[2px] ${TEXT2}`}>Other domains</div>}
                              {selOthers.map((c) => (
                                <TreeNode key={c.id} host={c.host} sub={treeSub(c, 'Starts once script is installed')} active={c.linked && isVerified(c.id)} twoWay={twoWay} />
                              ))}
                            </div>
                          ) : (
                            <p className={`m-0 mt-3 text-[13px] ${TEXT2}`}>No domains linked yet.</p>
                          )}
                        </div>
                        <div className={`flex gap-[14px] text-[12px] flex-wrap ${TEXT2}`}>
                          <span className="flex items-center gap-[6px]">
                            <span className="w-[14px] h-[10px] rounded-[3px] shadow-[inset_0_0_0_1px_#007AFF] bg-white" aria-hidden="true" />
                            Active
                          </span>
                          <span className="flex items-center gap-[6px]">
                            <span
                              className="w-[14px] h-[10px] rounded-[3px] shadow-[inset_0_0_0_1px_#D9D9D9]"
                              style={{ background: 'repeating-linear-gradient(135deg, #fff 0 3px, #E5E5E5 3px 6px)' }}
                              aria-hidden="true"
                            />
                            Pending
                          </span>
                        </div>
                        <div className="border-t border-[#E5E5E5] pt-[14px] flex flex-col gap-[10px]">
                          <div className={`text-[12px] font-semibold uppercase tracking-[.04em] ${TEXT2}`}>What a visitor sees</div>
                          <ol className="list-none p-0 m-0 flex flex-col gap-[10px] text-[13px] leading-[18px]">
                            {[
                              <span key="1">Accepts analytics on <b>{host}</b>.</span>,
                              <span key="2">Opens <b>{firstLinked}</b>: no banner, analytics already allowed.</span>,
                              twoWay ? (
                                <span key="3">Turns analytics off there. The change applies on <b>every linked domain</b>, {host} included.</span>
                              ) : (
                                <span key="3">Turns analytics off there. The change applies <b>only on that domain</b>; {host} keeps the original choice.</span>
                              ),
                            ].map((t, i) => (
                              <li key={i} className="flex gap-[10px]">
                                <span className="w-[20px] h-[20px] rounded-full bg-[#F1F5F9] text-[11px] font-semibold grid place-items-center shrink-0">{i + 1}</span>
                                {t}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`px-5 py-[14px] text-[13px] leading-[18px] bg-[#F9F9FA] border-t border-[#E5E5E5] rounded-b-[10px] ${TEXT2}`}>
                    Every domain must run the ConsentBit script and use the same cookie categories.{' '}
                    <a href={SETUP_GUIDE_URL} target="_blank" rel="noopener noreferrer" className="text-[#007AFF]">
                      Read the setup guide
                    </a>
                  </div>
                </aside>
              </div>
            </>
          )}
        </main>

        {/* Unsaved-changes bar */}
        {((canEdit && dirty) || (!!error && !!state) || !inline) && (
          <div
            role="region"
            aria-label="Unsaved changes"
            className={`${inline ? 'fixed left-0 right-0 bottom-0 z-20' : 'rounded-b-[12px]'} bg-white border-t border-[#E5E5E5] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]`}
          >
            <div className="max-w-[1228px] mx-auto px-4 sm:px-10 py-[14px] flex items-center gap-3 box-border flex-wrap">
              <span className="flex-1 text-[14px] flex items-center gap-2">
                {error && state ? (
                  <span className="text-[#AC2734]">{error}</span>
                ) : canEdit && dirty ? (
                  <>
                    <span className="w-[8px] h-[8px] rounded-full bg-[#E6961E]" aria-hidden="true" />
                    You have unsaved changes
                  </>
                ) : null}
              </span>
              {canEdit && dirty ? (
                <>
                  <button type="button" onClick={discard} disabled={saving} className={btnSecondary}>Discard</button>
                  <button type="button" onClick={onSave} disabled={saving || listBad || (twoWay && twoWayBlockers.length > 0)}className={btnPrimary}>{saving ? 'Saving…' : 'Save changes'}</button>
                </>
              ) : inline ? null : (
                <button type="button" onClick={onClose} disabled={saving} className={btnSecondary}>Close</button>
              )}
            </div>
          </div>
        )}

        {toast && (
          <div role="status" className="fixed bottom-[88px] left-1/2 -translate-x-1/2 bg-[#111827] text-white text-[14px] px-4 py-[10px] rounded-[8px] flex gap-2 items-center shadow-[0_4px_24px_rgba(0,0,0,0.15)] z-40">
            {Ic.check(16)}
            {toast}
          </div>
        )}

        {/* Link another domain */}
        {linkOpen && (
          <div
            className={`${inline ? 'fixed z-50' : 'absolute rounded-[12px]'} inset-0 bg-[rgba(17,24,39,0.4)] grid place-items-center p-5`}
            onMouseDown={(e) => e.target === e.currentTarget && setLinkOpen(false)}
          >
            <div role="dialog" aria-modal="true" aria-labelledby="ld-t" className="w-[520px] max-w-full bg-white rounded-[12px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col max-h-[85vh]">
              <div className="px-[22px] pt-5">
                <h2 id="ld-t" className="m-0 text-[18px] font-semibold text-black">Link another domain</h2>
                <p className={`m-0 mt-1 text-[14px] leading-[20px] ${TEXT2}`}>Visitors who consent on {host} won&apos;t be asked again on this domain.</p>
              </div>
              <div className="px-[22px] pt-4 pb-5 flex flex-col gap-4 overflow-y-auto">
                {linkable.length > 0 && (
                  <>
                    <div>
                      <span className="text-[14px] font-medium block mb-2">From your ConsentBit account</span>
                      <div role="radiogroup" aria-label="Domains in your account" className="flex flex-col gap-2">
                        {linkable.map((c) => {
                          const note = blockNote(c);
                          const on = pick === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              disabled={!!note}
                              onClick={() => {
                                setPick(on ? null : c.id);
                                setNewDomain('');
                                setNdErr('');
                              }}
                              className="flex items-center gap-3 px-[14px] py-3 rounded-[8px] border-0 text-left w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                              style={on ? { background: 'rgba(103,144,234,0.1)', boxShadow: `inset 0 0 0 1px ${BLUE}` } : { background: '#fff', boxShadow: 'inset 0 0 0 1px #E5E5E5' }}
                            >
                              <span
                                className="w-[16px] h-[16px] rounded-full grid place-items-center shrink-0 box-border"
                                style={{ border: `1.5px solid ${on ? BLUE : '#4B5563'}` }}
                                aria-hidden="true"
                              >
                                {on && <span className="w-[8px] h-[8px] rounded-full bg-[#007AFF]" />}
                              </span>
                              <span className="flex-1 text-[14px] font-medium">
                                {c.host}
                                <span className={`block text-[12px] font-normal mt-[1px] ${TEXT2}`}>
                                  {note || `${isVerified(c.id) ? 'Script installed' : 'Script not installed yet'} · ${c.plan ? c.plan[0].toUpperCase() + c.plan.slice(1) : 'Free'} plan`}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className={`flex items-center gap-[10px] text-[12px] ${TEXT2}`}>
                      <span className="flex-1 border-t border-[#E5E5E5]" />
                      or
                      <span className="flex-1 border-t border-[#E5E5E5]" />
                    </div>
                  </>
                )}
                <div>
                  <label htmlFor="ld-nd" className="text-[14px] font-medium block">Add a new domain</label>
                  <input
                    id="ld-nd"
                    placeholder="example.com"
                    value={newDomain}
                    onChange={(e) => {
                      setNewDomain(e.target.value);
                      setPick(null);
                      setNdErr('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newDomain.trim()) {
                        e.preventDefault();
                        doLink();
                      }
                    }}
                    className="w-full h-[40px] border-0 rounded-[8px] px-3 text-[14px] text-[#111827] outline-none bg-white mt-2 box-border disabled:bg-[#F9F9FA] disabled:text-[#9CA3AF] disabled:cursor-not-allowed"
                    style={{ boxShadow: `inset 0 0 0 1px ${ndErr ? '#AC2734' : '#D9D9D9'}` }}
                  />
                  {ndErr ? (
                    <div className="text-[12px] text-[#AC2734] mt-[5px]">{ndErr}</div>
                  ) : (
                    <div className={`text-[12px] mt-[5px] leading-[17px] ${TEXT2}`}>
                      We&apos;ll add it as a site so you get its script to install. Linking finishes once we find it.
                    </div>
                  )}
                </div>
              </div>
              <div className="px-[22px] py-[14px] border-t border-[#E5E5E5] flex justify-end gap-2 bg-[#F9F9FA] rounded-b-[12px]">
                <button type="button" onClick={() => setLinkOpen(false)} className={btnSecondary}>Cancel</button>
                <button type="button" onClick={doLink} disabled={!pick && !newDomain.trim()} className={btnPrimary}>Link domain</button>
              </div>
            </div>
          </div>
        )}

        {/* Unlink confirm */}
        {confirmUnlink && (
          <div className={`${inline ? 'fixed z-50' : 'absolute rounded-[12px]'} inset-0 bg-[rgba(17,24,39,0.4)] grid place-items-center p-5`}>
            <div role="alertdialog" aria-modal="true" aria-labelledby="ul-t" aria-describedby="ul-d" className="w-[460px] max-w-full bg-white rounded-[12px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col">
              <div className="px-[22px] pt-5">
                <h2 id="ul-t" className="m-0 text-[18px] font-semibold text-black">
                  {removed.length === 1 ? `Unlink ${removed[0].host}?` : `Unlink ${removed.length} domains?`}
                </h2>
              </div>
              <div className="px-[22px] pt-4 pb-5">
                <p id="ul-d" className={`m-0 text-[14px] leading-[20px] ${TEXT2}`}>
                  Visitors on {removed.length === 1 ? removed[0].host : removed.map((c) => c.host).join(', ')} will see the banner again and
                  choose separately. Consent already given there stays in your consent log.
                </p>
              </div>
              <div className="px-[22px] py-[14px] border-t border-[#E5E5E5] flex justify-end gap-2 bg-[#F9F9FA] rounded-b-[12px]">
                <button type="button" onClick={() => setConfirmUnlink(false)} disabled={saving} className={btnSecondary}>Cancel</button>
                <button type="button" onClick={save} disabled={saving} className={btnDanger} autoFocus>
                  {saving ? 'Unlinking…' : 'Unlink'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
