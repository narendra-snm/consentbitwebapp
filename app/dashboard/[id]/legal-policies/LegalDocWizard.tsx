'use client';

// Shared step-by-step generator for the Cookie Policy (kind="cookie") and the Terms &
// Conditions (kind="terms"), on the same step rail + form card shell as the Privacy Policy
// wizard. The documents are built and hosted by the consentbit-privacy-requests worker
// (/cookie-policy/<domain>, /terms/<domain>). Answers autosave as a draft; every publish is a
// new dated version; the cookie policy's cookie list comes from the latest scan. Either
// document can be added to the website as a hosted link, an embed script, or copied HTML.
//
// The privacy policy has its own page (./privacy-policy) with a richer questionnaire.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Ck,
  Crumb,
  Field,
  Gate,
  LiveBox,
  Notice,
  PageHead,
  PageWrap,
  PublishOptions,
  Question,
  RadioCards,
  StepBar,
  SummaryRows,
  WizardShell,
  btnGreen,
  btnPlain,
  btnPrimary,
  card,
  fmtDate,
  inputCls,
  textareaCls,
  type PublishMethod,
} from './wizardUi';

type Kind = 'cookie' | 'terms';
type Answers = Record<string, any>;
type Version = { version: number; publishedAt: string };
type Options = Record<string, Record<string, string>>;

type DocResponse = {
  success: boolean;
  error?: string;
  enabled?: boolean;
  kind?: Kind;
  title?: string;
  canEdit?: boolean;
  publicUrl?: string | null;
  embedSnippet?: string | null;
  answers?: Answers;
  draftSavedAt?: string | null;
  versions?: Version[];
  scan?: { scannedAt: string; cookieCount: number } | null;
  options?: Options;
};

const META: Record<Kind, { title: string; intro: string; steps: string[]; gate: string }> = {
  cookie: {
    title: 'Cookie Policy',
    intro: 'Answer a few questions and we build a cookie policy for your website. The cookie list is filled in from your latest scan every time the page is viewed, so it stays current. Host it with us, embed it on your own page, or copy the HTML.',
    steps: ['Website and regions', 'Cookies you use', 'Links and contact', 'Review and publish'],
    gate: 'A cookie policy tells visitors which cookies you use and how to control them. Most privacy laws expect one next to the cookie banner.',
  },
  terms: {
    title: 'Terms & Conditions',
    intro: 'Answer the questions step by step and we build the terms and conditions for your website: what you offer, payments and refunds, accounts, acceptable use, liability and governing law. Host them with us, embed them on your own page, or copy the HTML.',
    steps: ['Your business', 'What you offer', 'Payments and refunds', 'Content and liability', 'Law and contact', 'Review and publish'],
    gate: 'Terms and conditions set the rules for using your website and buying from you, and limit your liability.',
  },
};

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const toCards = (map: Record<string, string>) => Object.entries(map).map(([k, label]) => ({ k, label }));
const countOn = (map: Record<string, boolean> | undefined) => Object.values(map || {}).filter(Boolean).length;

async function postDoc(action: 'save' | 'preview' | 'publish', siteId: string, kind: Kind, answers: Answers) {
  const res = await fetch(`/api/legal-policy/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId, kind, answers }),
  });
  const data = (await res.json().catch(() => ({ success: false, error: 'Something went wrong.' }))) as {
    success?: boolean;
    error?: string;
    problems?: string[];
    html?: string;
    draftSavedAt?: string;
    version?: number;
    versions?: Version[];
  };
  if (!res.ok || !data.success) throw Object.assign(new Error(data.error || 'Something went wrong.'), { problems: data.problems });
  return data;
}

export default function LegalDocWizard({ kind }: { kind: Kind }) {
  const meta = META[kind];
  const STEPS = meta.steps;
  const REVIEW = STEPS.length - 1;
  const params = useParams<{ id: string }>();
  const siteId = String(params?.id || '');
  const [data, setData] = useState<DocResponse | null>(null);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string; problems?: string[] } | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [pub, setPub] = useState<PublishMethod>('host');
  const [docHtml, setDocHtml] = useState<string>('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const dirty = useRef(false);
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!siteId) return;
    try {
      const res = await fetch(`/api/legal-policy?siteId=${encodeURIComponent(siteId)}&kind=${kind}`, { cache: 'no-store' });
      const d = (await res.json()) as DocResponse;
      setData(d);
      if (d.answers) setAnswers(d.answers);
    } catch {
      setData({ success: false, error: `Could not load the ${meta.title.toLowerCase()}.` });
    } finally {
      setLoading(false);
    }
  }, [siteId, kind, meta.title]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: string, value: unknown) => {
    dirty.current = true;
    setAnswers((a) => (a ? { ...a, [key]: value } : a));
  };
  const setIn = (key: string, sub: string, value: boolean) => {
    dirty.current = true;
    setAnswers((a) => (a ? { ...a, [key]: { ...(a[key] || {}), [sub]: value } } : a));
  };
  const toggleIn = (key: string, sub: string) => setIn(key, sub, !answers?.[key]?.[sub]);
  const toggle = (key: string) => set(key, !answers?.[key]);

  const ro = !data?.canEdit;
  const versions = data?.versions || [];
  const r = (answers?.regions || {}) as Record<string, boolean>;
  const usLaw = !!(r.california || r.us_state);
  const o = (answers?.offers || {}) as Record<string, boolean>;
  const sells = !!(o.products || o.digital || o.services || o.subscription || o.software);
  const opt = (name: string): Record<string, string> => data?.options?.[name] || {};

  const run = async (action: 'save' | 'preview' | 'publish', opts: { quiet?: boolean; silent?: boolean } = {}) => {
    if (!answers) return false;
    if (!opts.silent) setBusy(action);
    if (!opts.quiet) setMessage(null);
    if (action === 'save') setSaveState('saving');
    try {
      const res = await postDoc(action, siteId, kind, answers);
      if (action === 'preview') {
        setPreviewHtml(res.html || '');
        if (res.problems?.length) setMessage({ tone: 'error', text: 'Fix these before publishing:', problems: res.problems });
      } else if (action === 'save') {
        dirty.current = false;
        setSaveState('saved');
        if (!opts.quiet) {
          setMessage(
            res.problems?.length
              ? { tone: 'error', text: 'Draft saved. Fix these before publishing:', problems: res.problems }
              : { tone: 'ok', text: 'Draft saved.' }
          );
        }
        setData((d) => (d ? { ...d, draftSavedAt: res.draftSavedAt || d.draftSavedAt } : d));
      } else {
        setMessage({ tone: 'ok', text: `Published version ${res.version}. Your ${meta.title.toLowerCase()} page is live.` });
        setData((d) => (d ? { ...d, versions: res.versions || d.versions } : d));
        setDocHtml('');
      }
      return true;
    } catch (e: any) {
      if (action === 'save') setSaveState('idle');
      setMessage({ tone: 'error', text: e?.message || 'Something went wrong.', problems: e?.problems });
      return false;
    } finally {
      if (!opts.silent) setBusy(null);
    }
  };

  // Autosave the draft shortly after the last change, so nothing is lost on a refresh.
  useEffect(() => {
    if (!answers || ro || !dirty.current) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void run('save', { quiet: true, silent: true });
    }, 1200);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, ro]);

  const contactStep = kind === 'cookie' ? 2 : 4;
  const valid = (i: number) => {
    if (!answers) return false;
    if (i === 0) return !!String(answers.companyName || '').trim() && countOn(answers.regions) > 0;
    if (i === contactStep) return EMAIL_RE.test(answers.contactEmail || '') && (kind !== 'terms' || !!String(answers.governingLaw || '').trim());
    return true;
  };
  const stepProblem = (i: number) =>
    i === 0 ? 'Add your business name and pick at least one region.' : kind === 'terms' ? 'Add the governing law and a valid contact email.' : 'Add a valid contact email.';
  const canJump = (i: number) => ro || [...Array(i).keys()].every(valid);

  const goTo = async (next: number, check = false) => {
    const target = Math.max(0, Math.min(REVIEW, next));
    if (target === step) return;
    if (check && target > step && !valid(step)) {
      setStepError(stepProblem(step));
      return;
    }
    setStepError(null);
    setMessage(null);
    if (!ro && answers && dirty.current) await run('save', { quiet: true });
    setStep(target);
    if (target === REVIEW) {
      setPreviewHtml(null);
      await run('preview', { quiet: true });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchHtml = async () => {
    if (docHtml) return;
    setBusy('html');
    try {
      const res = await fetch(`/api/legal-policy/html?siteId=${encodeURIComponent(siteId)}&kind=${kind}`, { cache: 'no-store' });
      const d = (await res.json()) as { success?: boolean; html?: string; error?: string };
      if (!res.ok || !d.success || !d.html) throw new Error(d.error || 'Could not load the HTML.');
      setDocHtml(d.html);
    } catch (e: any) {
      setMessage({ tone: 'error', text: e?.message || 'Could not load the HTML.' });
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (pub === 'html' && versions.length && !docHtml) void fetchHtml();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pub, versions.length]);

  const sections = useMemo(() => {
    if (!answers) return [];
    const a = answers;
    const list =
      kind === 'cookie'
        ? [
            'About this cookie policy',
            'What cookies and similar technologies are',
            'How we ask for your consent',
            'Types of cookies we use',
            'Cookies on this website',
            (a.usesAnalytics || a.usesAdvertising || a.usesEmbeds) && 'Third-party cookies',
            'How to control cookies in your browser',
            'Do Not Track and Global Privacy Control',
            countOn(a.regions) > 0 && 'Notes for visitors in specific regions',
            'Changes and contact',
          ]
        : [
            'Who we are and what these terms cover',
            'What we offer',
            sells && 'Prices and payment',
            o.products && 'Delivery',
            sells && 'Cancellations, returns and refunds',
            a.userContent && 'Content you post or upload',
            'Acceptable use',
            'Intellectual property',
            a.thirdPartyLinks && 'Links to other websites',
            'Disclaimers',
            'Limitation of liability',
            'Your responsibility to us',
            'Suspension and ending these terms',
            'Governing law and disputes',
            'Changes to these terms',
            'General',
            'Contact',
          ];
    return list.filter((x): x is string => typeof x === 'string');
  }, [answers, kind, sells, o.products]);

  const savedText =
    saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Draft saved just now' : data?.draftSavedAt ? `Draft saved ${fmtDate(data.draftSavedAt)}` : ro ? 'Read-only' : 'Not saved yet';

  // ── shared blocks ─────────────────────────────────────────────────────────

  const companyBlock = (regionsTitle: string, regionsHint: string) =>
    answers && (
      <>
        <div className="grid gap-3.5 md:grid-cols-2">
          <Field label="Company or business name" req hint="Shown as the organisation responsible for the website.">
            <input className={inputCls} value={answers.companyName || ''} maxLength={200} onChange={(e) => set('companyName', e.target.value)} />
          </Field>
          <Field label="Website">
            <input className={inputCls} value={answers.website || ''} maxLength={200} onChange={(e) => set('website', e.target.value)} />
          </Field>
          {kind === 'terms' && (
            <>
              <Field label="Legal form" hint="Optional. For example Ltd, LLC, GmbH, Inc.">
                <input className={inputCls} value={answers.legalForm || ''} maxLength={120} onChange={(e) => set('legalForm', e.target.value)} />
              </Field>
              <Field label="Country where the business is based" hint="Optional. Named in the opening paragraph.">
                <input className={inputCls} value={answers.country || ''} maxLength={120} onChange={(e) => set('country', e.target.value)} />
              </Field>
            </>
          )}
          <Field label="Postal address" hint="Recommended. Consumer laws usually expect a business address.">
            <input className={inputCls} value={answers.address || ''} maxLength={400} onChange={(e) => set('address', e.target.value)} />
          </Field>
        </div>
        <Question title={regionsTitle} req hint={regionsHint}>
          <div className="grid gap-2 md:grid-cols-2 mt-1">
            {Object.entries(opt('regions')).map(([k, label]) => (
              <Ck key={k} on={!!r[k]} label={label} onClick={() => toggleIn('regions', k)} />
            ))}
          </div>
        </Question>
      </>
    );

  const contactBlock = () =>
    answers && (
      <div className="grid gap-3.5 md:grid-cols-2">
        <Field label="Contact email" req hint="Where visitors send questions about this document.">
          <input className={inputCls} type="email" value={answers.contactEmail || ''} maxLength={254} onChange={(e) => set('contactEmail', e.target.value)} />
        </Field>
        <Field label="Contact page link" hint="Optional. A page on your website where visitors can reach you.">
          <input className={inputCls} type="url" placeholder="https://" value={answers.contactUrl || ''} maxLength={300} onChange={(e) => set('contactUrl', e.target.value)} />
        </Field>
        <Field label="Privacy policy link" hint={answers.privacyPolicyUrl ? 'Pre-filled with your hosted privacy policy. Change it if the policy lives on your own domain.' : 'Optional. Publish a privacy policy here and we fill this in for you.'}>
          <input className={inputCls} type="url" placeholder="https://" value={answers.privacyPolicyUrl || ''} maxLength={300} onChange={(e) => set('privacyPolicyUrl', e.target.value)} />
        </Field>
        {kind === 'terms' && (
          <Field label="Cookie policy link" hint={answers.cookiePolicyUrl ? 'Pre-filled with your hosted cookie policy.' : 'Optional. Publish a cookie policy here and we fill this in for you.'}>
            <input className={inputCls} type="url" placeholder="https://" value={answers.cookiePolicyUrl || ''} maxLength={300} onChange={(e) => set('cookiePolicyUrl', e.target.value)} />
          </Field>
        )}
      </div>
    );

  const reviewBlock = () => {
    if (!data || !answers) return null;
    const rows =
      kind === 'cookie'
        ? [
            { title: 'Website and regions', detail: `${answers.companyName || '—'} · ${countOn(answers.regions)} region${countOn(answers.regions) === 1 ? '' : 's'}`, onEdit: () => goTo(0) },
            {
              title: 'Cookies you use',
              detail: `${[answers.usesFunctional, answers.usesAnalytics, answers.usesAdvertising, answers.usesEmbeds].filter(Boolean).length + 1} categories incl. strictly necessary · choice kept ${answers.consentMonths || '12'} months`,
              onEdit: () => goTo(1),
            },
            { title: 'Links and contact', detail: answers.contactEmail || '—', onEdit: () => goTo(2) },
          ]
        : [
            { title: 'Your business', detail: `${answers.companyName || '—'} · ${countOn(answers.regions)} region${countOn(answers.regions) === 1 ? '' : 's'}`, onEdit: () => goTo(0) },
            { title: 'What you offer', detail: `${countOn(o)} offer${countOn(o) === 1 ? '' : 's'}${answers.accounts ? ' · accounts' : ''}${answers.userContent ? ' · user content' : ''}`, onEdit: () => goTo(1) },
            { title: 'Payments and refunds', detail: sells ? `${answers.currency || 'currency not set'} · refunds: ${opt('refund')[answers.refundPolicy || 'statutory'] || answers.refundPolicy || 'statutory'}` : 'Nothing sold online', onEdit: () => goTo(2) },
            { title: 'Content and liability', detail: opt('liability')[answers.liabilityCap || 'paid12'] || answers.liabilityCap || '—', onEdit: () => goTo(3) },
            { title: 'Law and contact', detail: `${answers.governingLaw || '—'} · ${answers.contactEmail || '—'}`, onEdit: () => goTo(4) },
          ];
    return (
      <>
        <SummaryRows rows={rows} />
        <PublishOptions method={pub} onChange={setPub} publicUrl={data.publicUrl} embedSnippet={data.embedSnippet} html={docHtml} htmlBusy={busy === 'html'} published={versions.length > 0} />
        <div className={`${card} overflow-hidden`}>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#E5E5E5] bg-[#F9F9FA]">
            <span className="text-sm font-medium text-[#111827]">Preview{versions.length ? ' of the next version' : ''} (not published)</span>
            <button type="button" className={`${btnPlain} h-8`} disabled={!!busy} onClick={() => run('preview')}>
              {busy === 'preview' ? 'Loading…' : 'Refresh preview'}
            </button>
          </div>
          {previewHtml !== null ? (
            /* Empty sandbox: the preview can't run scripts or reach the dashboard. */
            <iframe title={`${meta.title} preview`} sandbox="" srcDoc={previewHtml} className="w-full h-[560px] bg-white" />
          ) : (
            <p className="px-4 py-8 text-sm text-center text-[#4B5563]">{busy === 'preview' ? 'Building the preview…' : 'Click Refresh preview to see the document.'}</p>
          )}
        </div>
        {versions.length > 0 && (
          <div className="text-sm text-[#4B5563]">
            <p className="font-medium text-[#111827] mb-1">Published versions</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {versions.map((v) => (
                <li key={v.version}>
                  <a className="text-[#007AFF] hover:underline" href={`${data.publicUrl}${v.version === versions[0].version ? '' : `?v=${v.version}`}`} target="_blank" rel="noopener noreferrer">
                    Version {v.version}
                  </a>{' '}
                  · {fmtDate(v.publishedAt)}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-[#4B5563]">
          You are responsible for checking that the document matches what your website really does. Publish again whenever your practices change.
          {kind === 'terms' ? ' For anything unusual, such as regulated products or high-value contracts, have a lawyer review the result.' : ''}
        </p>
      </>
    );
  };

  // ── cookie policy steps ───────────────────────────────────────────────────

  const cookieStep = () => {
    if (!answers) return null;
    switch (step) {
      case 0:
        return companyBlock('Where are your visitors?', 'Tick every region your website serves. Each one adds its own consent rules to the policy.');
      case 1:
        return (
          <>
            <Question
              title="Which kinds of cookies does your website use?"
              hint={
                data?.scan
                  ? `Your last scan (${fmtDate(data.scan.scannedAt)}) found ${data.scan.cookieCount} cookies. Strictly necessary cookies are always included. The cookie list itself is filled in from the scan each time the policy is viewed.`
                  : 'Strictly necessary cookies are always included. Run a scan so the cookie list on the page is filled in.'
              }
            >
              <div className="grid gap-2 md:grid-cols-2 mt-1">
                <Ck on={!!answers.usesFunctional} label="Functional and preference cookies" sub="Language, region or display settings." onClick={() => toggle('usesFunctional')} />
                <Ck on={!!answers.usesAnalytics} label="Analytics cookies" sub="For example Google Analytics, Microsoft Clarity, Hotjar." onClick={() => toggle('usesAnalytics')} />
                <Ck on={!!answers.usesAdvertising} label="Advertising cookies or pixels" sub="For example Meta Pixel, Google Ads, LinkedIn Insight Tag." onClick={() => toggle('usesAdvertising')} />
                <Ck on={!!answers.usesEmbeds} label="Embedded content from other companies" sub="YouTube or Vimeo videos, Google Maps, social media posts." onClick={() => toggle('usesEmbeds')} />
              </div>
            </Question>
            {(usLaw || answers.usesAdvertising) && (
              <Question title="Do advertising partners receive visitor data through your ads or pixels?" hint="California law calls this “sharing”. It changes the wording of the US notice.">
                <div className="mt-1">
                  <Ck on={!!answers.sellsOrShares} label="Yes, advertising partners receive identifiers or browsing activity" onClick={() => toggle('sellsOrShares')} />
                </div>
              </Question>
            )}
            <Question title="How long is a visitor’s choice remembered?" hint="ConsentBit stores the choice for 12 months by default. Only change this if you changed the banner’s consent duration.">
              <div className="mt-1">
                <RadioCards value={String(answers.consentMonths || '12')} options={toCards(opt('consentMonths'))} onChange={(v) => set('consentMonths', v)} cols={3} />
              </div>
            </Question>
            <Field label="Name of the button visitors use to change their choice" hint="The floating button or footer link your banner shows. Appears in the policy as “use the ‘…’ button”.">
              <input className={inputCls} value={answers.preferencesLabel || ''} maxLength={60} onChange={(e) => set('preferencesLabel', e.target.value)} />
            </Field>
            <Question title="Does your website react to a browser “Do Not Track” signal?" hint="California requires the policy to say either way. Global Privacy Control is always honoured.">
              <div className="mt-1">
                <RadioCards value={answers.dntResponse || 'ignore'} options={toCards(opt('dnt'))} onChange={(v) => set('dntResponse', v)} />
              </div>
            </Question>
          </>
        );
      case 2:
        return contactBlock();
      case 3:
        return reviewBlock();
      default:
        return null;
    }
  };

  // ── terms steps ───────────────────────────────────────────────────────────

  const termsStep = () => {
    if (!answers) return null;
    switch (step) {
      case 0:
        return companyBlock('Where are your customers?', 'Tick every region you sell to or serve. Each one adds its consumer protections: the EU/UK 14-day right to cancel, Brazil’s 7-day withdrawal, Quebec’s rules, and so on.');
      case 1:
        return (
          <>
            <Question title="What does your website offer?" hint="Tick everything that applies. Each one adds its own section: orders, licences, bookings, subscriptions.">
              <div className="grid gap-2 md:grid-cols-2 mt-1">
                {Object.entries(opt('offers')).map(([k, label]) => (
                  <Ck key={k} on={!!o[k]} label={label} onClick={() => toggleIn('offers', k)} />
                ))}
              </div>
            </Question>
            <Question title="Accounts and users">
              <div className="grid gap-2 md:grid-cols-2 mt-1">
                <Ck on={!!answers.accounts} label="Visitors can create an account or log in" onClick={() => toggle('accounts')} />
                <Ck on={!!answers.userContent} label="Visitors can post or upload content" sub="Reviews, comments, profiles, files. Adds a section on who owns it and what is allowed." onClick={() => toggle('userContent')} />
              </div>
            </Question>
            <Question title="Minimum age to use the website">
              <div className="mt-1">
                <RadioCards value={String(answers.minimumAge || 'none')} options={toCards(opt('minimumAge'))} onChange={(v) => set('minimumAge', v)} cols={3} />
              </div>
            </Question>
          </>
        );
      case 2:
        return sells ? (
          <>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Currency of your prices" hint="For example EUR, GBP, USD.">
                <input className={inputCls} value={answers.currency || ''} maxLength={40} onChange={(e) => set('currency', e.target.value)} />
              </Field>
              <Field label="Payment providers" hint="For example Stripe, PayPal, Shopify Payments.">
                <input className={inputCls} value={answers.paymentProviders || ''} maxLength={200} onChange={(e) => set('paymentProviders', e.target.value)} />
              </Field>
            </div>
            <Ck on={!!answers.pricesIncludeTax} label="Prices shown include tax (VAT, sales tax)" onClick={() => toggle('pricesIncludeTax')} />
            {o.products && (
              <Field label="Where do you deliver?" hint="For example “the UK and the EU”, “the United States and Canada”, “worldwide”.">
                <input className={inputCls} value={answers.shippingRegions || ''} maxLength={300} onChange={(e) => set('shippingRegions', e.target.value)} />
              </Field>
            )}
            {o.subscription && (
              <>
                <Question title="How do subscriptions renew?">
                  <div className="mt-1">
                    <RadioCards value={answers.renewal || 'auto'} options={toCards(opt('renewal'))} onChange={(v) => set('renewal', v)} />
                  </div>
                </Question>
                {answers.renewal === 'auto' && (
                  <Field label="When can a customer cancel?" hint="Completes the sentence “You can cancel …”.">
                    <input className={inputCls} value={answers.cancellationNotice || ''} maxLength={200} onChange={(e) => set('cancellationNotice', e.target.value)} />
                  </Field>
                )}
              </>
            )}
            <Question title="What is your refund policy?" hint="Legal rights, such as the EU/UK right to cancel and refunds for faulty goods, are always added on top.">
              <div className="mt-1">
                <RadioCards value={answers.refundPolicy || 'statutory'} options={toCards(opt('refund'))} onChange={(v) => set('refundPolicy', v)} />
              </div>
            </Question>
            <Field label={answers.refundPolicy === 'custom' ? 'Describe your refund policy' : 'Anything to add about refunds?'} req={answers.refundPolicy === 'custom'} hint="Plain sentences. Appears in the refunds section.">
              <textarea className={textareaCls} value={answers.refundDetails || ''} maxLength={1000} onChange={(e) => set('refundDetails', e.target.value)} />
            </Field>
          </>
        ) : (
          <p className="text-sm text-[#4B5563]">Nothing to set here: you have not ticked anything you sell. Go back to “What you offer” if that is wrong.</p>
        );
      case 3:
        return (
          <>
            <Question title="Links and recommendations">
              <div className="grid gap-2 md:grid-cols-2 mt-1">
                <Ck on={!!answers.thirdPartyLinks} label="The website links to other companies’ websites or services" onClick={() => toggle('thirdPartyLinks')} />
                <Ck on={!!answers.affiliateLinks} label="Some links are affiliate links that earn us a commission" sub="Adds the disclosure consumer-protection rules expect." onClick={() => toggle('affiliateLinks')} />
              </div>
            </Question>
            <Question title="Does the website cover any of these topics?" hint="Each one adds a “not professional advice” disclaimer.">
              <div className="grid gap-2 md:grid-cols-2 mt-1">
                {Object.entries(opt('advice')).map(([k, label]) => (
                  <Ck key={k} on={!!answers.advice?.[k]} label={label} onClick={() => toggleIn('advice', k)} />
                ))}
              </div>
            </Question>
            <Question title="How do you want to cap your liability?" hint="Death, personal injury, fraud and consumers’ legal rights are never excluded, whatever you choose.">
              <div className="mt-1">
                <RadioCards value={answers.liabilityCap || 'paid12'} options={toCards(opt('liability'))} onChange={(v) => set('liabilityCap', v)} />
              </div>
            </Question>
            {answers.liabilityCap === 'fixed' && (
              <Field label="Fixed amount" req hint="For example “EUR 1,000” or “USD 500”.">
                <input className={inputCls} value={answers.liabilityAmount || ''} maxLength={60} onChange={(e) => set('liabilityAmount', e.target.value)} />
              </Field>
            )}
          </>
        );
      case 4:
        return (
          <>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Governing law" req hint="The country, or US state, whose law applies. For example “England and Wales”, “Germany”, “the State of California”.">
                <input className={inputCls} value={answers.governingLaw || ''} maxLength={120} onChange={(e) => set('governingLaw', e.target.value)} />
              </Field>
              <Field label="Courts" hint="Optional. For example “the courts of London”. Defaults to the courts of the governing-law country.">
                <input className={inputCls} value={answers.courts || ''} maxLength={160} onChange={(e) => set('courts', e.target.value)} />
              </Field>
            </div>
            <Question title="How are disputes resolved?" hint="Consumers in the EU, UK, Brazil and Quebec keep their right to go to their local courts whatever you choose.">
              <div className="mt-1">
                <RadioCards value={answers.disputes || 'courts'} options={toCards(opt('disputes'))} onChange={(v) => set('disputes', v)} />
              </div>
            </Question>
            {answers.disputes === 'arbitration' && (
              <>
                <Field label="Arbitration body" req hint="For example “the American Arbitration Association (AAA)” or “JAMS”.">
                  <input className={inputCls} value={answers.arbitrationBody || ''} maxLength={200} onChange={(e) => set('arbitrationBody', e.target.value)} />
                </Field>
                {usLaw && (
                  <Ck
                    on={!!answers.classWaiver}
                    label="Add a class-action waiver (US)"
                    sub="Claims can only be brought individually. Includes a 30-day opt-out, which US courts expect."
                    onClick={() => toggle('classWaiver')}
                  />
                )}
              </>
            )}
            <Field label="Notice before material changes to the terms (days)" hint="0 means changes apply when posted. 30 is common; subscriptions and accounts should give notice.">
              <input className={`${inputCls} md:w-40`} type="number" min={0} max={90} value={answers.changeNoticeDays ?? '30'} onChange={(e) => set('changeNoticeDays', e.target.value)} />
            </Field>
            {contactBlock()}
          </>
        );
      case 5:
        return reviewBlock();
      default:
        return null;
    }
  };

  return (
    <PageWrap>
      <Crumb items={[{ label: 'Legal', href: `/dashboard/${siteId}/legal-policies` }, { label: meta.title }]} />
      <PageHead
        title={meta.title}
        lede={meta.intro}
        right={!loading && data?.success && data.enabled ? <LiveBox versions={versions} publicUrl={data.publicUrl} draftSavedAt={data.draftSavedAt} /> : undefined}
      />

      {loading && <p className="text-[#4B5563]">Loading…</p>}
      {!loading && data && !data.success && <p className="text-[#AC2734]">{data.error || `Could not load the ${meta.title.toLowerCase()}.`}</p>}

      {!loading && data?.success && !data.enabled && <Gate siteId={siteId} text={`${meta.gate} Upgrade to create and host one here.`} />}

      {!loading && data?.success && data.enabled && answers && (
        <>
          {ro && <Notice tone="warn" text={`Only the account owner or a team Admin can edit the ${meta.title.toLowerCase()}. You can still read the answers and preview it.`} />}
          {message && <Notice tone={message.tone} text={message.text} problems={message.problems} />}

          <WizardShell steps={STEPS} step={step} onStep={(i) => goTo(i)} canJump={canJump} sections={sections} sectionsLabel={kind === 'cookie' ? 'Sections in your policy' : 'Sections in your terms'} readOnly={ro}
            bar={
              <StepBar
                onBack={() => goTo(step - 1)}
                backDisabled={step === 0 || !!busy}
                status={savedText}
                error={stepError}
                primary={
                  step < REVIEW ? (
                    <button type="button" className={btnPrimary} disabled={!!busy} onClick={() => goTo(step + 1, true)}>
                      {busy === 'save' ? 'Saving…' : 'Continue'}
                    </button>
                  ) : !ro ? (
                    <button type="button" className={btnGreen} disabled={!!busy} onClick={() => run('publish')}>
                      {busy === 'publish' ? 'Publishing…' : versions.length ? 'Publish Changes' : 'Publish'}
                    </button>
                  ) : undefined
                }
              />
            }
          >
            <fieldset disabled={ro} className="contents">
              {kind === 'cookie' ? cookieStep() : termsStep()}
            </fieldset>
          </WizardShell>
        </>
      )}
    </PageWrap>
  );
}
