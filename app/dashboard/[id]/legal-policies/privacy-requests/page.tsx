'use client';

// Privacy Requests tab: requests visitors sent through the public form
// (/privacy-request/<domain> on the consentbit-privacy-requests worker), with the legal
// deadline for each. Owner and team Admins can act; Members see them read-only.
//
// Layout follows the Claude Design "Privacy Requests" page: a list view (request-page link,
// count tiles, filterable table) and a full-width detail view (deadline banner, respond card,
// consent records, visitor card, activity timeline). The open request is kept in ?req=<id>
// so the browser back button returns to the list.

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import s from './privacy-requests.module.css';

/** Slug of the Legal hub this page sits under in the breadcrumb; null when the webapp has no hub. */
const LEGAL_HUB_SLUG: string | null = 'legal-policies';

type PrivacyRequest = {
  id: string;
  ref: string;
  type: 'access' | 'delete' | 'correct' | 'optout';
  region: string;
  law: string;
  name: string | null;
  email: string;
  message: string | null;
  consentId: string | null;
  /** 1 when the requester said they are acting for someone else (older worker builds omit it). */
  onBehalf?: number | boolean | null;
  status: 'new' | 'in_progress' | 'completed' | 'rejected';
  createdAt: string;
  verifiedAt: string | null;
  dueAt: string;
  extendedAt: string | null;
  completedAt: string | null;
  reply: string | null;
  ownerNote: string | null;
};

type ListResponse = {
  success: boolean;
  error?: string;
  enabled?: boolean;
  canEdit?: boolean;
  publicUrl?: string | null;
  requests?: PrivacyRequest[];
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
  access: 'See a copy of their data',
  delete: 'Delete their data',
  correct: 'Correct their data',
  optout: 'Stop selling or sharing their data',
};

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

async function postUpdate(body: Record<string, string>) {
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
  onBack,
  onChanged,
  onToast,
}: {
  siteId: string;
  req: PrivacyRequest;
  canEdit: boolean;
  onBack: () => void;
  onChanged: () => Promise<void> | void;
  onToast: (text: string) => void;
}) {
  const [act, setAct] = useState<ActionId>('complete');
  const [msg, setMsg] = useState('');
  const [note, setNote] = useState(req.ownerNote || '');
  const [events, setEvents] = useState<RequestEvent[] | null>(null);
  const [consents, setConsents] = useState<ConsentRecord[] | null | undefined>(undefined);
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
  const extendDisabledReason = req.extendedAt ? 'Already extended once.' : !extDate ? `${req.law} does not allow an extension.` : '';

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
  }, [siteId, req.id, req.status, req.dueAt, req.ownerNote]);

  useEffect(() => {
    setNote(req.ownerNote || '');
  }, [req.ownerNote]);

  const run = async (name: string, body: Record<string, string>, toast: string) => {
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
    const ok = await run(act, { reply: msg.trim() }, 'Visitor emailed');
    if (ok) {
      setMsg('');
      setAct('complete');
    }
  };

  const saveNote = () => run('note', { note: note.trim() }, 'Note saved');

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
            From {req.name || req.email} · {req.law} · Received {fmtDate(req.createdAt)}
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
              <dt>Law</dt>
              <dd>{req.law}</dd>
              <dt>Received</dt>
              <dd>{fmtDate(req.createdAt)}</dd>
              <dt>Third party</dt>
              <dd>{req.onBehalf ? <span className={s.amber}>Yes — verify they are authorised</span> : 'No'}</dd>
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
                {events.map((e, i) => (
                  <li key={i}>
                    <i />
                    <div>
                      <span className={s.sub}>{fmtShort(e.at)}</span>
                      <p>
                        {EVENT_LABEL[e.action] || e.action}
                        {e.action === 'extended' && e.detail ? ` to ${fmtDate(e.detail)}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
                {req.ownerNote && (
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
                  disabled={!!busy || note.trim() === (req.ownerNote || '').trim()}
                  onClick={saveNote}
                >
                  {busy === 'note' ? 'Saving…' : req.ownerNote ? 'Update Note' : 'Add Note'}
                </button>
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
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

  const load = useCallback(async () => {
    if (!siteId) return;
    try {
      const res = await fetch(`/api/privacy-requests?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
      setData(await res.json());
    } catch {
      setData({ success: false, error: 'Could not load privacy requests.' });
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    load();
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
                        <td style={{ whiteSpace: 'nowrap' }}>{r.law}</td>
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
