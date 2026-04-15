"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PaymentDone from "../animation/components/PaymentDone";
import { firstSetup } from "@/lib/client-api";

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

  const domain = normalizeDomain(searchParams?.get("domain") || "");
  const urlSiteId = String(searchParams?.get("siteId") || "").trim();
  const returnToRaw = String(searchParams?.get("returnTo") || "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/dashboard";

  const [paymentDetails, setPaymentDetails] = useState<Record<string, string>>({});
  // siteId resolved by firstSetup(); starts with whatever the URL already has
  const [resolvedSiteId, setResolvedSiteId] = useState<string>(urlSiteId);
  const redirected = useRef(false);
  const setupCalled = useRef(false);

  // Read payment details from URL params (appended by the worker redirect handler)
  useEffect(() => {
    const p = searchParams;
    setPaymentDetails({
      amount:           p?.get("amount")           ?? "",
      currency:         p?.get("currency")          ?? "",
      transaction_id:   p?.get("transaction_id")    ?? "",
      plan_id:          p?.get("plan_id")            ?? "",
      plan_type:        p?.get("plan_type")          ?? "",
      interval:         p?.get("interval")           ?? "",
      invoice_id:       p?.get("invoice_id")         ?? "",
      invoice_url:      p?.get("invoice_url")        ?? "",
      customer_email:   p?.get("email")              ?? "",
      payment_status:   p?.get("payment_status")     ?? "",
      date_of_purchase: p?.get("date")               ?? "",
    });
  }, [searchParams]);

  // Call firstSetup in the background so we have the real siteId ready before the user clicks Skip.
  // This mirrors the upgrade page: it already has a siteId, we resolve ours here.
  useEffect(() => {
    if (!domain || setupCalled.current) return;
    setupCalled.current = true;
    firstSetup({ websiteUrl: domain })
      .then((result) => {
        const sid = String(result?.siteId ?? result?.site?.id ?? "").trim();
        if (sid) setResolvedSiteId(sid);
      })
      .catch(() => {
        // If firstSetup fails, doRedirect falls back to domain flow
      });
  }, [domain]);

  function doRedirect() {
    if (redirected.current) return;
    redirected.current = true;

    if (!domain && !urlSiteId) {
      // router.replace("/dashboard");
      return;
    }

    // Build the post-setup URL. Use siteId when resolved (like upgrade page going to /dashboard/${siteId}),
    // fall back to domain so PostSetupOverlay can call firstSetup itself.
    const base = returnTo.startsWith("/dashboard") ? returnTo : "/dashboard";
    const url = new URL(base, window.location.origin);
    url.searchParams.set("postSetup", "1");
    if (resolvedSiteId) {
      url.searchParams.set("siteId", resolvedSiteId);
    } else if (domain) {
      url.searchParams.set("domain", domain);
    } else {
      url.searchParams.set("siteId", urlSiteId);
    }
    const dashUrl = url.pathname + url.search + (url.hash || "");

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.location.replace(dashUrl);
        window.close();
        return;
      }
    } catch {
      // ignore and fall back
    }

    // Hard navigation so PostSetupOverlay mounts fresh with the correct URL params
    window.location.href = dashUrl;
  }

  // Auto-redirect after 6 seconds
  useEffect(() => {
    const t = setTimeout(doRedirect, 6000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  console.log("Payment details post-setup:", paymentDetails);

  return <PaymentDone details={paymentDetails} OnClick={doRedirect} />;
}
