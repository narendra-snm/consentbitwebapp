'use client';

// Privacy Policy wizard (design: "03 · Legal › Privacy Policy"): a six-step questionnaire in a
// step rail + form card that builds a hosted privacy policy (/privacy-policy/<domain> on the
// consentbit-privacy-requests worker). Answers autosave as a draft; every publish is a new
// dated version; the cookie list on the page comes from the latest scan. The policy can be
// added to the website as a hosted link, an embed script, or copied HTML.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { previewSections, previewSrcDoc, PREVIEW_SANDBOX } from '../previewLinks';
import {
  Chip,
  Ck,
  Crumb,
  Field,
  Gate,
  InfoBox,
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
  btn,
  btnGreen,
  btnPlain,
  btnPrimary,
  card,
  fmtDate,
  inputCls,
  textareaCls,
  type PublishMethod,
} from '../wizardUi';

type Tool = { name: string; purpose: string; country: string };

type Answers = {
  companyName: string;
  address: string;
  contactEmail: string;
  contactUrl: string;
  phone: string;
  website: string;
  dpoName: string;
  dpoEmail: string;
  euRepresentative: string;
  appealEmail: string;
  collects: Record<string, boolean>;
  userUploads: boolean;
  sensitive: Record<string, boolean>;
  purposes: Record<string, boolean>;
  usesAnalytics: boolean;
  usesAdvertising: boolean;
  dntResponse: string;
  ccpaScope: string;
  sellsData: boolean;
  sellsOrShares: boolean;
  sellDetails: string;
  reviewProcess: string;
  thirdPartyLinks: boolean;
  tools: Tool[];
  regions: Record<string, boolean>;
  retentionCustomer: string;
  retentionEnquiries: string;
  retentionMarketing: string;
  childrenDirected: boolean;
  childrenUnder13: boolean;
  automatedDecisions: boolean;
};

type Version = { version: number; publishedAt: string };

type PolicyResponse = {
  success: boolean;
  error?: string;
  enabled?: boolean;
  canEdit?: boolean;
  publicUrl?: string | null;
  embedSnippet?: string | null;
  answers?: Answers;
  draftSavedAt?: string | null;
  versions?: Version[];
  scan?: { scannedAt: string; cookieCount: number } | null;
  // Every map is optional: an older worker build may leave some out.
  options?: {
    regions?: Record<string, string>;
    collects?: Record<string, string>;
    sensitive?: Record<string, string>;
    purposes?: Record<string, string>;
    ccpaScope?: Record<string, string>;
    dnt?: Record<string, string>;
    toolPresets?: Tool[];
  };
};

type Flags = 'collects' | 'regions' | 'sensitive' | 'purposes';

const STEPS = ['Website and audience', 'Data and cookies', 'Purposes and sharing', 'Providers and retention', 'Contacts', 'Review and publish'];
const REVIEW = STEPS.length - 1;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

async function postPolicy(action: 'save' | 'preview' | 'publish', siteId: string, answers: Answers) {
  const res = await fetch(`/api/privacy-policy/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId, answers }),
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

const toCards = (map: Record<string, string>) => Object.entries(map).map(([k, label]) => ({ k, label }));
const countOn = (map: Record<string, boolean> | undefined) => Object.values(map || {}).filter(Boolean).length;

export default function PrivacyPolicyPage() {
  const params = useParams<{ id: string }>();
  const siteId = String(params?.id || '');
  const [data, setData] = useState<PolicyResponse | null>(null);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string; problems?: string[] } | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [pub, setPub] = useState<PublishMethod>('host');
  const [policyHtml, setPolicyHtml] = useState<string>('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const dirty = useRef(false);
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!siteId) return;
    try {
      const res = await fetch(`/api/privacy-policy?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
      const d = (await res.json()) as PolicyResponse;
      setData(d);
      if (d.answers) setAnswers(d.answers);
    } catch {
      setData({ success: false, error: 'Could not load the privacy policy.' });
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  const ro = !data?.canEdit;
  const versions = data?.versions || [];
  const r = answers?.regions || {};
  const usLaw = !!(r.california || r.us_state);

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => {
    dirty.current = true;
    setAnswers((a) => (a ? { ...a, [key]: value } : a));
  };
  const setIn = (key: Flags, sub: string, value: boolean) => {
    dirty.current = true;
    setAnswers((a) => (a ? { ...a, [key]: { ...(a[key] || {}), [sub]: value } } : a));
  };
  const toggleIn = (key: Flags, sub: string) => setIn(key, sub, !answers?.[key]?.[sub]);

  const presetNames = useMemo(() => new Set((data?.options?.toolPresets || []).map((t) => t.name)), [data]);
  const customTools = (answers?.tools || []).filter((t) => !presetNames.has(t.name));
  const hasTool = (name: string) => !!answers?.tools.some((t) => t.name === name);
  const togglePreset = (tool: Tool) =>
    set('tools', hasTool(tool.name) ? (answers?.tools || []).filter((t) => t.name !== tool.name) : [...(answers?.tools || []), tool]);
  const setCustom = (i: number, patch: Partial<Tool>) => {
    const presets = (answers?.tools || []).filter((t) => presetNames.has(t.name));
    set('tools', [...presets, ...customTools.map((t, j) => (j === i ? { ...t, ...patch } : t))]);
  };
  const removeCustom = (i: number) => {
    const presets = (answers?.tools || []).filter((t) => presetNames.has(t.name));
    set('tools', [...presets, ...customTools.filter((_, j) => j !== i)]);
  };

  /** `quiet`: no success/problem message. `silent`: no busy state either (autosave). */
  const run = async (action: 'save' | 'preview' | 'publish', opts: { quiet?: boolean; silent?: boolean } = {}) => {
    if (!answers) return false;
    if (!opts.silent) setBusy(action);
    if (!opts.quiet) setMessage(null);
    if (action === 'save') setSaveState('saving');
    try {
      const res = await postPolicy(action, siteId, answers);
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
        setMessage({ tone: 'ok', text: `Published version ${res.version}. Your policy page is live.` });
        setData((d) => (d ? { ...d, versions: res.versions || d.versions } : d));
        setPolicyHtml('');
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

  const valid = (i: number) => {
    if (!answers) return false;
    if (i === 0) return !!answers.companyName.trim() && countOn(answers.regions) > 0;
    if (i === 4) return EMAIL_RE.test(answers.contactEmail);
    return true;
  };
  const stepProblem = (i: number) => (i === 0 ? 'Add your business name and pick at least one region.' : 'Add a valid privacy contact email.');
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
    if (policyHtml) return;
    setBusy('html');
    try {
      const res = await fetch(`/api/privacy-policy/html?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
      const d = (await res.json()) as { success?: boolean; html?: string; error?: string };
      if (!res.ok || !d.success || !d.html) throw new Error(d.error || 'Could not load the policy HTML.');
      setPolicyHtml(d.html);
    } catch (e: any) {
      setMessage({ tone: 'error', text: e?.message || 'Could not load the policy HTML.' });
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (pub === 'html' && versions.length && !policyHtml) void fetchHtml();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pub, versions.length]);

  const sections = useMemo(() => {
    // Prefer the real headings from the generated preview; the list below is only an
    // estimate shown before the preview has loaded.
    const fromPreview = previewSections(previewHtml);
    if (fromPreview) return fromPreview;
    if (!answers) return [];
    const a = answers;
    const rr = a.regions || {};
    return [
      'Who we are',
      'What we collect and why',
      countOn(a.sensitive) > 0 && 'Sensitive data',
      'Cookies',
      'Who we share your data with',
      a.thirdPartyLinks && 'Links to other websites',
      (a.tools || []).some((t) => t.country) && 'International transfers',
      'How long we keep your data',
      'How we protect your data',
      'Your rights and how to use them',
      (rr.eu || rr.uk) && (rr.eu && rr.uk ? 'Visitors in the EU and UK' : rr.eu ? 'Visitors in the EU / EEA' : 'Visitors in the UK'),
      rr.california && 'Visitors in California',
      rr.us_state && 'Visitors in other US states',
      rr.brazil && 'Visitors in Brazil',
      rr.quebec && 'Visitors in Quebec',
      rr.canada && 'Visitors in Canada',
      (a.childrenDirected || a.childrenUnder13) && 'Children',
      a.automatedDecisions && 'Automated decisions',
      'Changes and contact',
    ].filter((x): x is string => typeof x === 'string');
  }, [answers, previewHtml]);

  const savedText =
    saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Draft saved just now' : data?.draftSavedAt ? `Draft saved ${fmtDate(data.draftSavedAt)}` : ro ? 'Read-only' : 'Not saved yet';

  const stepBody = () => {
    if (!answers || !data?.options) return null;
    // An older worker build returns fewer option maps. Default each one so the wizard never crashes.
    const o = { regions: {}, collects: {}, sensitive: {}, purposes: {}, ccpaScope: {}, dnt: {}, toolPresets: [] as Tool[], ...data.options };
    const scanHint = data.scan ? `Your last scan (${fmtDate(data.scan.scannedAt)}) found ${data.scan.cookieCount} cookies and we ticked what it uses. ` : '';
    switch (step) {
      case 0:
        return (
          <>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Company or business name" req hint="Shown as the organisation responsible for the website.">
                <input className={inputCls} value={answers.companyName} maxLength={200} onChange={(e) => set('companyName', e.target.value)} />
              </Field>
              <Field label="Website">
                <input className={inputCls} value={answers.website} maxLength={200} onChange={(e) => set('website', e.target.value)} />
              </Field>
            </div>
            <Question title="Where are your visitors?" req hint="Tick every region your website serves. Each one adds its own section to the policy.">
              <div className="grid gap-2 md:grid-cols-2 mt-1">
                {Object.entries(o.regions).map(([k, label]) => (
                  <Ck key={k} on={!!r[k]} label={label} onClick={() => toggleIn('regions', k)} />
                ))}
              </div>
            </Question>
            <Question title="Is any of your audience under 18?" hint="Leave both unticked if the website is for adults only.">
              <div className="grid gap-2 md:grid-cols-2 mt-1">
                <Ck on={answers.childrenDirected} label="Our website is meant for some users under 16" onClick={() => set('childrenDirected', !answers.childrenDirected)} />
                <Ck
                  on={answers.childrenUnder13}
                  label="We knowingly collect personal data from children under 13"
                  sub="Adds the parental-consent wording US law (COPPA) requires."
                  onClick={() => set('childrenUnder13', !answers.childrenUnder13)}
                />
              </div>
            </Question>
          </>
        );

      case 1:
        return (
          <>
            <Question title="What personal data do you collect?" hint="Include data from forms, accounts, checkout and analytics. Each item adds a row to the data table with its purpose and legal basis.">
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(o.collects).map(([k, label]) => (
                  <Chip key={k} on={!!answers.collects[k]} label={label} onClick={() => toggleIn('collects', k)} />
                ))}
                <Chip on={answers.userUploads} label="Files or content visitors upload or post" onClick={() => set('userUploads', !answers.userUploads)} />
              </div>
            </Question>
            <Question title="Do you collect any sensitive data?" hint="Leave all unticked if not. Ticking one adds a “Sensitive data” section and, for California, the right to limit its use.">
              <div className="grid gap-2 md:grid-cols-2 mt-1">
                {Object.entries(o.sensitive).map(([k, label]) => (
                  <Ck key={k} on={!!answers.sensitive?.[k]} label={label} onClick={() => toggleIn('sensitive', k)} />
                ))}
              </div>
            </Question>
            <Question title="Cookies" hint={`${scanHint}The cookie list itself is filled in from the scan each time the policy is viewed, so it stays current.`}>
              <div className="grid gap-2 md:grid-cols-2 mt-1">
                <Ck on={answers.usesAnalytics} label="Analytics cookies" sub="For example Google Analytics, Microsoft Clarity." onClick={() => set('usesAnalytics', !answers.usesAnalytics)} />
                <Ck on={answers.usesAdvertising} label="Advertising cookies or pixels" sub="For example Meta Pixel, Google Ads." onClick={() => set('usesAdvertising', !answers.usesAdvertising)} />
              </div>
            </Question>
            <Question title="Does your website react to a browser “Do Not Track” signal?" hint="California requires the policy to say either way.">
              <div className="mt-1">
                <RadioCards value={answers.dntResponse} options={toCards(o.dnt)} onChange={(v) => set('dntResponse', v)} />
              </div>
            </Question>
          </>
        );

      case 2:
        return (
          <>
            <Question title="Why do you use personal data?" hint="Besides providing what visitors asked for. Running, securing and legally defending the website is always included.">
              <div className="grid gap-2 md:grid-cols-2 mt-1">
                {Object.entries(o.purposes).map(([k, label]) => (
                  <Ck key={k} on={!!answers.purposes?.[k]} label={label} onClick={() => toggleIn('purposes', k)} />
                ))}
              </div>
            </Question>
            <Question title="Other disclosures">
              <div className="grid gap-2 md:grid-cols-2 mt-1">
                <Ck
                  on={answers.thirdPartyLinks}
                  label="Our website links to other companies’ websites or services"
                  sub="Adds a short section saying their policies apply once visitors leave."
                  onClick={() => set('thirdPartyLinks', !answers.thirdPartyLinks)}
                />
                <Ck
                  on={answers.automatedDecisions}
                  label="We make automated decisions with legal or similar effects on people"
                  sub="For example automatic credit or job screening."
                  onClick={() => set('automatedDecisions', !answers.automatedDecisions)}
                />
              </div>
            </Question>
            <Question title="Do you sell or share personal data for advertising?" hint="Under CCPA, “sharing” includes sending data to ad networks for targeted ads.">
              <div className="grid gap-2 md:grid-cols-2 mt-1">
                <Ck
                  on={answers.sellsData}
                  label="We sell personal data for money or something else of value"
                  sub="For example selling email lists or customer data to other companies."
                  onClick={() => set('sellsData', !answers.sellsData)}
                />
                <Ck
                  on={answers.sellsOrShares}
                  label="Advertising partners receive visitor data through our ads or pixels"
                  sub={usLaw ? 'California law calls this “sharing”. It adds the opt-out wording to the US sections.' : 'Adds the opt-out wording if you later add a US region.'}
                  onClick={() => set('sellsOrShares', !answers.sellsOrShares)}
                />
              </div>
              {answers.sellsData && (
                <div className="mt-2">
                  <Field label="What you sell and to whom" hint="One or two sentences. Appears in the policy.">
                    <textarea className={textareaCls} value={answers.sellDetails} maxLength={600} onChange={(e) => set('sellDetails', e.target.value)} />
                  </Field>
                </div>
              )}
            </Question>
            {r.california && (
              <Question title="How far does California law reach your business?" hint="The CCPA only binds for-profit businesses above a size threshold, but every commercial website still owes California visitors a basic notice.">
                <div className="mt-1">
                  <RadioCards value={answers.ccpaScope} options={toCards(o.ccpaScope)} onChange={(v) => set('ccpaScope', v)} cols={1} />
                </div>
              </Question>
            )}
          </>
        );

      case 3:
        return (
          <>
            <Question title="Third-party providers" hint="Tools that process data for you. They are listed by name in the policy and each provider’s country feeds the international transfers section. ConsentBit is always listed.">
              <div className="flex flex-wrap gap-1.5 mt-1">
                {o.toolPresets.map((t) => (
                  <Chip key={t.name} on={hasTool(t.name)} label={t.name} title={t.purpose} onClick={() => togglePreset(t)} />
                ))}
              </div>
              {customTools.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {customTools.map((t, i) => (
                    <div key={i} className="grid gap-2 md:grid-cols-[1fr_1.4fr_1fr_auto]">
                      <input className={inputCls} placeholder="Name, for example Mailchimp" value={t.name} maxLength={120} onChange={(e) => setCustom(i, { name: e.target.value })} />
                      <input className={inputCls} placeholder="What it does" value={t.purpose} maxLength={200} onChange={(e) => setCustom(i, { purpose: e.target.value })} />
                      <input className={inputCls} placeholder="Country" value={t.country} maxLength={80} onChange={(e) => setCustom(i, { country: e.target.value })} />
                      <button type="button" className={`${btn} bg-white shadow-[inset_0_0_0_1px_#E5E5E5] text-[#AC2734]`} onClick={() => removeCustom(i)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2">
                <button type="button" className={btnPlain} disabled={(answers.tools || []).length >= 40} onClick={() => set('tools', [...answers.tools, { name: '', purpose: '', country: '' }])}>
                  + Add a provider
                </button>
              </div>
            </Question>
            <Question title="How long do you keep personal data?" hint="Technical data and cookie choices use fixed periods that match how ConsentBit stores them. You can add exceptions in the published policy.">
              <div className="grid gap-3.5 md:grid-cols-2 mt-1">
                {(answers.collects.accounts || answers.collects.orders) && (
                  <Field label="Account, order and customer data">
                    <input className={inputCls} value={answers.retentionCustomer} maxLength={400} onChange={(e) => set('retentionCustomer', e.target.value)} />
                  </Field>
                )}
                {(answers.collects.contactForms || answers.collects.support || answers.collects.jobApplications) && (
                  <Field label="Enquiries, support conversations and applications">
                    <input className={inputCls} value={answers.retentionEnquiries} maxLength={400} onChange={(e) => set('retentionEnquiries', e.target.value)} />
                  </Field>
                )}
                {answers.collects.newsletter && (
                  <Field label="Newsletter subscriptions">
                    <input className={inputCls} value={answers.retentionMarketing} maxLength={400} onChange={(e) => set('retentionMarketing', e.target.value)} />
                  </Field>
                )}
                {!(answers.collects.accounts || answers.collects.orders || answers.collects.contactForms || answers.collects.support || answers.collects.jobApplications || answers.collects.newsletter) && (
                  <p className="text-sm text-[#4B5563]">Nothing to set here: you have not ticked any data that needs its own retention period.</p>
                )}
              </div>
            </Question>
          </>
        );

      case 4:
        return (
          <>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Privacy contact email" req hint="Visitors use this to contact you about their data.">
                <input className={inputCls} type="email" value={answers.contactEmail} maxLength={254} onChange={(e) => set('contactEmail', e.target.value)} />
              </Field>
              <Field label="Postal address" hint="Required under GDPR and LGPD.">
                <input className={inputCls} value={answers.address} maxLength={400} onChange={(e) => set('address', e.target.value)} />
              </Field>
              <Field label="Contact page link" hint="Optional. A page on your website where visitors can reach you.">
                <input className={inputCls} type="url" placeholder="https://" value={answers.contactUrl} maxLength={300} onChange={(e) => set('contactUrl', e.target.value)} />
              </Field>
              <Field label="Phone number" hint="Optional.">
                <input className={inputCls} value={answers.phone} maxLength={40} onChange={(e) => set('phone', e.target.value)} />
              </Field>
            </div>
            <Question title="People responsible for privacy" hint="All optional. Fill in only what applies to your business.">
              <div className="grid gap-3.5 md:grid-cols-2 mt-1">
                <Field label="Data protection officer" hint="Name. Also named as the encarregado (Brazil) and the person in charge (Quebec).">
                  <input className={inputCls} value={answers.dpoName} maxLength={200} onChange={(e) => set('dpoName', e.target.value)} />
                </Field>
                <Field label="Data protection officer email">
                  <input className={inputCls} type="email" value={answers.dpoEmail} maxLength={254} onChange={(e) => set('dpoEmail', e.target.value)} />
                </Field>
                {(r.eu || r.uk) && (
                  <Field label="EU/UK representative" hint="Needed if you have no office in the EU/UK. Name and address.">
                    <input className={inputCls} value={answers.euRepresentative} maxLength={400} onChange={(e) => set('euRepresentative', e.target.value)} />
                  </Field>
                )}
                {r.us_state && (
                  <Field label="Email for appeals" hint="US state laws require a way to appeal a refused request. Defaults to your privacy contact.">
                    <input className={inputCls} type="email" value={answers.appealEmail} maxLength={254} onChange={(e) => set('appealEmail', e.target.value)} />
                  </Field>
                )}
              </div>
            </Question>
            <Field label="Can visitors check or update their own data somewhere?" hint="Optional. For example “log in and open Account settings”.">
              <input className={inputCls} value={answers.reviewProcess} maxLength={400} onChange={(e) => set('reviewProcess', e.target.value)} />
            </Field>
            <InfoBox>
              Visitors can also send requests through your <b>Privacy Requests</b> page. We link to it from the policy automatically.
            </InfoBox>
          </>
        );

      case 5:
        return (
          <>
            <SummaryRows
              rows={[
                { title: 'Website and audience', detail: `${answers.companyName || '—'} · ${countOn(answers.regions)} region${countOn(answers.regions) === 1 ? '' : 's'}`, onEdit: () => goTo(0) },
                {
                  title: 'Data and cookies',
                  detail: `${countOn(answers.collects) + (answers.userUploads ? 1 : 0)} data types${answers.usesAnalytics || answers.usesAdvertising ? ' · cookies from scan' : ''}`,
                  onEdit: () => goTo(1),
                },
                { title: 'Purposes and sharing', detail: `${countOn(answers.purposes)} purposes · sells or shares: ${answers.sellsData || answers.sellsOrShares ? 'Yes' : 'No'}`, onEdit: () => goTo(2) },
                { title: 'Providers and retention', detail: `${(answers.tools || []).length + 1} providers incl. ConsentBit`, onEdit: () => goTo(3) },
                { title: 'Contacts', detail: answers.contactEmail || '—', onEdit: () => goTo(4) },
              ]}
            />
            <PublishOptions method={pub} onChange={setPub} publicUrl={data.publicUrl} embedSnippet={data.embedSnippet} html={policyHtml} htmlBusy={busy === 'html'} published={versions.length > 0} />
            <div className={`${card} overflow-hidden`}>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#E5E5E5] bg-[#F9F9FA]">
                <span className="text-sm font-medium text-[#111827]">Preview{versions.length ? ' of the next version' : ''} (not published)</span>
                <button type="button" className={`${btnPlain} h-8`} disabled={!!busy} onClick={() => run('preview')}>
                  {busy === 'preview' ? 'Loading…' : 'Refresh preview'}
                </button>
              </div>
              {previewHtml !== null ? (
                /* Empty sandbox: the preview can't run scripts or reach the dashboard. */
                <iframe title="Privacy policy preview" sandbox={PREVIEW_SANDBOX} srcDoc={previewSrcDoc(previewHtml)} className="w-full h-[560px] bg-white" />
              ) : (
                <p className="px-4 py-8 text-sm text-center text-[#4B5563]">{busy === 'preview' ? 'Building the preview…' : 'Click Refresh preview to see the policy.'}</p>
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
              You are responsible for checking that the policy matches what your website really does. Publish again whenever your tools or practices change, and at least once a year. We email you a reminder after 11 months.
            </p>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <PageWrap>
      <Crumb items={[{ label: 'Legal', href: `/dashboard/${siteId}/legal-policies` }, { label: 'Privacy Policy' }]} />
      <PageHead
        title="Privacy Policy"
        lede="Answer the questions step by step and we build a privacy policy for your website, with a section for each region you choose. Host it with us, embed it on your own page, or copy the HTML."
        right={!loading && data?.success && data.enabled ? <LiveBox versions={versions} publicUrl={data.publicUrl} draftSavedAt={data.draftSavedAt} /> : undefined}
      />

      {loading && <p className="text-[#4B5563]">Loading…</p>}
      {!loading && data && !data.success && <p className="text-[#AC2734]">{data.error || 'Could not load the privacy policy.'}</p>}

      {!loading && data?.success && !data.enabled && (
        <Gate siteId={siteId} text="Every privacy law requires a privacy policy, and your cookie banner should link to it. Upgrade to create and host one here." />
      )}

      {!loading && data?.success && data.enabled && answers && data.options && (
        <>
          {!data.options.sensitive && (
            <Notice tone="warn" text="The privacy worker this dashboard talks to is an older build, so some questions are hidden. Deploy consentbit-privacy-requests (or run it locally with PRIVACY_API_BASE) and reload." />
          )}
          {ro && <Notice tone="warn" text="Only the account owner or a team Admin can edit the privacy policy. You can still read the answers and preview it." />}
          {message && <Notice tone={message.tone} text={message.text} problems={message.problems} />}

          <WizardShell steps={STEPS} step={step} onStep={(i) => goTo(i)} canJump={canJump} sections={sections} sectionsLabel="Sections in your policy" readOnly={ro}
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
              {stepBody()}
            </fieldset>
          </WizardShell>
        </>
      )}
    </PageWrap>
  );
}
