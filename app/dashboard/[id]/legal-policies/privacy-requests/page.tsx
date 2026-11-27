'use client';

// Privacy Requests tab: requests visitors sent through the public form
// (/privacy-request/<domain> on the consentbit-privacy-requests worker), with the legal
// deadline for each. Owner and team Admins can act; Members see them read-only.
//
// Layout follows the Claude Design "Privacy Requests" page: a list view (request-page link,
// count tiles, filterable table) and a full-width detail view (deadline banner, respond card,
// consent records, visitor card, activity timeline). The open request is kept in ?req=<id>
// so the browser back button returns to the list. The "Your request page" card also carries
// the design's Customize block: site logo + brand colour for the public form (saved through
// POST /api/privacy-requests/branding, rendered by the worker's dark portal shell).

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import s from './privacy-requests.module.css';
import { deleteVisitorConsent } from '@/lib/client-api';

/** Slug of the Legal hub this page sits under in the breadcrumb; null when the webapp has no hub. */
const LEGAL_HUB_SLUG: string | null = 'legal-policies';

type PrivacyRequest = {
  id: string;
  ref: string;
  type: 'know' | 'access' | 'disclosure' | 'correct' | 'restrict' | 'delete' | 'portability' | 'optout';
  region: string;
  law: string;
  name: string | null;
  email: string;
  message: string | null;
  consentId: string | null;
  /** 1 when the requester said they are acting for someone else (older worker builds omit it). */
  onBehalf?: number | boolean | null;
  /** DSR form v2 (older rows / worker builds omit these). */
  country?: string | null;
  relationship?: string | null;
  subjectRelation?: string | null;
  status: 'new' | 'in_progress' | 'completed' | 'rejected';
  createdAt: string;
  verifiedAt: string | null;
  dueAt: string;
  extendedAt: string | null;
  completedAt: string | null;
  reply: string | null;
  ownerNote: string | null;
};

/** Logo (data URL) + accent colour shown on the public request pages; worker defaults when unset. */
type Branding = { logo: string | null; color: string; updatedAt?: string | null };

type ListResponse = {
  success: boolean;
  error?: string;
  enabled?: boolean;
  canEdit?: boolean;
  publicUrl?: string | null;
  /** Older worker builds omit it; the page then shows the defaults. */
  branding?: Branding;
  requests?: PrivacyRequest[];
  /** Site plan id (e.g. "growth"); null without an active subscription. */
  plan?: string | null;
};

type RequestEvent = { at: string; action: string; detail: string | null };

// The visitor's cookie consent records, matched by their Consent ID (read-only on the worker).
type ConsentRecord = {
  id: string;
  consentId: string | null;
  createdAt: string;
  expiresAt: string | null;
  status: string | null;
  consentMethod: string | null;
  regulation: string | null;
  bannerType: string | null;
  country: string | null;
  region: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  domain: string | null;
  categories: Record<string, boolean> | null;
  doNotSell: boolean | null;
};

type ViewStatus = 'new' | 'prog' | 'late' | 'done' | 'rej' | 'ext';
type Filter = 'all' | 'open' | 'soon' | 'late' | 'closed';
type ActionId = 'complete' | 'extend' | 'reject';

const DAY = 86400000;

const TYPE_LABEL: Record<PrivacyRequest['type'], string> = {
  know: 'Right to Know',
  access: 'Right to Access',
  disclosure: 'Right to Disclosure',
  correct: 'Right to Correct',
  restrict: 'Right to Restrict',
  delete: 'Right to Delete',
  portability: 'Right to Portability',
  optout: 'Right to Opt-Out',
};

const RELATIONSHIP_LABEL: Record<string, string> = {
  visitor: 'Website Visitor',
  customer: 'Customer',
  supplier: 'Supplier',
  partner: 'Business Partner',
  other: 'Other',
};

/** Visitors outside every listed region are stored with law 'Other'; say what that means. */
function lawName(law?: string | null): string {
  return !law || law === 'Other' ? 'No specific privacy law' : law;
}

/** Country codes from the public form; 'US-CA' / 'CA-QC' are the California / Quebec splits. */
function countryName(code?: string | null): string {
  if (!code) return '—';
  if (code === 'US-CA') return 'United States — California';
  if (code === 'CA-QC') return 'Canada — Quebec';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
}

const STATUS_TEXT: Record<ViewStatus, string> = {
  new: 'New',
  prog: 'In Progress',
  late: 'Overdue',
  done: 'Completed',
  rej: 'Rejected',
  ext: 'Extended',
};

const EVENT_LABEL: Record<string, string> = {
  submitted: 'Request sent',
  verified: 'Visitor confirmed their email',
  started: 'Marked in progress',
  extended: 'Deadline extended',
  completed: 'Completed and visitor emailed',
  rejected: 'Rejected and visitor emailed',
  note: 'Internal note saved',
  reminder: 'Deadline reminder sent',
  overdue_alert: 'Overdue alert sent',
};

const CATEGORY_LABEL: Record<string, string> = {
  essential: 'Necessary',
  necessary: 'Necessary',
  analytics: 'Analytics',
  preferences: 'Preferences',
  functional: 'Functional',
  marketing: 'Marketing',
};

const FILTER_TITLE: Record<Filter, string> = {
  all: 'All requests',
  open: 'Open requests',
  soon: 'Due within 7 days',
  late: 'Overdue requests',
  closed: 'Closed requests',
};

const ACTIONS: { id: ActionId; label: string; desc: string; btn: string; required: boolean; placeholder: string }[] = [
  {
    id: 'complete',
    label: 'Complete',
    desc: "You've done what they asked.",
    btn: 'Complete & Email Visitor',
    required: false,
    placeholder: 'For example: we have deleted your account and all records we hold about you.',
  },
  {
    id: 'extend',
    label: 'Extend Deadline',
    desc: 'Allowed once, where the law allows it.',
    btn: 'Extend & Email Visitor',
    required: true,
    placeholder: 'Explain why you need more time. The visitor will see this message.',
  },
  {
    id: 'reject',
    label: 'Reject',
    desc: "You can't or won't fulfil it.",
    btn: 'Reject & Email Visitor',
    required: true,
    placeholder: 'Explain why the request is being rejected. The visitor will see this message.',
  },
];

// ---------- helpers ----------

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

const fmtShort = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const isClosed = (r: PrivacyRequest) => r.status === 'completed' || r.status === 'rejected';

const daysLeft = (r: PrivacyRequest) => Math.ceil((Date.parse(r.dueAt) - Date.now()) / DAY);

/** Whole response window in days (received → current deadline), for the progress bars. */
const totalDays = (r: PrivacyRequest) => Math.max(1, Math.ceil((Date.parse(r.dueAt) - Date.parse(r.createdAt)) / DAY));

const progressPct = (r: PrivacyRequest) =>
  isClosed(r) ? 100 : Math.max(4, Math.min(100, 100 - (daysLeft(r) / totalDays(r)) * 100));

function viewStatus(r: PrivacyRequest): ViewStatus {
  if (r.status === 'completed') return 'done';
  if (r.status === 'rejected') return 'rej';
  if (daysLeft(r) < 0) return 'late';
  if (r.extendedAt) return 'ext';
  if (r.status === 'in_progress') return 'prog';
  return 'new';
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function deadlineText(r: PrivacyRequest) {
  if (isClosed(r)) return `Closed ${fmtDate(r.completedAt)}`;
  const d = daysLeft(r);
  if (d < 0) return `${plural(-d, 'day')} overdue`;
  if (d === 0) return 'Due today';
  return `${plural(d, 'day')} left`;
}

// Mirrors the worker's rules.js: the one extension each law allows. null = not allowed.
function extensionDate(region: string, type: PrivacyRequest['type'], dueAt: string): Date | null {
  const d = new Date(dueAt);
  const addMonths = (n: number) => {
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + n);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
  };
  const addDays = (n: number) => d.setUTCDate(d.getUTCDate() + n);
  switch (region) {
    case 'eu':
    case 'uk':
      addMonths(2);
      return d;
    case 'california':
      if (type === 'optout') return null;
      addDays(45);
      return d;
    case 'us_state':
      addDays(45);
      return d;
    case 'canada':
      addDays(30);
      return d;
    default:
      return null;
  }
}

function extensionNote(law: string) {
  if (/GDPR/i.test(law)) return 'GDPR allows +2 months.';
  if (/CCPA|US state/i.test(law)) return 'US state laws allow +45 days.';
  if (/PIPEDA/i.test(law)) return 'PIPEDA allows +30 days.';
  return 'GDPR +2 months, US state laws +45 days, PIPEDA +30 days.';
}

function choiceOf(c: ConsentRecord): { text: string; tone: string } {
  if (c.doNotSell !== null) {
    return c.doNotSell ? { text: 'Opted out of sale/sharing', tone: s.pillB } : { text: 'Allowed sale/sharing', tone: s.pillG };
  }
  const optional = Object.entries(c.categories || {}).filter(([k]) => k !== 'essential' && k !== 'necessary');
  if (optional.length) {
    const on = optional.filter(([, v]) => v).length;
    if (on === optional.length) return { text: 'Accepted all', tone: s.pillG };
    if (on === 0) return { text: 'Rejected all', tone: s.pillB };
    return { text: 'Accepted some', tone: s.pillA };
  }
  if (c.status === 'given') return { text: 'Accepted', tone: s.pillG };
  if (c.status === 'rejected') return { text: 'Rejected', tone: s.pillB };
  return { text: c.status || 'Recorded', tone: s.pillB };
}

async function postUpdate(body: Record<string, string | boolean>) {
  const res = await fetch('/api/privacy-requests/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({ success: false, error: 'Something went wrong.' }))) as {
    success?: boolean;
    error?: string;
  };
  if (!res.ok || !data.success) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// ---------- icons ----------

const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8.5l3.2 3.2L13 5" />
  </svg>
);

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="10" cy="10.5" r="6.5" />
    <path d="M10 7v3.5l2.2 1.5M8 2.5h4" />
  </svg>
);

const CrossIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

const ExternalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 9.5l5-5M5 4.5h4.5V9" />
  </svg>
);

// ---------- small components ----------

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={s.rdCopy}
      title="Copy"
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
    >
      {ok ? 'Copied' : label}
    </button>
  );
}

function StatusPill({ r }: { r: PrivacyRequest }) {
  const v = viewStatus(r);
  const cls: Record<ViewStatus, string> = { new: s.stNew, prog: s.stProg, late: s.stLate, done: s.stDone, rej: s.stRej, ext: s.stExt };
  return <span className={`${s.st} ${cls[v]}`}>{STATUS_TEXT[v]}</span>;
}

function Crumb({ siteId, items }: { siteId: string; items: ReactNode[] }) {
  return (
    <div className={s.crumb}>
      {LEGAL_HUB_SLUG && (
        <>
          <Link href={`/dashboard/${siteId}/${LEGAL_HUB_SLUG}`}>Legal</Link>
          <span>/</span>
        </>
      )}
      {items.map((it, i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i > 0 && <span>/</span>}
          {it}
        </span>
      ))}
    </div>
  );
}

// ---------- consent records card ----------

function ConsentRecordsCard({ siteId, req, records }: { siteId: string; req: PrivacyRequest; records: ConsentRecord[] | null | undefined }) {
  const logsLink = <Link href={`/dashboard/${siteId}/consent-logs`}>Consent Logs</Link>;

  let body: ReactNode;
  if (!req.consentId) {
    body = (
      <div className={s.empty}>
        The visitor didn&apos;t add a Consent ID, so their cookie consent records can&apos;t be matched. You can ask them for it in your
        reply (it is in the <code>consentbit-consentid</code> cookie on your website).
      </div>
    );
  } else if (records === undefined) {
    body = <div className={s.empty}>Loading records…</div>;
  } else if (!records || records.length === 0) {
    body = (
      <div className={s.empty}>
        No consent records match this visitor. They may already be deleted, past their retention period, or the ID was copied wrongly.
      </div>
    );
  } else {
    body = records.map((c) => {
      const choice = choiceOf(c);
      return (
        <div key={c.id} className={s.rdRec}>
          <div className={s.rdRt}>
            <b>{fmtDateTime(c.createdAt)}</b>
            <span className={`${s.pill} ${choice.tone}`}>{choice.text}</span>
          </div>
          {c.categories && (
            <div className={s.rdCats}>
              {Object.entries(c.categories).map(([k, v]) => (
                <span key={k} className={v ? undefined : s.catOff}>
                  {CATEGORY_LABEL[k] || k}
                </span>
              ))}
            </div>
          )}
          <span className={s.sub}>
            {[
              c.regulation && c.regulation.toUpperCase(),
              c.consentMethod && `via ${c.consentMethod}`,
              [c.region, c.country].filter(Boolean).join(', '),
              c.ipAddress && `IP ${c.ipAddress}`,
              c.expiresAt && `valid until ${fmtDate(c.expiresAt)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
      );
    });
  }

  const showDeleteHelp = req.type === 'delete' && !!req.consentId && !!records && records.length > 0;

  return (
    <section className={s.card}>
      <div className={s.rh}>
        <span className={s.ct}>
          Cookie consent records
          {records && records.length ? <span className={s.cnt}>{records.length}</span> : null}
        </span>
      </div>
      <div className={s.rdRecs}>{body}</div>
      {showDeleteHelp && (
        <div className={s.recActions}>
          <CopyButton text={req.consentId || ''} label="Copy Consent ID" />
        </div>
      )}
      <div className={s.rdFoot}>
        {showDeleteHelp && <>To delete them, open {logsLink}, paste the Consent ID into Find visitor and delete. </>}
        IP addresses are shortened. ConsentBit only holds cookie consent records. Any other data you hold about them (forms, orders,
        emails, CRM) you need to handle yourself.
      </div>
    </section>
  );
}

// ---------- request detail ----------

function RequestDetail({
  siteId,
  req,
  canEdit,
  plan,
  onBack,
  onChanged,
  onToast,
}: {
  siteId: string;
  req: PrivacyRequest;
  canEdit: boolean;
  plan?: string | null;
  onBack: () => void;
  onChanged: () => Promise<void> | void;
  onToast: (text: string) => void;
}) {
  const [act, setAct] = useState<ActionId>('complete');
  const [msg, setMsg] = useState('');
  const [note, setNote] = useState(req.ownerNote || '');
  const [events, setEvents] = useState<RequestEvent[] | null>(null);
  const [consents, setConsents] = useState<ConsentRecord[] | null | undefined>(undefined);
  // Bumped after a note is added so the timeline re-fetches even when the text repeats.
  const [noteTick, setNoteTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [apiErr, setApiErr] = useState('');

  const closed = isClosed(req);
  const d = daysLeft(req);
  const late = d < 0 && !closed;
  const soon = !late && !closed && d <= 7;
  const vs = viewStatus(req);
  const action = ACTIONS.find((a) => a.id === act)!;
  const extDate = useMemo(() => extensionDate(req.region, req.type, req.dueAt), [req.region, req.type, req.dueAt]);
  // "Attach their consent records" on Complete: only when records matched the visitor's Consent ID.
  // On by default for requests that ask for a copy of their data.
  const canAttach = !!req.consentId && !!consents && consents.length > 0;
  const [attachRecords, setAttachRecords] = useState(true);
  useEffect(() => {
    setAttachRecords(req.type === 'access' || req.type === 'portability' || req.type === 'know');
  }, [req.id, req.type]);
  // Right to Delete: Complete can erase the matched records first, through the same
  // /api/consent-visitor delete Consent Logs uses (also clears archived/retained copies and
  // writes the erasure log). That delete is Growth-only (decision 2026-10-17); the worker
  // re-checks the plan.
  const isDelete = req.type === 'delete';
  const canDeleteRecords = String(plan || '').toLowerCase().includes('growth');
  const [deleteRecords, setDeleteRecords] = useState(true);
  useEffect(() => {
    setDeleteRecords(true);
  }, [req.id]);
  const extendDisabledReason = req.extendedAt ? 'Already extended once.' : !extDate ? `${lawName(req.law)} does not allow an extension.` : '';

  useEffect(() => {
    const params = new URLSearchParams({ siteId, id: req.id });
    fetch(`/api/privacy-requests/events?${params.toString()}`)
      .then((r) => r.json() as Promise<{ events?: RequestEvent[]; consents?: ConsentRecord[] | null }>)
      .then((data) => {
        setEvents(data?.events || []);
        setConsents(data?.consents ?? null);
      })
      .catch(() => {
        setEvents([]);
        setConsents(null);
      });
  }, [siteId, req.id, req.status, req.dueAt, req.ownerNote, noteTick]);

  // Notes are added, not edited: the box starts empty and each saved note becomes its own
  // timeline entry.
  useEffect(() => {
    setNote('');
  }, [req.id]);

  const run = async (name: string, body: Record<string, string | boolean>, toast: string) => {
    setBusy(name);
    setApiErr('');
    try {
      await postUpdate({ siteId, id: req.id, action: name, ...body });
      await onChanged();
      onToast(toast);
      return true;
    } catch (e: any) {
      setApiErr(e?.message || 'Something went wrong.');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    if (action.required && !msg.trim()) {
      setErr(`A message is required when you ${act === 'reject' ? 'reject' : 'extend'} a request.`);
      return;
    }
    setErr('');
    // Delete BEFORE completing: if the delete fails, the request stays open and the visitor
    // is not told it is done. A delete request sends no copy of the records.
    const erase = act === 'complete' && isDelete && canAttach && canDeleteRecords && deleteRecords;
    let erased = 0;
    if (erase) {
      setBusy(act);
      setApiErr('');
      try {
        // Same helper Consent Logs uses: worker replies come in an encoded envelope that
        // parseApiResponse unwraps — reading res.json() directly misses `success`.
        const { deleted, archivedDeleted } = await deleteVisitorConsent(siteId, req.consentId!);
        erased = deleted + archivedDeleted;
      } catch (e: any) {
        setBusy(null);
        setApiErr(`Could not delete their consent records, so the request was not completed: ${e?.message || 'unknown error'}`);
        return;
      }
    }
    const withRecords = act === 'complete' && !isDelete && canAttach && attachRecords;
    const ok = await run(
      act,
      { reply: msg.trim(), ...(withRecords ? { attachConsents: true } : {}), ...(erase ? { deletedConsents: String(erased) } : {}) },
      erase ? `Deleted ${erased} consent record${erased === 1 ? '' : 's'} and emailed the visitor` : withRecords ? 'Visitor emailed with their consent records' : 'Visitor emailed'
    );
    if (ok) {
      setMsg('');
      setAct('complete');
    }
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    const ok = await run('note', { note: note.trim() }, 'Note added');
    if (ok) {
      setNote('');
      setNoteTick((t) => t + 1);
    }
  };

  // Notes saved before note text was logged on the event have no detail; show the stored
  // ownerNote once for those so it doesn't disappear.
  const notesInTimeline = (events || []).some((e) => e.action === 'note' && e.detail);

  const banner = closed ? s.rdDlClosed : late ? s.rdDlLate : soon ? s.rdDlSoon : '';

  return (
    <main className={s.main}>
      <Crumb
        siteId={siteId}
        items={[
          <button key="list" type="button" onClick={onBack}>
            Privacy Requests
          </button>,
          <em key="ref" className={s.crumbCur}>
            {req.ref}
          </em>,
        ]}
      />

      <div className={s.rdHead}>
        <div>
          <h1 className={s.h1}>{TYPE_LABEL[req.type] || req.type}</h1>
          <p className={s.rdBy}>
            From {req.name || req.email} · {lawName(req.law)} · Received {fmtDate(req.createdAt)}
          </p>
        </div>
        <div className={s.rdHr}>
          <div className={s.rdRef}>
            {req.ref}
            <StatusPill r={req} />
          </div>
          {canEdit && req.status === 'new' && (
            <button
              type="button"
              className={`${s.btn} ${s.btnO}`}
              disabled={!!busy}
              onClick={() => run('start', {}, 'Marked in progress')}
            >
              {busy === 'start' ? 'Saving…' : 'Mark In Progress'}
            </button>
          )}
        </div>
      </div>

      <section className={`${s.rdDl} ${banner}`}>
        <span className={s.rdDli}>{closed ? vs === 'rej' ? <CrossIcon size={18} /> : <CheckIcon size={18} /> : <ClockIcon />}</span>
        <div className={s.rdDlm}>
          <b>{deadlineText(req)}</b>
          <span>
            {closed
              ? 'No further action needed.'
              : late
                ? 'The legal deadline has passed. Respond now, or extend if the law allows it.'
                : `Respond by ${fmtDate(req.dueAt)} to meet the legal deadline.`}
            {!closed && req.extendedAt ? ' The deadline was extended once.' : ''}
          </span>
        </div>
        {!closed && (
          <div className={s.rdTr}>
            <div className={s.rdBar}>
              <i style={{ width: `${progressPct(req)}%` }} />
            </div>
            <div className={s.rdTrl}>
              <span>
                Received<b>{fmtDate(req.createdAt)}</b>
              </span>
              <span>
                Due<b>{fmtDate(req.dueAt)}</b>
              </span>
            </div>
          </div>
        )}
      </section>

      <div className={s.rdGrid}>
        <div className={s.rdCol}>
          {!closed && canEdit && (
            <section className={`${s.card} ${s.cp} ${s.rdResp}`}>
              <div className={s.ct}>Respond to the visitor</div>
              <div className={s.rdActs} role="radiogroup" aria-label="Response">
                {ACTIONS.map((a) => {
                  const dis = a.id === 'extend' && !!extendDisabledReason;
                  const on = act === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-disabled={dis}
                      className={[s.rdAct, on ? s.rdActOn : '', dis ? s.rdActDis : '', a.id === 'reject' ? s.rdActNeg : ''].join(' ')}
                      onClick={() => {
                        if (dis) return;
                        setAct(a.id);
                        setErr('');
                      }}
                    >
                      <span className={s.rad} />
                      <div>
                        <b>{a.label}</b>
                        <span className={s.actDesc}>{dis ? extendDisabledReason : a.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {act === 'extend' && extDate && (
                <div className={s.rdInfo}>
                  Extending moves the deadline to <b>{fmtDate(extDate.toISOString())}</b>. {extensionNote(req.law)}
                </div>
              )}
              <label className={s.f}>
                <span className={s.lab}>
                  Message to the visitor
                  {action.required ? <span className={s.req}>*</span> : <span className={s.optL}> (optional)</span>}
                </span>
                <textarea
                  className={`${s.ta} ${err ? s.taBad : ''}`}
                  rows={4}
                  placeholder={action.placeholder}
                  value={msg}
                  onChange={(e) => {
                    setMsg(e.target.value.slice(0, 4000));
                    setErr('');
                  }}
                />
                {err && <span className={s.err}>{err}</span>}
              </label>
              {act === 'complete' && isDelete && canAttach && canDeleteRecords && (
                <label className={s.rdAttach}>
                  <input type="checkbox" checked={deleteRecords} onChange={(e) => setDeleteRecords(e.target.checked)} />
                  <span>
                    <b>Delete their consent records</b>
                    <span className={s.actDesc}>
                      Permanently deletes the {consents!.length} record{consents!.length === 1 ? '' : 's'} below (and any archived copies) before the visitor is
                      emailed. This can&apos;t be undone.
                    </span>
                  </span>
                </label>
              )}
              {act === 'complete' && isDelete && canAttach && !canDeleteRecords && (
                <div className={s.rdInfo}>
                  Completing does not delete their consent records. Delete them first in{' '}
                  <Link href={`/dashboard/${siteId}/consent-logs`}>Consent Logs</Link> (Find visitor → Delete), or upgrade to Growth to delete them here.
                </div>
              )}
              {act === 'complete' && !isDelete && canAttach && (
                <label className={s.rdAttach}>
                  <input type="checkbox" checked={attachRecords} onChange={(e) => setAttachRecords(e.target.checked)} />
                  <span>
                    <b>Attach their consent records</b>
                    <span className={s.actDesc}>
                      {consents!.length} record{consents!.length === 1 ? '' : 's'} as a PDF report and a spreadsheet file (.csv).
                    </span>
                  </span>
                </label>
              )}
              <div className={s.rdSend}>
                <span className={s.hint}>Sent to {req.email}</span>
                <button
                  type="button"
                  className={`${s.btn} ${act === 'reject' ? s.btnD : s.btnP}`}
                  disabled={!!busy}
                  onClick={send}
                >
                  {busy === act ? 'Sending…' : action.btn}
                </button>
              </div>
              {apiErr && <span className={s.err}>{apiErr}</span>}
            </section>
          )}

          {!closed && !canEdit && (
            <section className={`${s.card} ${s.cp}`}>
              <div className={s.ct}>Respond to the visitor</div>
              <p className={s.cd}>Only the account owner or a team Admin can handle requests.</p>
            </section>
          )}

          {closed && (
            <section className={`${s.card} ${s.cp}`}>
              <div className={s.rdClosed}>
                <span className={`${s.rdClosedIc} ${vs === 'rej' ? s.rdClosedIcRej : ''}`}>
                  {vs === 'rej' ? <CrossIcon size={18} /> : <CheckIcon size={18} />}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className={s.ct}>Request {STATUS_TEXT[vs].toLowerCase()}</div>
                  <p className={s.cd}>The visitor was emailed. This request is now closed.</p>
                  {req.reply && (
                    <>
                      <p className={s.hint} style={{ marginTop: 12 }}>
                        Your reply to the visitor
                      </p>
                      <p className={s.quote} style={{ marginTop: 6 }}>
                        {req.reply}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {apiErr && <span className={s.err}>{apiErr}</span>}
            </section>
          )}

          <ConsentRecordsCard siteId={siteId} req={req} records={consents} />
        </div>

        <aside className={s.rdCol}>
          <section className={`${s.card} ${s.cp}`}>
            <div className={s.ct}>Visitor</div>
            <dl className={s.rdKv}>
              <dt>Name</dt>
              <dd>{req.name || '—'}</dd>
              <dt>Email</dt>
              <dd className={s.cpRow}>
                <span>{req.email}</span>
                <CopyButton text={req.email} />
              </dd>
              {req.country && (
                <>
                  <dt>Country</dt>
                  <dd>{countryName(req.country)}</dd>
                </>
              )}
              <dt>Law</dt>
              <dd>{lawName(req.law)}</dd>
              <dt>Received</dt>
              <dd>{fmtDate(req.createdAt)}</dd>
              {req.relationship && (
                <>
                  <dt>Relationship</dt>
                  <dd>{RELATIONSHIP_LABEL[req.relationship] || req.relationship}</dd>
                </>
              )}
              <dt>Third party</dt>
              <dd>{req.onBehalf ? <span className={s.amber}>Yes — verify they are authorised</span> : 'No'}</dd>
              {req.subjectRelation && (
                <>
                  <dt>Relation to subject</dt>
                  <dd style={{ whiteSpace: 'pre-wrap' }}>{req.subjectRelation}</dd>
                </>
              )}
              <dt>Consent ID</dt>
              <dd className={s.cpRow}>
                {req.consentId ? (
                  <>
                    <span className={s.mono}>{req.consentId}</span>
                    <CopyButton text={req.consentId} />
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </dl>
            {req.message && (
              <>
                <p className={s.hint} style={{ marginTop: 14 }}>
                  Their message
                </p>
                <p className={s.quote} style={{ marginTop: 6 }}>
                  {req.message}
                </p>
              </>
            )}
          </section>

          <section className={`${s.card} ${s.cp}`}>
            <div className={s.ct}>Activity</div>
            {events === null ? (
              <p className={s.hint} style={{ marginTop: 10 }}>
                Loading…
              </p>
            ) : (
              <ol className={s.rdTl}>
                {events.map((e, i) =>
                  e.action === 'note' && e.detail ? (
                    <li key={i} className={s.tlNote}>
                      <i />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span className={s.sub}>{fmtShort(e.at)} · Internal note</span>
                        <p>{e.detail}</p>
                      </div>
                    </li>
                  ) : (
                    <li key={i}>
                      <i />
                      <div>
                        <span className={s.sub}>{fmtShort(e.at)}</span>
                        <p>
                          {EVENT_LABEL[e.action] || e.action}
                          {e.action === 'extended' && e.detail ? ` to ${fmtDate(e.detail)}` : ''}
                          {e.action === 'completed' && e.detail === 'consent records attached' ? ' (consent records attached)' : ''}
                          {e.action === 'completed' && e.detail?.startsWith('consent records deleted') ? ` (${e.detail})` : ''}
                        </p>
                      </div>
                    </li>
                  )
                )}
                {req.ownerNote && !notesInTimeline && (
                  <li className={s.tlNote}>
                    <i />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span className={s.sub}>Internal note</span>
                      <p>{req.ownerNote}</p>
                    </div>
                  </li>
                )}
              </ol>
            )}
            {canEdit && (
              <div className={s.rdNote}>
                <textarea
                  className={s.ta}
                  rows={2}
                  placeholder="Add an internal note (not sent to the visitor)"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 4000))}
                />
                <button
                  type="button"
                  className={`${s.btn} ${s.btnO}`}
                  disabled={!!busy || !note.trim()}
                  onClick={saveNote}
                >
                  {busy === 'note' ? 'Saving…' : 'Add Note'}
                </button>
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

// ---------- customize (logo + brand colour of the public page) ----------

const BRAND_DEFAULT_COLOR = '#007AFF';
const BRAND_DEFAULT: Branding = { logo: null, color: BRAND_DEFAULT_COLOR };
// First swatch = the portal's own blue; the rest are the design's presets.
const BRAND_SWATCHES = ['#007AFF', '#111827', '#0F7A4D', '#6D28D9', '#C2410C', '#BE123C'];
const MAX_LOGO_BYTES = 200 * 1024;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

/** Same rule as the worker's brandTextColor: light text on dark accents, dark text on light ones. */
function textOn(hex: string) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = (parseInt(h.slice(i, i + 2), 16) || 0) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#0a091f' : '#fff';
}

function Customize({
  siteId,
  branding,
  canEdit,
  onSaved,
  onToast,
}: {
  siteId: string;
  branding: Branding;
  canEdit: boolean;
  onSaved: (b: Branding) => void;
  onToast: (text: string) => void;
}) {
  const savedColor = (branding.color || BRAND_DEFAULT_COLOR).toUpperCase();
  const [open, setOpen] = useState(false);
  const [logo, setLogo] = useState<string | null>(branding.logo);
  const [color, setColor] = useState(savedColor);
  const [hex, setHex] = useState(savedColor.slice(1));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Follow a reload of the list (another admin may have saved meanwhile).
  useEffect(() => {
    setLogo(branding.logo);
    setColor(savedColor);
    setHex(savedColor.slice(1));
  }, [branding.logo, savedColor]);

  const dirty = logo !== branding.logo || color !== savedColor;

  const pickColor = (c: string) => {
    const up = c.toUpperCase();
    setColor(up);
    setHex(up.slice(1));
    setSaved(false);
    setErr('');
  };

  const pickLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!LOGO_TYPES.includes(f.type)) return setErr('Use a PNG, JPG or SVG file.');
    if (f.size > MAX_LOGO_BYTES) return setErr('The logo must be 200 KB or smaller.');
    if (f.type === 'image/svg+xml' && /<script|<foreignObject|javascript:|\son[a-z]+\s*=/i.test(await f.text())) {
      return setErr('The SVG contains scripts or event handlers. Export it again as a plain image.');
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(f);
    }).catch(() => '');
    if (!dataUrl) return setErr('Could not read that file.');
    setLogo(dataUrl);
    setSaved(false);
    setErr('');
  };

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/privacy-requests/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, logo, color }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string; branding?: Branding };
      if (!res.ok || !data.success || !data.branding) throw new Error(data.error || 'Could not save the changes.');
      onSaved(data.branding);
      setSaved(true);
      onToast('Request page updated');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Could not save the changes.');
    } finally {
      setBusy(false);
    }
  };

  const head = (
    <div className={s.czH}>
      <div>
        <div className={s.ct}>Customize</div>
        <div className={s.cd}>Add your site logo and brand colour to the privacy request form.</div>
      </div>
      <div className={s.czHr}>
        {!open && (
          <span className={s.czSum}>
            <i style={{ background: savedColor }} />
            {savedColor}
            <em>·</em>
            {branding.logo ? 'Logo added' : 'No logo'}
          </span>
        )}
        {canEdit && (
          <button type="button" className={`${s.btn} ${s.btnO}`} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? 'Hide' : 'Customize'}
          </button>
        )}
      </div>
    </div>
  );

  if (!open) return <div className={`${s.cz} ${s.czCollapsed}`}>{head}</div>;

  return (
    <div className={s.cz}>
      {head}
      <div className={s.czF}>
        <div>
          <div className={s.czL}>Logo</div>
          <div className={s.czRow}>
            {/* data: URLs — next/image has nothing to optimise here */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className={s.czLogo}>{logo ? <img src={logo} alt="Logo" /> : 'No logo'}</div>
            <button type="button" className={`${s.btn} ${s.btnO}`} onClick={() => fileRef.current?.click()}>
              {logo ? 'Replace' : 'Upload logo'}
            </button>
            {logo && (
              <button
                type="button"
                className={`${s.btn} ${s.btnO}`}
                onClick={() => {
                  setLogo(null);
                  setSaved(false);
                }}
              >
                Remove
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/jpeg" hidden onChange={pickLogo} />
          </div>
          <div className={s.hint} style={{ marginTop: 6 }}>
            PNG, SVG or JPG, up to 200 KB. Shown 28px tall on the dark request page, so a light or white version works best.
          </div>
        </div>
        <div>
          <div className={s.czL}>Colour theme</div>
          <div className={s.czSw}>
            {BRAND_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={color === c}
                className={color === c ? s.czOn : undefined}
                style={{ background: c }}
                onClick={() => pickColor(c)}
              />
            ))}
            <span className={s.czSep} />
            <div className={s.czHex}>
              <label className={s.czChip} style={{ background: color }} title="Pick a custom colour">
                <input type="color" value={color} aria-label="Custom colour" onChange={(e) => pickColor(e.target.value)} />
              </label>
              <span className={s.czHash}>#</span>
              <input
                type="text"
                aria-label="Hex colour"
                maxLength={6}
                value={hex}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9a-f]/gi, '').toUpperCase();
                  setHex(v);
                  if (v.length === 6) pickColor(`#${v}`);
                }}
                onBlur={() => setHex(color.slice(1))}
              />
            </div>
          </div>
        </div>
        <div className={s.czAct}>
          <button type="button" className={`${s.btn} ${s.btnP}`} disabled={busy || !dirty} onClick={save}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          {err ? <span className={s.err}>{err}</span> : saved && !dirty ? <span className={s.hint}>Saved. Your request page is updated.</span> : null}
        </div>
      </div>
      <div className={s.czPv}>
        <div className={s.czPl}>Preview</div>
        <div className={s.czFm}>
          <div className={s.czFh} style={{ borderTop: `3px solid ${color}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo} alt="" /> : 'ConsentBit logo'}
          </div>
          <div className={s.czFb}>
            <b>Data Subject Request (DSR) Portal</b>
            <i />
            <i />
            <span style={{ background: color, color: textOn(color) }}>Submit Request</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- page ----------

export default function PrivacyRequestsPage() {
  const params = useParams<{ id: string }>();
  const siteId = String(params?.id || '');
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');

  // `silent`: a background refresh. A failed one keeps the list already on screen instead of
  // replacing it with an error.
  const load = useCallback(
    async (silent = false) => {
      if (!siteId) return;
      try {
        const res = await fetch(`/api/privacy-requests?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
        const next = (await res.json()) as ListResponse;
        if (!silent || next?.success) setData(next);
      } catch {
        if (!silent) setData({ success: false, error: 'Could not load privacy requests.' });
      } finally {
        setLoading(false);
      }
    },
    [siteId]
  );

  useEffect(() => {
    load();
  }, [load]);

  // New requests appear without a manual reload: refresh every 30 s while the tab is visible,
  // and straight away when the owner comes back to the tab.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') load(true);
    };
    const id = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [load]);

  // Keep the open request in the URL so Back returns to the list.
  useEffect(() => {
    const read = () => setOpenId(new URLSearchParams(window.location.search).get('req'));
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  const openRequest = (id: string | null) => {
    setOpenId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('req', id);
    else url.searchParams.delete('req');
    window.history.pushState(null, '', url.toString());
    window.scrollTo(0, 0);
  };

  const flash = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(''), 2200);
  };

  const copyLink = async () => {
    if (!data?.publicUrl) return;
    try {
      await navigator.clipboard.writeText(data.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked; the link is visible to copy by hand */
    }
  };

  const requests = useMemo(() => data?.requests || [], [data]);
  const groups = useMemo(() => {
    const open = requests.filter((r) => !isClosed(r));
    return {
      all: requests,
      open,
      soon: open.filter((r) => daysLeft(r) >= 0 && daysLeft(r) <= 7),
      late: open.filter((r) => daysLeft(r) < 0),
      closed: requests.filter(isClosed),
    };
  }, [requests]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups[filter]
      .filter((r) => !q || [r.ref, r.name || '', r.email, TYPE_LABEL[r.type] || r.type].join(' ').toLowerCase().includes(q))
      .slice()
      .sort((a, b) => Number(isClosed(a)) - Number(isClosed(b)) || daysLeft(a) - daysLeft(b));
  }, [groups, filter, query]);

  const current = openId ? requests.find((r) => r.id === openId) : undefined;

  const toastEl = toast ? (
    <div className={s.toast} role="status">
      <CheckIcon size={16} />
      {toast}
    </div>
  ) : null;

  if (!loading && data?.success && data.enabled && current) {
    return (
      <>
        <RequestDetail
          key={current.id}
          siteId={siteId}
          req={current}
          canEdit={!!data.canEdit}
          plan={data.plan ?? null}
          onBack={() => openRequest(null)}
          onChanged={load}
          onToast={flash}
        />
        {toastEl}
      </>
    );
  }

  const tiles: { id: Filter; label: string; cls: string }[] = [
    { id: 'open', label: 'Open', cls: '' },
    { id: 'soon', label: 'Due within 7 days', cls: '' },
    { id: 'late', label: 'Overdue', cls: s.tileRed },
    { id: 'closed', label: 'Closed', cls: s.tileGray },
  ];

  return (
    <main className={s.main}>
      <Crumb
        siteId={siteId}
        items={[
          <em key="cur" className={s.crumbCur}>
            Privacy Requests
          </em>,
        ]}
      />
      <div>
        <h1 className={s.h1}>Privacy Requests</h1>
        <p className={s.lede}>
          Visitors use your request page to ask you to show, delete or correct their data, or to stop selling or sharing it. Each request
          has a legal deadline.
        </p>
      </div>

      {loading && <p className={s.notice}>Loading…</p>}

      {!loading && data && !data.success && <p className={s.errText}>{data.error || 'Could not load privacy requests.'}</p>}

      {!loading && data?.success && !data.enabled && (
        <section className={`${s.card} ${s.cp}`}>
          <div className={s.ct}>Available on Essential and Growth</div>
          <p className={s.cd}>
            Get a privacy request page for your visitors, deadline tracking and reminders. Every privacy law requires a way for visitors to
            make these requests.
          </p>
          <div style={{ marginTop: 14 }}>
            <Link href={`/dashboard/${siteId}/upgrade`} className={`${s.btn} ${s.btnP}`} style={{ textDecoration: 'none' }}>
              Upgrade
            </Link>
          </div>
        </section>
      )}

      {!loading && data?.success && data.enabled && (
        <>
          <section className={`${s.card} ${s.cp} ${s.rp}`}>
            <div>
              <div className={s.ct}>Your request page</div>
              <div className={s.cd}>Link to it from your privacy policy and website footer, for example as &quot;Your privacy rights&quot;.</div>
            </div>
            <div className={s.link}>
              <div className={s.url} title={data.publicUrl || ''}>
                {data.publicUrl || ''}
              </div>
              <button type="button" className={`${s.btn} ${s.btnP}`} onClick={copyLink}>
                {copied ? (
                  <>
                    <CheckIcon size={16} />
                    Copied
                  </>
                ) : (
                  'Copy link'
                )}
              </button>
              <a className={`${s.btn} ${s.btnO}`} href={data.publicUrl || '#'} target="_blank" rel="noopener noreferrer">
                Open
                <ExternalIcon />
              </a>
            </div>
            <Customize
              siteId={siteId}
              branding={data.branding || BRAND_DEFAULT}
              canEdit={!!data.canEdit}
              onSaved={(b) => setData((d) => (d ? { ...d, branding: b } : d))}
              onToast={flash}
            />
          </section>

          <div className={s.tiles}>
            {tiles.map((t) => (
              <button
                key={t.id}
                type="button"
                className={[s.tile, t.cls, filter === t.id ? s.tileOn : ''].join(' ')}
                onClick={() => setFilter(filter === t.id ? 'all' : t.id)}
                aria-pressed={filter === t.id}
              >
                <span>{t.label}</span>
                <b>{String(groups[t.id].length).padStart(2, '0')}</b>
              </button>
            ))}
          </div>

          <section className={s.card}>
            <div className={s.rh}>
              <span className={s.ct}>{FILTER_TITLE[filter]}</span>
              <div className={s.tools}>
                {filter !== 'all' && (
                  <button type="button" className={s.clear} onClick={() => setFilter('all')}>
                    Show all
                  </button>
                )}
                <input
                  className={s.search}
                  placeholder="Search name, email or reference"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search requests"
                />
              </div>
            </div>
            <div className={s.tableWrap}>
              <table className={s.tbl}>
                <thead>
                  <tr>
                    <th style={{ width: '16%' }}>Reference</th>
                    <th>Request</th>
                    <th style={{ width: '10%' }}>Law</th>
                    <th style={{ width: '12%' }}>Received</th>
                    <th style={{ width: '22%' }}>Deadline</th>
                    <th style={{ width: '12%' }}>Status</th>
                    <th style={{ width: '4%' }} aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const d = daysLeft(r);
                    const closed = isClosed(r);
                    return (
                      <tr key={r.id} onClick={() => openRequest(r.id)}>
                        <td className={s.ref}>{r.ref}</td>
                        <td>
                          {TYPE_LABEL[r.type] || r.type}
                          <span className={s.sub}>{r.name || r.email}</span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{lawName(r.law)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.createdAt)}</td>
                        <td>
                          {closed ? (
                            <span className={s.sub} style={{ marginTop: 0 }}>
                              {deadlineText(r)}
                            </span>
                          ) : (
                            <div className={s.dlc}>
                              <span className={d < 0 ? s.warn : d <= 7 ? s.soon : undefined}>
                                {deadlineText(r)}
                                <span className={s.subInline}>
                                  {fmtDate(r.dueAt)}
                                  {r.extendedAt ? ' (extended)' : ''}
                                </span>
                              </span>
                              <span className={[s.mb, d < 0 ? s.mbL : d <= 7 ? s.mbS : ''].join(' ')}>
                                <i style={{ width: `${progressPct(r)}%` }} />
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <StatusPill r={r} />
                        </td>
                        <td className={s.go}>→</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <div className={s.empty}>
                {query ? 'No requests match your search.' : requests.length === 0 ? 'No requests yet.' : 'Nothing here right now.'}
              </div>
            )}
          </section>
        </>
      )}
      {toastEl}
    </main>
  );
}
