"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PaymentDone from "@/components/animations//PaymentDone";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PaymentDetails {
  domain: string;
  amount: string;
  currency: string;
  transaction_id: string;
  plan_id: string;
  plan_type: string;
  interval: string;
  invoice_id: string;
  invoice_url: string;
  customer_email: string;
  payment_status: string;
  date_of_purchase: string;
}

const EMPTY_DETAILS: PaymentDetails = {
  domain: "",
  amount: "",
  currency: "",
  transaction_id: "",
  plan_id: "",
  plan_type: "",
  interval: "",
  invoice_id: "",
  invoice_url: "",
  customer_email: "",
  payment_status: "",
  date_of_purchase: "",
};
// ─────────────────────────────────────────────────────────────────────────────

function normalizeDomain(raw: string): string {
  const v = String(raw || "").trim();
  if (!v) return "";
  const noProto = v.replace(/^https?:\/\//i, "");
  const noWww = noProto.replace(/^www\./i, "");
  const hostOnly = noWww.split("/")[0].split("?")[0].split("#")[0];
  return hostOnly.replace(/\.+$/, "").toLowerCase();
}

export function PostSetupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dashUrl, setDashUrl] = useState<string | null>(null);
  // ─── NEW: holds all payment details parsed from the URL ───────────────────
  const [details, setDetails] = useState<PaymentDetails>(EMPTY_DETAILS);
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    // ── 1. Parse domain / routing params ──────────────────────────────────
    const domain = normalizeDomain(params.get("domain") || "");
    const siteId = String(params.get("siteId") || "").trim();
    const returnToRaw = String(params.get("returnTo") || "").trim();
    const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/dashboard";

    if (!domain && !siteId) {
      router.replace("/dashboard");
      return;
    }

    // ── 2. Build the dashboard redirect URL ───────────────────────────────
    const base = returnTo.startsWith("/dashboard") ? returnTo : "/dashboard";
    const url = new URL(base, window.location.origin);
    url.searchParams.set("postSetup", "1");
    if (domain) url.searchParams.set("domain", domain);
    else url.searchParams.set("siteId", siteId);
    setDashUrl(url.pathname + url.search + (url.hash || ""));

    // ── 3. Parse all payment detail params from URL ───────────────────────
    const parsed: PaymentDetails = {
      domain,
      amount:           params.get("amount")          ?? "",
      currency:         params.get("currency")         ?? "",
      transaction_id:   params.get("transaction_id")  ?? "",
      plan_id:          params.get("plan_id")          ?? "",
      plan_type:        params.get("plan_type")        ?? "",
      interval:         params.get("interval")         ?? "",
      invoice_id:       params.get("invoice_id")       ?? "",
      invoice_url:      params.get("invoice_url")      ?? "",
      customer_email:   params.get("email")            ?? "",
      payment_status:   params.get("payment_status")   ?? "",
      date_of_purchase: params.get("date")             ?? "",
    };
    setDetails(parsed);
    console.log("[PostSetup] Payment details:", parsed);
    // ─────────────────────────────────────────────────────────────────────

    // ── 4. Pre-write storage so the opener tab can pick it up ─────────────
    try {
      localStorage.setItem(
        "cb_post_setup",
        JSON.stringify({ domain, siteId, returnTo, ts: Date.now() })
      );
    } catch {
      // ignore — storage blocked in some contexts
    }
  }, [router, searchParams]);

  const handleContinue = useCallback(() => {
    if (!dashUrl) return;

    // Best case: navigate the original tab and close this one.
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.location.replace(dashUrl);
        window.close();
        return;
      }
    } catch {
      // cross-origin or blocked — fall through
    }

    // Fallback: navigate this tab directly.
    router.replace(dashUrl);
  }, [dashUrl, router]);

  return (
    <div className="min-h-screen bg-[#E6F1FD] flex flex-col items-center justify-center gap-6">
      {/* Payment success animation — receives the full details object */}
      <PaymentDone details={details} OnClick={handleContinue} />

      {/* CTA block fades in once dashUrl is resolved */}
      <div
        className={`flex flex-col items-center gap-4 transition-all duration-500 ${
          dashUrl ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <div className="text-center">
          <p className="text-[18px] font-semibold text-[#111827]">
            Payment successful!
          </p>
          <p className="text-sm text-[#6b7280] mt-1">
            Your site is ready. Head to the dashboard to install the banner.
          </p>
          {/* Optionally surface key receipt info */}
          {details.customer_email && (
            <p className="text-xs text-[#9ca3af] mt-1">
              Receipt sent to{" "}
              <span className="font-medium text-[#6b7280]">
                {details.customer_email}
              </span>
            </p>
          )}
          {details.invoice_url && (
            <a
              href={details.invoice_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#007AFF] underline mt-1 inline-block"
            >
              View invoice
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!dashUrl}
          className="px-8 py-3 bg-[#007AFF] text-white rounded-[8px] font-semibold text-[15px] hover:bg-[#005FCC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          Go to Dashboard
        </button>

        <p className="text-xs text-[#9ca3af]">
          You can also close this tab manually.
        </p>
      </div>
    </div>
  );
}
