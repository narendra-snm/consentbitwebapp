'use client';

// Shared building blocks for the Legal pages (hub, Privacy Policy wizard, Cookie Policy and
// Terms wizards), following the Claude Design "ConsentBit Pages" screens: breadcrumb, page
// head, the step rail + form card shell, checkbox cards, chips, segmented controls, radio
// cards, the review summary and the publish-method picker.

import Link from 'next/link';
import { createContext, useContext, useState, type ReactNode } from 'react';

// ── class names ─────────────────────────────────────────────────────────────

export const inputCls =
  'w-full h-10 px-3 rounded-lg border-0 bg-white text-sm text-[#111827] outline-none shadow-[inset_0_0_0_1px_#E5E5E5] placeholder:text-[#848199] focus:shadow-[inset_0_0_0_1px_#007AFF,0_0_0_3px_#6790EA1A] disabled:bg-[#F9F9FA]';
export const selectCls = `${inputCls} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%234B5563' stroke-width='1.5'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_12px_center] pr-8`;
export const textareaCls =
  'w-full min-h-[84px] px-3 py-2.5 rounded-lg border-0 bg-white text-sm leading-5 text-[#111827] outline-none shadow-[inset_0_0_0_1px_#E5E5E5] placeholder:text-[#848199] focus:shadow-[inset_0_0_0_1px_#007AFF,0_0_0_3px_#6790EA1A] disabled:bg-[#F9F9FA] resize-y';
export const btn =
  'h-10 px-4 rounded-md inline-flex items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition';
export const btnPrimary = `${btn} bg-[#007AFF] text-white hover:brightness-[.94]`;
export const btnPlain = `${btn} bg-white text-[#111827] shadow-[inset_0_0_0_1px_#E5E5E5] hover:bg-[#F9F9FA]`;
export const btnGreen = `${btn} bg-[#2EC04F] text-white hover:brightness-[.94]`;
export const btnDanger = `${btn} bg-[#AC2734] text-white hover:brightness-[.94]`;
export const card = 'rounded-[10px] bg-white shadow-[inset_0_0_0_1px_#E5E5E5]';
export const codeBox =
  'rounded-lg bg-[#F9F9FA] shadow-[inset_0_0_0_1px_#E5E5E5] px-3.5 py-2.5 text-[13px] leading-5 text-[#111827] font-mono break-all whitespace-pre-wrap max-h-44 overflow-auto';

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** True inside a wizard the viewer may only read (team Members). Div-based controls ignore clicks. */
export const ReadOnlyCtx = createContext(false);

export function CheckIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

// ── page furniture ──────────────────────────────────────────────────────────

export function PageWrap({ children }: { children: ReactNode }) {
  return (
    <div className="w-full bg-white px-4 md:px-8 pt-8 pb-12">
      <div className="max-w-[1148px] mx-auto flex flex-col gap-5">{children}</div>
    </div>
  );
}

export function Crumb({ items }: { items: { label: string; href?: string; onClick?: () => void }[] }) {
  return (
    <nav className="flex gap-1.5 text-xs text-[#4B5563] whitespace-nowrap -mb-2" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={i} className="flex gap-1.5">
          {i > 0 && <span>/</span>}
          {it.href ? (
            <Link href={it.href} className="hover:text-[#007AFF]">
              {it.label}
            </Link>
          ) : it.onClick ? (
            <button type="button" onClick={it.onClick} className="hover:text-[#007AFF] cursor-pointer">
              {it.label}
            </button>
          ) : (
            <em className="not-italic text-[#111827]">{it.label}</em>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHead({ title, lede, right }: { title: string; lede?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
      <div>
        <h1 className="text-[25px] font-semibold tracking-[-1px] text-black">{title}</h1>
        {lede && <p className="text-base leading-[22px] text-[#4B5563] mt-2 max-w-[820px]">{lede}</p>}
      </div>
      {right}
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: 'new' | 'prog' | 'done' | 'late'; children: ReactNode }) {
  const cls = {
    new: 'bg-[#E6F1FD] text-[#007AFF]',
    prog: 'bg-[#EDEEFC] text-[#5243C2]',
    done: 'bg-[#2EC04F1A] text-[#118A41]',
    late: 'bg-[#FFEFEF] text-[#AC2734]',
  }[tone];
  return <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium ${cls}`}>{children}</span>;
}

/** "Live · Version 1, published 3 Nov 2026 · View" box next to the page head. */
export function LiveBox({ versions, publicUrl, draftSavedAt }: { versions: { version: number; publishedAt: string }[]; publicUrl?: string | null; draftSavedAt?: string | null }) {
  const live = versions[0];
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-[#4B5563] whitespace-nowrap px-3 py-2 rounded-lg shadow-[inset_0_0_0_1px_#E5E5E5] self-start">
      {live ? (
        <>
          <StatusPill tone="done">Live</StatusPill>
          <span>
            Version {live.version}, published {fmtDate(live.publishedAt)}
          </span>
          {publicUrl && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-[#007AFF] hover:underline">
              View
            </a>
          )}
        </>
      ) : (
        <>
          <StatusPill tone="new">Draft</StatusPill>
          <span>{draftSavedAt ? `Not published yet · draft saved ${fmtDate(draftSavedAt)}` : 'Not published yet'}</span>
        </>
      )}
    </div>
  );
}

export function Gate({ siteId, title = 'Available on Essential and Growth', text }: { siteId: string; title?: string; text: string }) {
  return (
    <div className={`${card} p-6 bg-[#F9F9FA]`}>
      <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
      <p className="text-[#4B5563] mt-1">{text}</p>
      <Link href={`/dashboard/${siteId}/upgrade`} className={`${btnPrimary} mt-4`}>
        Upgrade
      </Link>
    </div>
  );
}

export function Notice({ tone, text, problems }: { tone: 'ok' | 'error' | 'warn'; text: ReactNode; problems?: string[] }) {
  const cls = tone === 'ok' ? 'bg-[#2EC04F1A] text-[#118A41]' : tone === 'warn' ? 'bg-[#FFF6E6] text-[#B06000]' : 'bg-[#FFEFEF] text-[#AC2734]';
  return (
    <div className={`rounded-lg px-3 py-2.5 text-[13px] leading-[18px] ${cls}`}>
      <p>{text}</p>
      {problems && problems.length > 0 && (
        <ul className="list-disc pl-5 mt-1">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── form controls ───────────────────────────────────────────────────────────

export function Field({ label, req, hint, children }: { label: string; req?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[#111827]">
        {label}
        {req && <span className="text-[#AC2734] ml-0.5">*</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-[#4B5563]">{hint}</span>}
    </label>
  );
}

export function Question({ title, req, hint, children }: { title: string; req?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[#111827]">
        {title}
        {req && <span className="text-[#AC2734] ml-0.5">*</span>}
      </span>
      {hint && <span className="text-xs text-[#4B5563]">{hint}</span>}
      {children}
    </div>
  );
}

/** Checkbox card. */
export function Ck({ on, label, sub, onClick }: { on: boolean; label: string; sub?: string; onClick: () => void }) {
  const ro = useContext(ReadOnlyCtx);
  const act = () => {
    if (!ro) onClick();
  };
  return (
    <div
      role="checkbox"
      aria-checked={on}
      aria-disabled={ro || undefined}
      tabIndex={0}
      onClick={act}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          act();
        }
      }}
      className={`flex gap-2.5 items-start px-3 py-2.5 rounded-lg select-none transition ${ro ? 'cursor-default' : 'cursor-pointer'} ${
        on ? 'bg-[#6790EA1A] shadow-[inset_0_0_0_1px_#007AFF]' : `shadow-[inset_0_0_0_1px_#E5E5E5] ${ro ? '' : 'hover:bg-[#F9F9FA]'}`
      }`}
    >
      <span className={`w-4 h-4 rounded mt-px shrink-0 grid place-items-center text-white ${on ? 'bg-[#007AFF]' : 'shadow-[inset_0_0_0_1.5px_#4B5563]'}`}>{on && <CheckIcon />}</span>
      <div>
        <span className="block text-sm leading-[18px] text-[#111827]">{label}</span>
        {sub && <span className="block text-xs leading-4 text-[#4B5563] mt-0.5">{sub}</span>}
      </div>
    </div>
  );
}

/** Pill chip, optionally removable. */
export function Chip({ on, label, title, onClick, onRemove }: { on: boolean; label: string; title?: string; onClick?: () => void; onRemove?: () => void }) {
  const ro = useContext(ReadOnlyCtx);
  return (
    <div
      role={onClick ? 'checkbox' : undefined}
      aria-checked={onClick ? on : undefined}
      tabIndex={onClick && !ro ? 0 : undefined}
      title={title}
      onClick={() => {
        if (!ro && onClick) onClick();
      }}
      onKeyDown={(e) => {
        if (onClick && !ro && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`h-8 px-3 rounded-full text-[13px] flex items-center gap-1.5 select-none ${onClick && !ro ? 'cursor-pointer' : ''} ${
        on ? 'bg-[#E6F1FD] text-[#007AFF]' : 'shadow-[inset_0_0_0_1px_#E5E5E5] text-[#111827] hover:shadow-[inset_0_0_0_1px_#9FBCE4]'
      }`}
    >
      {on && !onRemove && <CheckIcon />}
      {label}
      {onRemove && !ro && (
        <button type="button" aria-label={`Remove ${label}`} onClick={(e) => { e.stopPropagation(); onRemove(); }} className="border-0 bg-transparent text-inherit text-base leading-none pl-0.5 cursor-pointer">
          ×
        </button>
      )}
    </div>
  );
}

/** Segmented control, e.g. Yes / No. */
export function Seg({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
  const ro = useContext(ReadOnlyCtx);
  return (
    <div className="flex gap-1.5" role="radiogroup">
      {options.map(([k, label]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          disabled={ro}
          onClick={() => onChange(k)}
          className={`min-w-[80px] h-9 px-3 rounded-md text-sm border-0 cursor-pointer disabled:cursor-default ${
            value === k ? 'bg-[#6790EA1A] shadow-[inset_0_0_0_1px_#007AFF] text-[#007AFF]' : 'bg-white shadow-[inset_0_0_0_1px_#E5E5E5] text-[#111827]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Radio cards with a title and optional description. */
export function RadioCards({ value, options, onChange, cols = 2 }: { value: string; options: { k: string; label: string; sub?: string }[]; onChange: (v: string) => void; cols?: 1 | 2 | 3 }) {
  const ro = useContext(ReadOnlyCtx);
  const grid = cols === 3 ? 'md:grid-cols-3' : cols === 2 ? 'md:grid-cols-2' : '';
  return (
    <div className={`grid gap-2 ${grid}`} role="radiogroup">
      {options.map((o) => {
        const on = value === o.k;
        return (
          <div
            key={o.k}
            role="radio"
            aria-checked={on}
            tabIndex={ro ? -1 : 0}
            onClick={() => {
              if (!ro) onChange(o.k);
            }}
            onKeyDown={(e) => {
              if (!ro && (e.key === ' ' || e.key === 'Enter')) {
                e.preventDefault();
                onChange(o.k);
              }
            }}
            className={`flex gap-2.5 p-3 rounded-lg select-none ${ro ? '' : 'cursor-pointer hover:bg-[#F9F9FA]'} ${on ? 'bg-[#6790EA1A] shadow-[inset_0_0_0_1px_#007AFF] hover:bg-[#6790EA1A]' : 'shadow-[inset_0_0_0_1px_#E5E5E5]'}`}
          >
            {/* Ring (inset shadow) + dot (radial gradient) on ONE element, so both share the same centre at any zoom level. */}
            <span
              className="w-4 h-4 rounded-full shrink-0 mt-px"
              style={{
                boxShadow: `inset 0 0 0 1.5px ${on ? '#007AFF' : '#4B5563'}`,
                background: on ? 'radial-gradient(circle, #007AFF 0 4px, transparent 4.5px)' : undefined,
              }}
            />
            <div>
              <span className={`block text-sm font-semibold leading-[18px] ${on ? 'text-[#007AFF]' : 'text-[#111827]'}`}>{o.label}</span>
              {o.sub && <span className="block text-xs leading-4 text-[#4B5563] mt-0.5">{o.sub}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CopyButton({ text, label = 'Copy', className = btnPlain }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked; the text is visible to copy by hand */
    }
  };
  return (
    <button type="button" className={className} onClick={copy} disabled={!text}>
      {copied ? (
        <>
          <CheckIcon size={14} />
          Copied
        </>
      ) : (
        label
      )}
    </button>
  );
}

export function InfoBox({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'indigo' }) {
  return <div className={`text-[13px] leading-[18px] rounded-lg px-3 py-2.5 text-[#111827] ${tone === 'blue' ? 'bg-[#E8F3FF]' : 'bg-[#EDEEFC]'}`}>{children}</div>;
}

// ── review step ─────────────────────────────────────────────────────────────

export function SummaryRows({ rows }: { rows: { title: string; detail: string; onEdit: () => void }[] }) {
  return (
    <div className="flex flex-col rounded-lg shadow-[inset_0_0_0_1px_#E5E5E5]">
      {rows.map((r) => (
        <div key={r.title} className="flex items-center gap-3 px-3.5 py-3 border-b border-[#E5E5E5] last:border-b-0">
          <span className="w-5 h-5 rounded-full bg-[#2EC04F1A] text-[#118A41] grid place-items-center shrink-0">
            <CheckIcon />
          </span>
          <div className="flex-1 min-w-0">
            <b className="block text-sm font-medium text-[#111827]">{r.title}</b>
            <span className="text-xs text-[#4B5563]">{r.detail}</span>
          </div>
          <button type="button" onClick={r.onEdit} className="text-[13px] text-[#007AFF] bg-transparent border-0 cursor-pointer hover:underline">
            Edit
          </button>
        </div>
      ))}
    </div>
  );
}

export type PublishMethod = 'host' | 'embed' | 'html';

/** "How do you want to publish it?" — hosted link, embed script, or copied HTML. */
export function PublishOptions({
  method,
  onChange,
  publicUrl,
  embedSnippet,
  html,
  htmlBusy,
  published,
}: {
  method: PublishMethod;
  onChange: (m: PublishMethod) => void;
  publicUrl: string | null | undefined;
  embedSnippet: string | null | undefined;
  html: string;
  htmlBusy?: boolean;
  /** False until the first publish: the link and code only work after that. */
  published: boolean;
}) {
  const opts = [
    { k: 'host', label: 'Host with us', sub: 'We host it at a ConsentBit link and keep it up to date.' },
    { k: 'embed', label: 'Embed on your page', sub: 'Paste one script tag where the document should appear.' },
    { k: 'html', label: 'Copy the HTML', sub: 'Static copy. You update it yourself.' },
  ];
  const code = method === 'host' ? publicUrl || '' : method === 'embed' ? embedSnippet || '' : html;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[#111827]">How do you want to publish it?</span>
      <RadioCards value={method} options={opts} onChange={(v) => onChange(v as PublishMethod)} cols={3} />
      {published ? (
        <>
          <div className={`${codeBox} mt-1`}>{code || (htmlBusy ? 'Loading…' : '')}</div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={code} label={method === 'host' ? 'Copy link' : method === 'embed' ? 'Copy code' : 'Copy HTML'} className={btnPrimary} />
            {method === 'host' && publicUrl && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className={btnPlain}>
                Open
              </a>
            )}
          </div>
          <span className="text-xs text-[#4B5563]">
            {method === 'host'
              ? 'The hosted page always shows the current version. Nothing to install.'
              : method === 'embed'
                ? 'Shows the document inside a page on your own domain, using your site’s fonts. It updates by itself when you publish a new version.'
                : 'Plain HTML for your own page. It does not update by itself: copy it again after each publish.'}
          </span>
        </>
      ) : (
        <span className="text-xs text-[#4B5563] mt-1">Publish once and the link, embed code and HTML appear here.</span>
      )}
    </div>
  );
}

// ── wizard shell ────────────────────────────────────────────────────────────

export function WizardShell({
  steps,
  step,
  onStep,
  canJump,
  sections,
  sectionsLabel = 'Sections in your document',
  readOnly = false,
  children,
  bar,
}: {
  steps: string[];
  step: number;
  onStep: (i: number) => void;
  /** Whether a later step may be opened directly from the rail. */
  canJump: (i: number) => boolean;
  sections?: string[];
  sectionsLabel?: string;
  readOnly?: boolean;
  children: ReactNode;
  bar: ReactNode;
}) {
  return (
    <ReadOnlyCtx.Provider value={readOnly}>
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] items-start">
        <aside className={`${card} p-2.5 lg:sticky lg:top-4`}>
          <ol className="flex flex-col gap-0.5">
            {steps.map((t, i) => {
              const on = i === step;
              const past = i < step;
              const open = past || on || canJump(i);
              return (
                <li key={t}>
                  <button
                    type="button"
                    aria-current={on ? 'step' : undefined}
                    disabled={!open}
                    onClick={() => onStep(i)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-[9px] rounded-lg text-sm text-left border cursor-pointer disabled:cursor-default ${
                      on
                        ? 'bg-[#6790EA1A] border-[#007AFF] text-[#007AFF] font-medium'
                        : `border-transparent ${past ? 'text-[#111827]' : 'text-[#4B5563]'} ${open ? 'hover:bg-[#F9F9FA]' : ''}`
                    }`}
                  >
                    <span className={`w-[22px] h-[22px] rounded-full grid place-items-center text-xs font-semibold shrink-0 ${on ? 'bg-[#007AFF] text-white' : past ? 'bg-[#2EC04F1A] text-[#118A41]' : 'bg-[#F1F5F9]'}`}>
                      {past ? <CheckIcon /> : i + 1}
                    </span>
                    {t}
                  </button>
                </li>
              );
            })}
          </ol>
          {sections && sections.length > 0 && (
            <div className="mt-2.5 pt-3 px-2.5 pb-1 border-t border-[#E5E5E5] flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#111827] flex justify-between">
                {sectionsLabel} <i className="not-italic font-medium text-[#4B5563]">{sections.length}</i>
              </span>
              {sections.map((x) => (
                <span key={x} className="text-xs text-[#4B5563] pl-3 relative before:content-[''] before:absolute before:left-0.5 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-[#9FBCE4]">
                  {x}
                </span>
              ))}
            </div>
          )}
        </aside>
        <section className={`${card} flex flex-col min-w-0`}>
          <div className="px-5 pt-[18px]">
            <span className="text-xs text-[#4B5563]">
              Step {step + 1} of {steps.length}
            </span>
            <h2 className="text-lg font-semibold text-black mt-0.5">{steps[step]}</h2>
          </div>
          <div className="px-5 pt-[18px] pb-5 flex flex-col gap-5">{children}</div>
          {bar}
        </section>
      </div>
    </ReadOnlyCtx.Provider>
  );
}

export function StepBar({ onBack, backDisabled, status, error, primary }: { onBack: () => void; backDisabled?: boolean; status?: ReactNode; error?: string | null; primary?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-t border-[#E5E5E5] bg-[#F9F9FA] rounded-b-[10px]">
      <button type="button" className={btnPlain} disabled={backDisabled} onClick={onBack}>
        Back
      </button>
      <span className="flex-1 text-right text-xs text-[#4B5563] min-w-0 truncate">{error ? <span className="text-[#AC2734]">{error}</span> : status}</span>
      {primary}
    </div>
  );
}
