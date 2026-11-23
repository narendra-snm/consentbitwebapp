'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BILLING_CYCLES, BROWSERS, CATEGORIES, IMPACTS, INSTALL_METHODS, MAX_FILE_BYTES, MAX_FILES, PLANS, PLATFORMS, ROLES,
  SOURCES, findCategory, resolveTeam,
} from '@/lib/supportForm';

type Result = { ticketId: string; assignedTeam: string; ccTeams: string[]; priority: string; delivered: boolean };

const input =
  'w-full rounded-lg border border-[#e1e3e7] bg-white px-3 py-2.5 text-[15px] text-[#0A081B] outline-none transition focus:border-[#262E84] focus:ring-2 focus:ring-[#262E84]/15';
const inputErr = 'border-[#b03240] focus:border-[#b03240] focus:ring-[#b03240]/15';

function Field({
  label, name, required, error, hint, children, full,
}: { label: string; name: string; required?: boolean; error?: string; hint?: ReactNode; children: ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-[#0A081B]">
        {label}
        {required ? <span className="text-[#b03240]"> *</span> : <span className="font-normal text-[#5f6a8f]"> (optional)</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-[#b03240]">{error}</p> : hint ? <p className="mt-1 text-xs text-[#5f6a8f]">{hint}</p> : null}
    </div>
  );
}

function Select({ name, options, value, onChange, error, placeholder = 'Select…' }: {
  name: string; options: string[]; value: string; onChange: (v: string) => void; error?: string; placeholder?: string;
}) {
  return (
    <select id={name} name={name} value={value} onChange={(e) => onChange(e.target.value)} className={`${input} ${error ? inputErr : ''}`}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[#e1e3e7] pt-6 first:border-t-0 first:pt-0">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#5f6a8f]">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function SupportForm() {
  const params = useSearchParams();
  const sourceParam = (params.get('source') || '').toLowerCase();
  const source = SOURCES.includes(sourceParam) ? sourceParam : 'website';

  const [v, setV] = useState<Record<string, string>>({});
  const [allowAccess, setAllowAccess] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string) => (val: string) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errors[k]) setErrors((p) => { const n = { ...p }; delete n[k]; return n; });
  };
  const text = (k: string) => ({
    id: k, name: k, value: v[k] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k)(e.target.value),
    className: `${input} ${errors[k] ? inputErr : ''}`,
  });

  const category = findCategory(v.category || '');
  const team = useMemo(() => (v.category ? resolveTeam(v.category, v.subCategory || '') : null), [v.category, v.subCategory]);

  function pickFiles(list: FileList | null) {
    const picked = Array.from(list || []);
    const next = [...files, ...picked].slice(0, MAX_FILES);
    const tooBig = next.find((f) => f.size > MAX_FILE_BYTES);
    setErrors((p) => {
      const n = { ...p };
      if (tooBig) n.attachments = `${tooBig.name} is larger than 10 MB.`;
      else if (files.length + picked.length > MAX_FILES) n.attachments = `Up to ${MAX_FILES} files.`;
      else delete n.attachments;
      return n;
    });
    setFiles(next.filter((f) => f.size <= MAX_FILE_BYTES));
    if (fileRef.current) fileRef.current.value = '';
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    const req = ['fullName', 'accountEmail', 'role', 'domains', 'platform', 'installMethod', 'plan', 'category', 'impact', 'subject', 'description'];
    req.forEach((k) => { if (!(v[k] || '').trim()) e[k] = 'Required.'; });
    if (category?.subs.length && !v.subCategory) e.subCategory = 'Required.';
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (v.accountEmail && !email.test(v.accountEmail.trim())) e.accountEmail = 'Enter a valid email.';
    if (v.replyToEmail && !email.test(v.replyToEmail.trim())) e.replyToEmail = 'Enter a valid email.';
    if (v.pageUrl && !/^https?:\/\//i.test(v.pageUrl.trim())) e.pageUrl = 'Start with http:// or https://';
    if (v.attachmentLink && !/^https?:\/\//i.test(v.attachmentLink.trim())) e.attachmentLink = 'Start with http:// or https://';
    if (!privacyConsent) e.privacyConsent = 'Please agree so we can handle your request.';
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setFormError('Please fix the highlighted fields.');
      document.getElementById(Object.keys(e)[0])?.focus();
      return;
    }
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => fd.append(k, val));
    fd.append('allowAccess', String(allowAccess));
    fd.append('privacyConsent', String(privacyConsent));
    fd.append('source', source);
    fd.append('referrer', document.referrer || '');
    try { fd.append('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || ''); } catch { /* ignore */ }
    files.forEach((f) => fd.append('attachments', f));

    setSubmitting(true);
    try {
      const res = await fetch('/api/support-ticket', { method: 'POST', body: fd });
      const data = (await res.json().catch(() => ({}))) as Partial<Result> & {
        success?: boolean; error?: string; fields?: Record<string, string>;
      };
      if (!res.ok || !data.success) {
        if (data.fields) setErrors(data.fields);
        setFormError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setResult(data as Result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#262E84]/10 text-2xl text-[#262E84]">✓</div>
          <h1 className="font-[family-name:var(--font-funnel-display)] text-2xl font-semibold text-[#0A081B]">Request received</h1>
          <p className="mt-2 text-[15px] text-[#5f6a8f]">
            Ticket <strong className="text-[#0A081B]">#{result.ticketId}</strong> has been sent to our{' '}
            <strong className="text-[#0A081B]">{result.assignedTeam}</strong> team. We&apos;ll reply to your email.
          </p>
          {!result.delivered && (
            <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-left text-sm text-amber-900">
              <strong>Test mode:</strong> this was validated but not sent anywhere — ClickUp and email are not connected yet.
              <div className="mt-2 text-amber-800">
                Priority: {result.priority}
                {result.ccTeams.length ? ` · Also notify: ${result.ccTeams.join(', ')}` : ''}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => { setResult(null); setV({}); setFiles([]); setAllowAccess(false); setPrivacyConsent(false); }}
            className="mt-6 rounded-lg border border-[#e1e3e7] px-4 py-2 text-sm font-medium text-[#0A081B] hover:bg-gray-50"
          >
            Submit another request
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-[family-name:var(--font-funnel-display)] text-2xl font-semibold text-[#0A081B] sm:text-3xl">Contact support</h1>
      <p className="mt-1.5 text-[15px] text-[#5f6a8f]">Tell us what&apos;s going on and the right team will get back to you by email.</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-6">
        <Section title="Contact details">
          <Field label="Full name" name="fullName" required error={errors.fullName}>
            <input {...text('fullName')} autoComplete="name" maxLength={120} />
          </Field>
          <Field label="Account email" name="accountEmail" required error={errors.accountEmail} hint="The email you log in to ConsentBit with.">
            <input {...text('accountEmail')} type="email" autoComplete="email" maxLength={254} />
          </Field>
          <Field label="Reply-to email" name="replyToEmail" error={errors.replyToEmail} hint="If replies should go to a different address.">
            <input {...text('replyToEmail')} type="email" maxLength={254} />
          </Field>
          <Field label="Company / organization" name="company">
            <input {...text('company')} autoComplete="organization" maxLength={160} />
          </Field>
          <Field label="Your role" name="role" required error={errors.role}>
            <Select name="role" options={ROLES} value={v.role || ''} onChange={set('role')} error={errors.role} />
          </Field>
        </Section>

        <Section title="Account & site">
          <Field label="Website domain(s)" name="domains" required error={errors.domains} hint="e.g. example.com — separate several with commas.">
            <input {...text('domains')} placeholder="example.com" maxLength={500} />
          </Field>
          <Field label="Site ID" name="siteId" hint="Shown in your ConsentBit dashboard and install script.">
            <input {...text('siteId')} maxLength={100} />
          </Field>
          <Field label="Platform" name="platform" required error={errors.platform}>
            <Select name="platform" options={PLATFORMS} value={v.platform || ''} onChange={set('platform')} error={errors.platform} />
          </Field>
          <Field label="Installed via" name="installMethod" required error={errors.installMethod}>
            <Select name="installMethod" options={INSTALL_METHODS} value={v.installMethod || ''} onChange={set('installMethod')} error={errors.installMethod} />
          </Field>
          <Field label="Plan" name="plan" required error={errors.plan}>
            <Select name="plan" options={PLANS} value={v.plan || ''} onChange={set('plan')} error={errors.plan} />
          </Field>
          <Field label="Billing cycle" name="billingCycle">
            <Select name="billingCycle" options={BILLING_CYCLES} value={v.billingCycle || ''} onChange={set('billingCycle')} />
          </Field>
        </Section>

        <Section title="Your request">
          <Field label="Category" name="category" required error={errors.category}>
            <Select
              name="category"
              options={CATEGORIES.map((c) => c.label)}
              value={v.category || ''}
              onChange={(val) => { set('category')(val); setV((p) => ({ ...p, category: val, subCategory: '', invoiceNumber: '' })); }}
              error={errors.category}
            />
          </Field>
          {category?.subs.length ? (
            <Field label="Sub-category" name="subCategory" required error={errors.subCategory}>
              <Select name="subCategory" options={category.subs.map((s) => s.label)} value={v.subCategory || ''} onChange={set('subCategory')} error={errors.subCategory} />
            </Field>
          ) : <div className="hidden sm:block" />}

          {team && (
            <div className="sm:col-span-2 rounded-lg bg-[#262E84]/[0.06] px-4 py-3 text-sm text-[#262E84]" aria-live="polite">
              ➜ Your request will go to our <strong>{team}</strong> team.
            </div>
          )}

          {v.category === 'Billing & Subscription' && (
            <Field label="Invoice / receipt number" name="invoiceNumber" full>
              <input {...text('invoiceNumber')} maxLength={100} />
            </Field>
          )}

          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#0A081B]">How is this affecting you?<span className="text-[#b03240]"> *</span></span>
            <div id="impact" tabIndex={-1} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {IMPACTS.map((o) => (
                <label
                  key={o}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                    v.impact === o ? 'border-[#262E84] bg-[#262E84]/[0.04] text-[#0A081B]' : errors.impact ? 'border-[#b03240]' : 'border-[#e1e3e7] text-[#0A081B] hover:border-[#5f6a8f]'
                  }`}
                >
                  <input type="radio" name="impact" value={o} checked={v.impact === o} onChange={() => set('impact')(o)} className="accent-[#262E84]" />
                  {o}
                </label>
              ))}
            </div>
            {errors.impact && <p className="mt-1 text-xs text-[#b03240]">{errors.impact}</p>}
          </div>

          <Field label="Subject" name="subject" required error={errors.subject} full>
            <input {...text('subject')} maxLength={100} />
          </Field>
          <Field label="Description" name="description" required error={errors.description} full>
            <textarea {...text('description')} rows={6} maxLength={10000} placeholder={category?.hint || 'Tell us what you need help with.'} />
          </Field>
          <Field label="Page URL where it happens" name="pageUrl" error={errors.pageUrl}>
            <input {...text('pageUrl')} type="url" placeholder="https://example.com/page" maxLength={2000} />
          </Field>
          <Field label="When did it start?" name="startedOn">
            <input {...text('startedOn')} type="date" max={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Browser / device" name="browser">
            <Select name="browser" options={BROWSERS} value={v.browser || ''} onChange={set('browser')} />
          </Field>
          <Field label="Video / screenshot link" name="attachmentLink" error={errors.attachmentLink} hint="Loom, Google Drive, etc.">
            <input {...text('attachmentLink')} type="url" placeholder="https://www.loom.com/share/…" maxLength={2000} />
          </Field>

          <Field label="Attachments" name="attachments" error={errors.attachments} hint={`Up to ${MAX_FILES} files, 10 MB each.`} full>
            <input
              ref={fileRef}
              id="attachments"
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.txt,.har,.json"
              onChange={(e) => pickFiles(e.target.files)}
              disabled={files.length >= MAX_FILES}
              className="block w-full text-sm text-[#5f6a8f] file:mr-3 file:rounded-md file:border-0 file:bg-[#262E84]/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#262E84] hover:file:bg-[#262E84]/15"
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-sm text-[#0A081B]">
                    <span className="truncate">{f.name} <span className="text-[#5f6a8f]">({(f.size / 1024 / 1024).toFixed(1)} MB)</span></span>
                    <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="ml-3 text-[#b03240] hover:underline">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </Field>
        </Section>

        <section className="space-y-3 border-t border-[#e1e3e7] pt-6">
          <label className="flex items-start gap-2.5 text-sm text-[#0A081B]">
            <input type="checkbox" checked={allowAccess} onChange={(e) => setAllowAccess(e.target.checked)} className="mt-0.5 accent-[#262E84]" />
            Allow ConsentBit support to access my account and site to debug this issue.
          </label>
          <label id="privacyConsent" tabIndex={-1} className="flex items-start gap-2.5 text-sm text-[#0A081B]">
            <input
              type="checkbox"
              checked={privacyConsent}
              onChange={(e) => { setPrivacyConsent(e.target.checked); if (e.target.checked) setErrors((p) => { const n = { ...p }; delete n.privacyConsent; return n; }); }}
              className="mt-0.5 accent-[#262E84]"
            />
            <span>
              I agree to ConsentBit processing my data to handle this request, as described in the{' '}
              <a href="https://www.consentbit.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#0777e6] underline">Privacy Policy</a>.
              <span className="text-[#b03240]"> *</span>
            </span>
          </label>
          {errors.privacyConsent && <p className="text-xs text-[#b03240]">{errors.privacyConsent}</p>}
        </section>

        {formError && <div className="rounded-lg border border-[#b03240]/30 bg-[#b03240]/5 px-4 py-3 text-sm text-[#b03240]" role="alert">{formError}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#262E84] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1d2468] disabled:opacity-60 sm:w-auto"
        >
          {submitting ? 'Sending…' : 'Submit request'}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-10 font-[family-name:var(--font-dm-sans)] sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-lg font-bold tracking-tight text-[#262E84]">ConsentBit</div>
        <div className="rounded-2xl border border-[#e1e3e7] bg-white p-6 shadow-sm sm:p-10">{children}</div>
      </div>
    </main>
  );
}
