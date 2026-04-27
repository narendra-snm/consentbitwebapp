'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanId = 'basic' | 'essential' | 'growth';
type Interval = 'monthly' | 'yearly';

interface PlanConfig {
  name: string;
  monthly: number;
  yearly: number;
  yearlyTotal: number;
  domains: number;
  popular?: boolean;
  features: string[];
}

// ─── Plan config ──────────────────────────────────────────────────────────────

// Prices match app/dashboard/[id]/upgrade/page.tsx — monthly base; yearly = 20% off.
// Feature lists match the upgrade comparison grid (domains / scans / pageviews / IAB-TCF / compliance).
const PLANS: Record<PlanId, PlanConfig> = {
  basic: {
    name: 'Basic',
    monthly: 9,
    yearly: Math.round(9 * 0.8),
    yearlyTotal: Math.round(9 * 12 * 0.8),
    domains: 1,
    features: [
      '1 domain',
      '750 scans',
      '100,000 pageviews/month',
      'GDPR / CCPA compliance',
    ],
  },
  essential: {
    name: 'Essential',
    monthly: 20,
    yearly: Math.round(20 * 0.8),
    yearlyTotal: Math.round(20 * 12 * 0.8),
    domains: 1,
    popular: true,
    features: [
      '1 domain',
      '5,000 scans',
      '500,000 pageviews/month',
      '+ $0.49 / 10,000 extra pageviews',
      'IAB / TCF v2.2 included',
      'GDPR + CCPA compliance',
    ],
  },
  growth: {
    name: 'Growth',
    monthly: 56,
    yearly: Math.round(56 * 0.8),
    yearlyTotal: Math.round(56 * 12 * 0.8),
    domains: 1,
    features: [
      '1 domain',
      '10,000 scans (+ $0.49 / 10k extra)',
      '2,000,000 pageviews/month',
      '+ $0.39 / 10,000 extra pageviews',
      'IAB / TCF v2.2 included',
      'GDPR + CCPA compliance',
    ],
  },
};

const VALID_PLANS = new Set<PlanId>(['basic', 'essential', 'growth']);

// ─── Stripe setup ─────────────────────────────────────────────────────────────

const stripePromise = loadStripe("pk_test_51NxXT7JwcuG9163MasKBY9MLm1fn33uxmBZ487xb7DX0x4ZomZHzDxTMHWZSF7ym86m0s3bbSbWtTbbdRfvkVHxS00TTY6ocXB")

const STRIPE_STYLE = {
  style: {
    base: {
      fontSize: '14px',
      fontFamily: 'Arial, Helvetica, sans-serif',
      color: '#111827',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#dc2626' },
  },
};

// ─── Platform labels ──────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  framer: 'Framer',
  webflow: 'Webflow',
  wordpress: 'WordPress',
  shopify: 'Shopify',
  squarespace: 'Squarespace',
  wix: 'Wix',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function isValidDomain(v: string) {
  const d = cleanDomain(v);
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(d);
}

function cleanDomain(v: string) {
  return v.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase().trim();
}

/** Decode worker security-middleware envelope ({ d: "<base64 JSON>" }) — same as lib/client-api.ts. */
function decodeEnvelope(parsed: unknown): unknown {
  if (parsed && typeof parsed === 'object' && typeof (parsed as { d?: unknown }).d === 'string') {
    try {
      const binary = atob((parsed as { d: string }).d);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      /* fall through */
    }
  }
  return parsed;
}

async function parseApiResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return decodeEnvelope(JSON.parse(text)) as Record<string, unknown>;
  } catch {
    return {
      success: false,
      error: text.trimStart().startsWith('<') ? 'Something went wrong. Please try again.' : text,
    };
  }
}

function trialEndLabel() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function inputCls(hasError: boolean, disabled = false) {
  return [
    'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition',
    'focus:border-[#262E84] focus:ring-2 focus:ring-[#262E84]/20',
    hasError ? 'border-red-400' : 'border-gray-300',
    disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white',
  ].join(' ');
}

const stripeFieldCls =
  'rounded-lg border border-gray-300 px-3 py-2.5 transition focus-within:border-[#262E84] focus-within:ring-2 focus-within:ring-[#262E84]/20';

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-gray-700">{label}</label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

function FormSection({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#262E84] text-sm font-bold text-white">
          {n}
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Order summary ────────────────────────────────────────────────────────────

function OrderSummary({ planId, interval }: { planId: PlanId; interval: Interval }) {
  const plan = PLANS[planId];
  const price = interval === 'yearly' ? plan.yearly : plan.monthly;
  const firstCharge = trialEndLabel();

  const rows = [
    { label: plan.name, value: `$${price}/mo` },
    { label: 'Billing', value: interval === 'yearly' ? 'Yearly' : 'Monthly' },
    { label: 'Trial period', value: '14 days', pill: true },
    { label: 'Due today', value: '$0.00', bold: true },
    { label: 'First charge', value: `$${plan.monthly} on ${firstCharge}` },
  ];

  return (
    <div className="sticky top-6 space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <span className="inline-block rounded-full bg-[#262E84]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#262E84]">
          {plan.name} plan
        </span>

        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">${price}</span>
          <span className="text-sm text-gray-400">/month</span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">
          Free for 14 days — then ${plan.monthly}/mo
        </p>

        <div className="mt-4 divide-y divide-gray-100">
          {rows.map(row => (
            <div key={row.label} className="flex items-center justify-between py-1.5 text-xs">
              <span className="text-gray-500">{row.label}</span>
              {row.pill ? (
                <span className="rounded bg-green-100 px-1.5 py-0.5 font-semibold text-green-700">
                  {row.value}
                </span>
              ) : (
                <span className={row.bold ? 'font-bold text-gray-900' : 'text-gray-700'}>
                  {row.value}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs font-semibold text-gray-700">What&apos;s included</p>
          <ul className="space-y-1.5">
            {plan.features.map(f => (
              <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                <svg
                  className="mt-px h-3.5 w-3.5 shrink-0 text-green-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4">
          {[
            ['🛡️', '30-day money-back'],
            ['🔒', 'Your data is safe'],
            ['⚡', 'Load in under 3 seconds'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-2 text-xs text-gray-500">
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        <p className="text-xs text-gray-500">Trusted by 4,200+ websites</p>
        <div className="mt-1 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          <span className="ml-1 text-xs text-gray-500">340 reviews</span>
        </div>
      </div>
    </div>
  );
}

// ─── Countries ────────────────────────────────────────────────────────────────

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Netherlands',
  'Spain',
  'Italy',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Switzerland',
  'Austria',
  'Belgium',
  'Poland',
  'Portugal',
  'Ireland',
  'India',
  'Singapore',
  'Japan',
  'New Zealand',
  'South Africa',
  'Brazil',
  'Mexico',
  'Other',
];

// ─── Checkout form ────────────────────────────────────────────────────────────

interface CheckoutFormProps {
  email: string;
  domain: string;
  platform: string;
  planId: PlanId;
  interval: Interval;
  onPlanChange: (p: PlanId) => void;
  onIntervalChange: (i: Interval) => void;
}

function CheckoutForm({
  email: initEmail,
  domain: initDomain,
  platform,
  planId,
  interval,
  onPlanChange,
  onIntervalChange,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [email, setEmail] = useState(initEmail);
  const [domain, setDomain] = useState(initDomain);
  const [billingEmail, setBillingEmail] = useState(initEmail);
  const [separateBilling, setSeparateBilling] = useState(false);
  const [nameOnCard, setNameOnCard] = useState('');
  const [country, setCountry] = useState('United States');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  /** Read-only "synced account" card view when email + domain came pre-filled; toggled by "Change site". */
  const [editAccount, setEditAccount] = useState(!initEmail || !initDomain);

  function clearErr(field: string) {
    setFieldErrors(p => ({ ...p, [field]: '' }));
  }

  function handleEmailChange(v: string) {
    setEmail(v);
    clearErr('email');
    if (!separateBilling) setBillingEmail(v);
  }

  function handleSeparateBillingChange(checked: boolean) {
    setSeparateBilling(checked);
    if (!checked) setBillingEmail(email);
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!isValidEmail(email)) errs.email = 'Enter a valid email address.';
    if (!domain.trim()) errs.domain = 'Domain is required.';
    else if (!isValidDomain(domain)) errs.domain = 'Enter a valid domain, e.g. example.com';
    if (separateBilling && !isValidEmail(billingEmail))
      errs.billingEmail = 'Enter a valid billing email.';
    if (!nameOnCard.trim()) errs.nameOnCard = 'Name on card is required.';
    return errs;
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    if (!stripe || !elements) {
      setError('Payment not ready. Please wait a moment and try again.');
      return;
    }

    const cardEl = elements.getElement(CardNumberElement);
    if (!cardEl) {
      setError('Card details are incomplete.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { paymentMethod, error: pmErr } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardEl,
        billing_details: {
          email: separateBilling ? billingEmail.trim() : email.trim(),
          name: nameOnCard.trim(),
        },
      });

      if (pmErr) {
        setError(pmErr.message || 'Card error. Please check your details.');
        setIsSubmitting(false);
        return;
      }

      const cleanedDomain = cleanDomain(domain);

      // Phase 1 — create subscription
      const res = await fetch('https://consent-webapp-manager.web-8fb.workers.dev/api/custom-checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: paymentMethod!.id,
          email: email.trim().toLowerCase(),
          domain: cleanedDomain,
          siteName: cleanedDomain,
          planId,
          interval,
        }),
      });

      const data = (await parseApiResponse(res)) as {
        success: boolean;
        error?: string;
        requiresAction?: boolean;
        clientSecret?: string;
        subscriptionId?: string;
      };
console.log(data);
      if (!data.success) {
        setError(data.error || 'Something went wrong. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Phase 2 — 3D Secure confirmation required
      if (data.requiresAction && data.clientSecret) {
        const { error: confirmErr } = await stripe.confirmCardPayment(data.clientSecret);
        if (confirmErr) {
          setError(confirmErr.message || '3D Secure verification failed. Please try another card.');
          setIsSubmitting(false);
          return;
        }

        const res2 = await fetch('/api/custom-checkout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionId: data.subscriptionId,
            email: email.trim().toLowerCase(),
            domain: cleanedDomain,
            siteName: cleanedDomain,
            planId,
            interval,
          }),
        });

        const d2 = (await parseApiResponse(res2)) as { success: boolean; error?: string };
        
        if (!d2.success) {
          setError(d2.error || 'Account setup failed after payment. Please contact support.');
          setIsSubmitting(false);
          return;
        }
      }

      setShowSuccess(true);
      setIsSubmitting(false);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  }

  const platformLabel =
    PLATFORM_LABELS[platform.toLowerCase()] || (platform ? platform : '');

  return (
    <>
    {showSuccess && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">You&apos;re all set!</h2>
          <p className="mt-1.5 text-sm text-gray-600">
            Your 14-day free trial has started. No charge until {trialEndLabel()}.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard?postSetup=1')}
              className="w-full rounded-[10px] bg-[#262E84] py-3 text-sm font-semibold text-white transition hover:bg-[#1e246c]"
            >
              Go to dashboard →
            </button>
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="w-full rounded-[10px] border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Stay on this page
            </button>
          </div>
        </div>
      </div>
    )}
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Platform badge */}
      {/* {platformLabel && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#262E84] text-sm font-bold text-white">
            {platformLabel[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Installing from {platformLabel}
            </p>
            <p className="text-xs text-gray-500">
              Create an account below to save your config instantly at your domain.
            </p>
          </div>
        </div>
      )} */}

      {/* 1 — Your account */}
      <FormSection n={1} title="Your account">
        {!editAccount ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {platformLabel
                ? `We've set up your account automatically using your ${platformLabel} identity and site.`
                : "We've set up your account automatically using your identity and site."}
            </p>

            {/* Account email card */}
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Account email</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{email}</p>
              </div>
              <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                Verified
              </span>
            </div>

            {/* Domain card */}
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Domain</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{domain}</p>
              </div>
              {platformLabel && (
                <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-[#262E84]">
                  <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#262E84] text-white text-[9px] font-bold">
                    {platformLabel[0]}
                  </span>
                  {platformLabel}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500">
              {platformLabel
                ? `Synced from your connected ${platformLabel} site. `
                : 'Loaded from your session. '}
              <button
                type="button"
                onClick={() => setEditAccount(true)}
                className="font-semibold text-[#262E84] hover:underline"
              >
                Change site
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Your email" error={fieldErrors.email}>
              <input
                type="email"
                value={email}
                onChange={e => handleEmailChange(e.target.value)}
                placeholder="you@example.com"
                className={inputCls(!!fieldErrors.email)}
              />
            </Field>
            <Field
              label="Your domain"
              hint="Where ConsentBit will be installed, e.g. example.com"
              error={fieldErrors.domain}
            >
              <input
                type="text"
                value={domain}
                onChange={e => {
                  setDomain(e.target.value);
                  clearErr('domain');
                }}
                placeholder="example.com"
                className={inputCls(!!fieldErrors.domain)}
              />
            </Field>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                You&apos;ll be able to log in to your ConsentBit dashboard with this email.
              </p>
              {initEmail && initDomain && (
                <button
                  type="button"
                  onClick={() => setEditAccount(false)}
                  className="shrink-0 text-xs font-semibold text-[#262E84] hover:underline"
                >
                  Use synced account
                </button>
              )}
            </div>
          </div>
        )}
      </FormSection>

      {/* 2 — Billing contact */}
      <FormSection n={2} title="Billing contact">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            By default we send Stripe invoices to your account email. Uncheck to use a different address.
          </p>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={!separateBilling}
              onChange={e => handleSeparateBillingChange(!e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-[#262E84]"
            />
            <span className="font-medium">Use account email for billing as well</span>
          </label>
          <Field label="Billing email" error={fieldErrors.billingEmail}>
            <input
              type="email"
              value={billingEmail}
              disabled={!separateBilling}
              onChange={e => {
                setBillingEmail(e.target.value);
                clearErr('billingEmail');
              }}
              placeholder="billing@company.com"
              className={inputCls(!!fieldErrors.billingEmail, !separateBilling)}
            />
          </Field>
        </div>
      </FormSection>

      {/* 3 — Choose a plan */}
      <FormSection n={3} title="Choose a plan">
        {/* Interval toggle */}
        <div className="mb-4 flex w-fit items-center gap-0.5 rounded-lg bg-gray-100 p-1">
          {(['monthly', 'yearly'] as Interval[]).map(i => (
            <button
              key={i}
              type="button"
              onClick={() => onIntervalChange(i)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                interval === i
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {i === 'monthly' ? 'Monthly' : 'Yearly'}
              {i === 'yearly' && (
                <span className="ml-1.5 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                  SAVE 20%
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div className="space-y-2">
          {(Object.entries(PLANS) as [PlanId, PlanConfig][]).map(([id, p]) => {
            const active = planId === id;
            const price = interval === 'yearly' ? p.yearly : p.monthly;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onPlanChange(id)}
                className={`relative w-full rounded-xl border-2 p-4 text-left transition-all ${
                  active
                    ? 'border-[#262E84] bg-[#262E84]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-2.5 left-4 rounded-full bg-[#262E84] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Most popular
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                        active ? 'border-[#262E84]' : 'border-gray-300'
                      }`}
                    >
                      {active && <div className="h-2 w-2 rounded-full bg-[#262E84]" />}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          active ? 'text-[#262E84]' : 'text-gray-900'
                        }`}
                      >
                        {p.name}
                      </p>
                      {/* <p className="text-xs text-gray-400 invisible">
                        {p.domains} {p.domains === 1 ? 'domain' : 'domains'}
                      </p> */}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        active ? 'text-[#262E84]' : 'text-gray-900'
                      }`}
                    >
                      ${price}
                      <span className="text-xs font-normal text-gray-400">/mo</span>
                    </p>
                    {interval === 'yearly' && (
                      <p className="text-[10px] text-gray-400">billed ${p.yearlyTotal}/yr</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </FormSection>

      {/* 4 — Payment details */}
      <FormSection n={4} title="Payment details">
        <div className="space-y-3">
          {/* Card logos */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-11 items-center justify-center rounded border border-gray-200 bg-white">
              <span className="text-[10px] font-bold italic tracking-tight text-[#1a1f71]">
                VISA
              </span>
            </div>
            <div className="relative flex h-7 w-11 items-center justify-center rounded border border-gray-200 bg-white overflow-hidden">
              <div className="absolute left-2 h-4 w-4 rounded-full bg-[#eb001b]" />
              <div className="absolute left-4 h-4 w-4 rounded-full bg-[#f79e1b] opacity-90" />
            </div>
            <div className="flex h-7 w-11 items-center justify-center rounded border border-gray-200 bg-white">
              <span className="text-[10px] font-semibold tracking-tight text-[#6772e5]">
                stripe
              </span>
            </div>
          </div>

          <Field label="Card number">
            <div className={stripeFieldCls}>
              <CardNumberElement options={STRIPE_STYLE} />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry">
              <div className={stripeFieldCls}>
                <CardExpiryElement options={STRIPE_STYLE} />
              </div>
            </Field>
            <Field label="CVV">
              <div className={stripeFieldCls}>
                <CardCvcElement options={STRIPE_STYLE} />
              </div>
            </Field>
          </div>

          <Field label="Name on card" error={fieldErrors.nameOnCard}>
            <input
              type="text"
              value={nameOnCard}
              onChange={e => {
                setNameOnCard(e.target.value);
                clearErr('nameOnCard');
              }}
              placeholder="Jane Smith"
              className={inputCls(!!fieldErrors.nameOnCard)}
            />
          </Field>

          <Field label="Country">
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className={inputCls(false)}
            >
              {COUNTRIES.map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <button
          type="submit"
          disabled={isSubmitting || !stripe}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#262E84] py-3.5 text-base font-semibold text-white transition hover:bg-[#1e246c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Processing…
            </>
          ) : (
            'Start 14-day free trial →'
          )}
        </button>
        <p className="text-center text-xs text-gray-400">
          No charge for 14 days · Cancel anytime · Free during the trial
        </p>
      </div>
    </form>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CheckoutPageInner() {
  const params = useSearchParams();

  const rawPlan = params.get('plan') ?? 'essential';
  const rawInterval = params.get('interval') ?? 'monthly';

  const [planId, setPlanId] = useState<PlanId>(
    VALID_PLANS.has(rawPlan as PlanId) ? (rawPlan as PlanId) : 'essential',
  );
  const [interval, setInterval] = useState<Interval>(
    rawInterval === 'yearly' ? 'yearly' : 'monthly',
  );

  const email = (params.get('email') ?? '').trim().toLowerCase();
  const domain = cleanDomain(params.get('domain') ?? '');
  const platform = params.get('platform') ?? '';

  return (
    <div className="min-h-screen bg-[#f4f5f9] py-10 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img alt="Consentbit" className="mx-auto w-[100px] xl:w-[170px] h-auto" src="/images/ConsentBit-logo-Dark.png"></img>
        
       
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_340px]">
          {/* Form */}
          <div>
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <CheckoutForm
                  email={email}
                  domain={domain}
                  platform={platform}
                  planId={planId}
                  interval={interval}
                  onPlanChange={setPlanId}
                  onIntervalChange={setInterval}
                />
              </Elements>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <p className="text-sm text-red-600">
                  Payment system misconfigured — set{' '}
                  <code className="rounded bg-red-100 px-1 font-mono text-xs">
                    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                  </code>{' '}
                  in your environment.
                </p>
              </div>
            )}
          </div>

          {/* Summary — shows above form on mobile */}
          <div className="order-first lg:order-last">
            <OrderSummary planId={planId} interval={interval} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#262E84] border-t-transparent" />
        </div>
      }
    >
      <CheckoutPageInner />
    </Suspense>
  );
}
