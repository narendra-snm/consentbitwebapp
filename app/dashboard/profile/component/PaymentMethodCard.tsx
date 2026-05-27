"use client";

import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { updatePaymentMethod } from "@/lib/client-api";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// ─── Countries ──────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "AF", name: "Afghanistan" }, { code: "AL", name: "Albania" }, { code: "DZ", name: "Algeria" },
  { code: "AR", name: "Argentina" }, { code: "AM", name: "Armenia" }, { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" }, { code: "AZ", name: "Azerbaijan" }, { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" }, { code: "BE", name: "Belgium" }, { code: "BR", name: "Brazil" },
  { code: "BG", name: "Bulgaria" }, { code: "CA", name: "Canada" }, { code: "CL", name: "Chile" },
  { code: "CN", name: "China" }, { code: "CO", name: "Colombia" }, { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" }, { code: "CZ", name: "Czech Republic" }, { code: "DK", name: "Denmark" },
  { code: "EG", name: "Egypt" }, { code: "EE", name: "Estonia" }, { code: "ET", name: "Ethiopia" },
  { code: "FI", name: "Finland" }, { code: "FR", name: "France" }, { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" }, { code: "GH", name: "Ghana" }, { code: "GR", name: "Greece" },
  { code: "HK", name: "Hong Kong" }, { code: "HU", name: "Hungary" }, { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" }, { code: "ID", name: "Indonesia" }, { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" }, { code: "IT", name: "Italy" }, { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" }, { code: "KZ", name: "Kazakhstan" }, { code: "KE", name: "Kenya" },
  { code: "KR", name: "South Korea" }, { code: "KW", name: "Kuwait" }, { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" }, { code: "LT", name: "Lithuania" }, { code: "LU", name: "Luxembourg" },
  { code: "MY", name: "Malaysia" }, { code: "MT", name: "Malta" }, { code: "MX", name: "Mexico" },
  { code: "MA", name: "Morocco" }, { code: "NL", name: "Netherlands" }, { code: "NZ", name: "New Zealand" },
  { code: "NG", name: "Nigeria" }, { code: "NO", name: "Norway" }, { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" }, { code: "PE", name: "Peru" }, { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" }, { code: "PT", name: "Portugal" }, { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" }, { code: "RW", name: "Rwanda" }, { code: "SA", name: "Saudi Arabia" },
  { code: "SG", name: "Singapore" }, { code: "SK", name: "Slovakia" }, { code: "SI", name: "Slovenia" },
  { code: "ZA", name: "South Africa" }, { code: "ES", name: "Spain" }, { code: "LK", name: "Sri Lanka" },
  { code: "SE", name: "Sweden" }, { code: "CH", name: "Switzerland" }, { code: "TW", name: "Taiwan" },
  { code: "TZ", name: "Tanzania" }, { code: "TH", name: "Thailand" }, { code: "TR", name: "Turkey" },
  { code: "UG", name: "Uganda" }, { code: "UA", name: "Ukraine" }, { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" }, { code: "US", name: "United States" }, { code: "VN", name: "Vietnam" },
];

/** Accepts an ISO-2 code OR country name, returns an ISO-2 code */
function resolveCountryCode(input: string): string {
  if (!input || input === "Not available") return "US";
  const cleaned = input.trim();
  if (cleaned.length === 2) return cleaned.toUpperCase();
  const found = COUNTRIES.find(
    (c) => c.name.toLowerCase() === cleaned.toLowerCase() || c.code.toLowerCase() === cleaned.toLowerCase(),
  );
  return found?.code ?? "US";
}

/** Returns the display name for a code */
function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

// ─── Stripe element style ────────────────────────────────────────────────────

const ELEM_OPTS = {
  style: {
    base: {
      fontSize: "14px",
      color: "#111827",
      fontFamily: "DM Sans, system-ui, sans-serif",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#ef4444" },
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────

type PM = { brand: string; last4: string; exp_month: number; exp_year: number };

// ─── Inner card form (must live inside <Elements>) ───────────────────────────

interface CardFormProps {
  organizationId: string;
  defaultCountryCode: string;
  onSuccess: (pm: PM, country: string) => void;
  onCancel: () => void;
}

function CardForm({ organizationId, defaultCountryCode, onSuccess, onCancel }: CardFormProps) {
  const stripe   = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [country, setCountry]       = useState(defaultCountryCode || "US");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    try {
      const cardEl = elements.getElement(CardNumberElement);
      if (!cardEl) throw new Error("Card element not ready");

      // Create payment method directly — no setup intent required
      const { paymentMethod, error: pmErr } = await stripe.createPaymentMethod({
        type: "card",
        card: cardEl,
        billing_details: { address: { country } },
      });

      if (pmErr) { setError(pmErr.message || "Card declined"); return; }
      if (!paymentMethod?.id) { setError("Could not create payment method"); return; }

      // Attach to customer + set as default via worker
      const data = await updatePaymentMethod(organizationId, paymentMethod.id);
      onSuccess(data.paymentMethod, country);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 pt-5 border-t border-[#e5e7eb]">
      {error && (
        <div className="mb-4 rounded-[8px] bg-[#fef2f2] border border-[#fecaca] px-3 py-2.5 text-[12px] text-[#dc2626]">
          {error}
        </div>
      )}

      {/* Card number — position:relative so badges sit over the stripe iframe without collapsing it */}
      <div className="mb-4">
        <label className="block text-[13px] font-semibold text-[#111827] mb-1.5">
          Card number
        </label>
        <div className="relative border border-[#d1d5db] rounded-[8px] bg-white px-3 py-3 focus-within:border-[#007AFF] focus-within:ring-1 focus-within:ring-[#007AFF]/20 transition-all"
             style={{ paddingRight: '110px' }}>
          <CardNumberElement options={{ ...ELEM_OPTS, showIcon: false }} />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-[3px] pointer-events-none">
            <span className="px-[5px] py-[2px] rounded-[3px] text-[9px] font-black text-white bg-[#1a1f71] tracking-wide">VISA</span>
            <span className="px-[5px] py-[2px] rounded-[3px] text-[9px] font-black text-white bg-[#eb001b]">MC</span>
            <span className="px-[5px] py-[2px] rounded-[3px] text-[9px] font-black text-white bg-[#2e77bc]">AMEX</span>
            <span className="px-[5px] py-[2px] rounded-[3px] text-[9px] font-black text-white bg-[#e65c00]">DISC</span>
          </div>
        </div>
      </div>

      {/* Expiry + CVC */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[13px] font-semibold text-[#111827] mb-1.5">Expiration</label>
          <div className="border border-[#d1d5db] rounded-[8px] px-3 py-3 bg-white focus-within:border-[#007AFF] focus-within:ring-1 focus-within:ring-[#007AFF]/20 transition-all">
            <CardExpiryElement options={ELEM_OPTS} />
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-[#111827] mb-1.5">Security code</label>
          <div className="border border-[#d1d5db] rounded-[8px] px-3 py-3 bg-white focus-within:border-[#007AFF] focus-within:ring-1 focus-within:ring-[#007AFF]/20 transition-all">
            <CardCvcElement options={ELEM_OPTS} />
          </div>
        </div>
      </div>

      {/* Billing country */}
      <div className="mb-5">
        <label className="block text-[13px] font-semibold text-[#111827] mb-1.5">Billing country</label>
        <div className="relative">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full appearance-none border border-[#d1d5db] rounded-[8px] px-3 py-[11px] bg-white text-[14px] text-[#111827] outline-none focus:border-[#007AFF] cursor-pointer pr-8 transition-colors"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Terms */}
      <p className="text-[12px] text-[#6b7280] mb-4 leading-relaxed">
        By saving, you allow ConsentBit to charge this card for future invoices in line with their{" "}
        <a
          href="https://consentbit.com/terms"
          target="_blank"
          rel="noreferrer"
          className="text-[#007AFF] underline decoration-dotted"
        >
          terms
        </a>
        .
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Secured by Stripe */}
        <div className="flex items-center gap-1.5">
          <svg width="11" height="14" viewBox="0 0 11 14" fill="none">
            <path
              d="M9 6V4C9 2.067 7.433.5 5.5.5S2 2.067 2 4v2H.5a.5.5 0 00-.5.5V13a.5.5 0 00.5.5h10a.5.5 0 00.5-.5V6.5a.5.5 0 00-.5-.5H9zm-5 0V4a1.5 1.5 0 013 0v2H4z"
              fill="#9ca3af"
            />
          </svg>
          <span className="text-[12px] text-[#6b7280]">Secured by</span>
          <span className="inline-flex items-center h-[18px] px-[6px] bg-[#635bff] rounded-[3px] text-[10px] font-bold text-white tracking-[0.5px]">
            stripe
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="h-[38px] px-5 rounded-[8px] border border-[#e5e7eb] bg-white text-[13px] font-medium text-[#374151] hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || submitting}
            className="h-[38px] px-5 rounded-[8px] bg-[#1a2340] text-white text-[13px] font-semibold hover:bg-[#111827] disabled:opacity-60 transition-colors flex items-center gap-1.5"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                  <path d="M1 5L4.5 8.5L12 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Save card
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PaymentMethodCardProps {
  pm?: PM | null;
  organizationId?: string | null;
  billingCountry?: string;
  onUpdateSuccess?: (pm: PM) => void;
}

export default function PaymentMethodCard({
  pm,
  organizationId,
  billingCountry,
  onUpdateSuccess,
}: PaymentMethodCardProps) {
  const [currentPm, setCurrentPm]       = useState<PM | null | undefined>(pm);
  const [showForm, setShowForm]         = useState(false);
  const [success, setSuccess]           = useState(false);
  const [savedCountryCode, setSavedCountryCode] = useState<string>("");

  // Keep in sync if parent re-fetches billing summary
  useEffect(() => { setCurrentPm(pm); }, [pm]);

  const defaultCode = resolveCountryCode(billingCountry || "");

  const handleSuccess = (newPm: PM, country: string) => {
    setCurrentPm(newPm);
    setSavedCountryCode(country);   // remember what the user actually selected
    setShowForm(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 4000);
    onUpdateSuccess?.(newPm);
  };

  const brand         = currentPm?.brand?.toLowerCase() ?? "";
  const isVisa        = brand === "visa";
  const isMastercard  = brand === "mastercard";
  const isAmex        = brand === "amex" || brand === "american express";
  const expYear       = currentPm ? String(currentPm.exp_year).slice(-2) : "";
  // Prefer the country the user last selected in the form; fall back to server value
  const displayCountry = savedCountryCode
    ? countryName(savedCountryCode)
    : (billingCountry && billingCountry !== "Not available"
      ? countryName(resolveCountryCode(billingCountry))
      : (defaultCode !== "US" ? countryName(defaultCode) : ""));

  return (
    <div className="w-full max-w-[554px] bg-white border border-[#e5e7eb] rounded-[12px] p-5 shadow-sm">

      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-[#111827] leading-snug">Payment method</h3>
          <p className="text-[13px] text-[#6b7280] mt-0.5">
            {currentPm
              ? "Card on file. Used for all future invoices."
              : "No payment method on file."}
          </p>
        </div>

        {/* Action button — top-right, shown for both states when form is hidden */}
        {!showForm && organizationId && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 h-[34px] px-3 rounded-[8px] border border-[#e5e7eb] bg-white text-[13px] font-medium text-[#374151] hover:bg-gray-50 transition-colors shrink-0 ml-4"
          >
            <>
              {/* Pencil icon */}
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path
                  d="M9.2 1.3a1.5 1.5 0 012.5 1.5L4.1 10.4l-2.7.7.7-2.7L9.2 1.3z"
                  stroke="#374151"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Update card
            </>
          </button>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div className="mt-3 rounded-[8px] bg-[#f0fdf4] border border-[#bbf7d0] px-3 py-2 text-[12px] text-[#16a34a] flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1 7L4.5 10.5L12 2" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Payment method updated successfully.
        </div>
      )}

      {/* Current card display */}
      {currentPm && (
        <div className="flex items-center gap-3 mt-4">
          {/* Brand icon box */}
          <div className="w-[58px] h-[40px] rounded-[7px] bg-[#1a2340] flex items-center justify-center shrink-0">
            {isVisa && (
              <span
                className="text-[13px] font-black italic tracking-widest"
                style={{ color: "#f0b429" }}
              >
                VISA
              </span>
            )}
            {isMastercard && (
              <div className="flex items-center">
                <div className="w-[17px] h-[17px] rounded-full bg-[#eb001b]" />
                <div className="w-[17px] h-[17px] rounded-full bg-[#f79e1b] -ml-[7px]" />
              </div>
            )}
            {isAmex && (
              <span className="text-[10px] font-black text-white tracking-tight">AMEX</span>
            )}
            {!isVisa && !isMastercard && !isAmex && (
              <span className="text-[9px] font-bold text-white uppercase">{brand || "CARD"}</span>
            )}
          </div>

          {/* Card info */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-[#111827]">
                {brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "Card"} ending in {currentPm.last4}
              </span>
              <span className="text-[10px] font-semibold text-[#0d9488] bg-[#ccfbf1] px-[7px] py-[2px] rounded-full leading-none">
                DEFAULT
              </span>
            </div>
            <p className="text-[13px] text-[#0d9488] mt-0.5">
              Expires {currentPm.exp_month}/{expYear}
              {displayCountry ? ` · Billing country: ${displayCountry}` : ""}
            </p>
          </div>
        </div>
      )}


      {/* Inline Stripe card form */}
      {showForm && organizationId && (
        <Elements stripe={stripePromise}>
          <CardForm
            organizationId={organizationId}
            defaultCountryCode={defaultCode}
            onSuccess={handleSuccess}
            onCancel={() => setShowForm(false)}
          />
        </Elements>
      )}
    </div>
  );
}
