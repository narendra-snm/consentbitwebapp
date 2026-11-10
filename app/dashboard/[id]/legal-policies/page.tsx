'use client';

// Legal hub: one card per legal page or tool — the privacy policy, cookie policy and terms
// generators, and the Privacy Requests inbox. Each card shows its status and opens the tool.
// Layout follows the Claude Design "Legal" view. Documents are built and hosted by the
// consentbit-privacy-requests worker; this page only reads their status.

import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import s from './legal.module.css';

/** The policy generators (privacy, cookie, terms). False in a webapp that only has Privacy Requests. */
const POLICY_CARDS_ENABLED = true;

type DocStatus = {
  kind: 'privacy' | 'cookie' | 'terms';
  status: 'none' | 'draft' | 'published';
  version: number | null;
  publishedAt: string | null;
  draftSavedAt: string | null;
  publicUrl: string | null;
};

type SummaryResponse = {
  success: boolean;
  error?: string;
  enabled?: boolean;
  canEdit?: boolean;
  documents?: { privacy: DocStatus; cookie: DocStatus; terms: DocStatus };
};

type RequestsResponse = {
  success: boolean;
  error?: string;
  enabled?: boolean;
  requests?: { status: 'new' | 'in_progress' | 'completed' | 'rejected' }[];
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const DocIcon = (
  <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11.7 2.5H5.8a1.7 1.7 0 0 0-1.6 1.7v11.6a1.7 1.7 0 0 0 1.6 1.7h8.4a1.7 1.7 0 0 0 1.6-1.7V6.7z" />
    <path d="M11.7 2.5v4.2h4.1M7.5 10.8h5M7.5 13.8h3.3" />
  </svg>
);
const CookieIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-4-4 4 4 0 0 1-4-4 4 4 0 0 1-2-2z" />
    <circle cx="8.5" cy="10.5" r="1" />
    <circle cx="12" cy="15.5" r="1" />
    <circle cx="16" cy="13" r="1" />
  </svg>
);
const TermsIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 3h7l5 5v13H7z" />
    <path d="M14 3v5h5" />
    <path d="M10 13h6M10 17h6" />
  </svg>
);
const ShieldIcon = (
  <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 2.5 4.2 4.6v4.7c0 3.7 2.5 6.7 5.8 8.2 3.3-1.5 5.8-4.5 5.8-8.2V4.6z" />
    <path d="m7.6 9.9 1.7 1.7 3.2-3.3" />
  </svg>
);
const ArrowIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 8h9M8.5 4l4 4-4 4" />
  </svg>
);

const DOC_CARDS: { kind: DocStatus['kind']; title: string; desc: string; slug: string; icon: ReactNode }[] = [
  { kind: 'privacy', title: 'Privacy Policy', desc: 'Generate and host the privacy policy for your site, with a section for each region you serve.', slug: 'privacy-policy', icon: DocIcon },
  { kind: 'cookie', title: 'Cookie Policy', desc: 'Which cookies the site uses, how consent works, and the live cookie list from your latest scan.', slug: 'cookie-policy', icon: CookieIcon },
  { kind: 'terms', title: 'Terms & Conditions', desc: 'The rules for using your website and buying from you: orders, refunds, accounts, liability and governing law.', slug: 'terms', icon: TermsIcon },
];

function docMeta(doc: DocStatus | undefined): ReactNode {
  if (!doc) return '…';
  const view = doc.publicUrl ? (
    <>
      <span aria-hidden="true">·</span>
      <a href={doc.publicUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        View page
      </a>
    </>
  ) : null;
  if (doc.status === 'published') {
    return (
      <>
        <span>Live · version {doc.version}</span>
        {view}
      </>
    );
  }
  if (doc.status === 'draft') return <span>Draft{doc.draftSavedAt ? ` · saved ${fmtDate(doc.draftSavedAt)}` : ''}</span>;
  return <span>Not generated</span>;
}

function HubCard({ href, icon, title, desc, meta }: { href: string; icon: ReactNode; title: string; desc: string; meta: ReactNode }) {
  const router = useRouter();
  return (
    <div
      className={s.lc}
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(href);
        }
      }}
    >
      <span className={s.ic}>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{desc}</p>
      </div>
      <div className={s.go}>
        <span className={s.meta}>{meta}</span>
        <Link href={href} className={s.open} onClick={(e) => e.stopPropagation()}>
          Open
          {ArrowIcon}
        </Link>
      </div>
    </div>
  );
}

export default function LegalPage() {
  const params = useParams<{ id: string }>();
  const siteId = String(params?.id || '');
  const [legal, setLegal] = useState<SummaryResponse | null>(null);
  const [reqs, setReqs] = useState<RequestsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!siteId) return;
    const q = `siteId=${encodeURIComponent(siteId)}`;
    const get = async <T,>(url: string, fallback: T): Promise<T> => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        return (await res.json()) as T;
      } catch {
        return fallback;
      }
    };
    const [l, r] = await Promise.all([
      POLICY_CARDS_ENABLED
        ? get<SummaryResponse>(`/api/legal-policies?${q}`, { success: false, error: 'Could not load your legal policies.' })
        : Promise.resolve(null),
      get<RequestsResponse>(`/api/privacy-requests?${q}`, { success: false, error: 'Could not load privacy requests.' }),
    ]);
    setLegal(l);
    setReqs(r);
    setLoading(false);
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  // Both tools share the same plan gate (Essential and Growth); the worker decides.
  const primary = POLICY_CARDS_ENABLED ? legal : reqs;
  const failed = !!primary && !primary.success;
  const enabled = !!primary?.success && !!primary.enabled;

  const openCount = reqs?.success ? (reqs.requests || []).filter((r) => r.status === 'new' || r.status === 'in_progress').length : null;
  const requestsMeta: ReactNode =
    openCount === null ? (reqs ? 'Requests unavailable' : '…') : openCount === 0 ? 'No open requests' : `${openCount} open request${openCount === 1 ? '' : 's'}`;

  const base = `/dashboard/${siteId}/legal-policies`;

  return (
    <main className={s.main}>
      <div>
        <h1 className={s.h1}>Legal</h1>
        <p className={s.lede}>Manage the legal pages and requests that keep your site compliant.</p>
      </div>

      {loading && <p className={s.notice}>Loading…</p>}

      {!loading && failed && <p className={s.errText}>{primary?.error || 'Could not load this page.'}</p>}

      {!loading && !failed && !enabled && (
        <section className={s.card}>
          <div className={s.ct}>Available on Essential and Growth</div>
          <p className={s.cd}>
            Every privacy law requires a privacy policy and a way for visitors to make requests about their data. Upgrade to generate and
            host your legal documents here and to get a privacy request page with deadline tracking and reminders.
          </p>
          <Link href={`/dashboard/${siteId}/upgrade`} className={s.btn}>
            Upgrade
          </Link>
        </section>
      )}

      {!loading && !failed && enabled && (
        <>
          <div className={s.lgrid}>
            {POLICY_CARDS_ENABLED &&
              DOC_CARDS.map((c) => (
                <HubCard key={c.kind} href={`${base}/${c.slug}`} icon={c.icon} title={c.title} desc={c.desc} meta={docMeta(legal?.documents?.[c.kind])} />
              ))}
            <HubCard
              href={`${base}/privacy-requests`}
              icon={ShieldIcon}
              title="Privacy Requests"
              desc="Receive and respond to data subject requests from your visitors, each with its legal deadline."
              meta={requestsMeta}
            />
          </div>
          {POLICY_CARDS_ENABLED && (
            <p className={s.tip}>
              Put the links to your documents and your privacy request page in your website footer, and the privacy policy link in the cookie
              banner (Cookie Banner → Content). You are responsible for checking that each document matches what your website really does.
            </p>
          )}
        </>
      )}
    </main>
  );
}
