
"use client";




import { useParams, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"; // useRef kept for proceedRef
import { createCheckoutSession, upgradeSubscription, getBillingSummary, switchBillingInterval, previewSwitchInterval, type SwitchIntervalPreview } from "@/lib/client-api";
// NEW WORKFLOW (prorated in-place tier change) — kept for later. Re-add to the import above to re-enable:
//   previewChangeTier, changeTier, type ChangeTierPreview, type ChangeTierResult
import { resolvePlanTierForSiteContext } from "@/lib/dashboard-plan-tier";
import { useDashboardSession } from "../../DashboardSessionProvider";
import { analytics } from "@/lib/analytics";
import LoadingScreen from "@/components/animations/LoadingScreen";
import PaymentDone from "@/components/animations//PaymentDone";
/* NEW WORKFLOW (prorated in-place tier change) — Stripe Elements card entry, kept for later.
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Same publishable-key source and Elements setup as app/checkout/page.tsx.
const _pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = _pk ? loadStripe(_pk) : null;
const STRIPE_FIELD_STYLE = {
  style: {
    base: { fontSize: "14px", fontFamily: "Arial, Helvetica, sans-serif", color: "#111827", "::placeholder": { color: "#9ca3af" } },
    invalid: { color: "#dc2626" },
  },
};
*/

type Plan = "basic" | "essential" | "growth" | "free" | null;


/** Mail success animation shown after payment */
function MailSuccessAnimation() {
  return (
    <div className="relative flex items-center justify-center w-[160px] h-[160px]">
      {/* Outer pulsing ring */}
      <div className="absolute inset-0 rounded-full bg-[#6366f1]/10"
        style={{ animation: "mailPulse 1.8s ease-out infinite" }} />
      {/* Circle bg */}
      <div className="w-[140px] h-[140px] rounded-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#6366f1 0%,#4338ca 100%)" }}>
        {/* Envelope SVG */}
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none"
          style={{ animation: "mailBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          {/* Envelope body */}
          <rect x="8" y="18" width="48" height="34" rx="4" fill="white" fillOpacity="0.95"/>
          {/* Envelope flap */}
          <path d="M8 22l24 16 24-16" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          {/* Checkmark badge */}
          <circle cx="46" cy="44" r="10" fill="#22c55e"/>
          <path d="M41 44l3.5 3.5L51 40" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </div>
      <style>{`
        @keyframes mailPulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(1.25); opacity: 0; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes mailBounce {
          0%   { transform: scale(0.4) translateY(20px); opacity: 0; }
          100% { transform: scale(1)   translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function PricingTable() {
  const params = useParams();
  const siteId = params?.id != null ? String(params.id) : "";
  const router = useRouter();
  const { activeOrganizationId, loading: sessionLoading, refresh, effectivePlanId, sites } =
    useDashboardSession();

  /** Same rules as the dashboard header: per-site plan from dashboard-init, with org fallback only when appropriate. */
  const activeSite = useMemo(
    () => (Array.isArray(sites) ? sites : []).find((s: { id?: string }) => String(s?.id) === siteId) ?? null,
    [sites, siteId],
  );

  const currentTier = useMemo(() => {
    const raw = resolvePlanTierForSiteContext({
      activeSite,
      sites: Array.isArray(sites) ? sites : [],
      effectivePlanId,
    });
    return (raw || "free") as "free" | "basic" | "essential" | "growth";
  }, [activeSite, sites, effectivePlanId]);

  // Current billing interval of the active subscription (monthly/yearly). Needed so the grid
  // can tell "Basic monthly" apart from "Basic yearly" — otherwise both show as "Current Plan".
  const [currentInterval, setCurrentInterval] = useState<"monthly" | "yearly" | null>(null);
  const [switching, setSwitching] = useState(false);
  const billingInitialized = useRef(false);

  // Switch-interval confirm dialog (shows the prorated balance before charging the card on file)
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<"monthly" | "yearly" | null>(null);
  const [preview, setPreview] = useState<SwitchIntervalPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  /* NEW WORKFLOW (prorated in-place tier change) — state kept for later.
  // Tier change (upgrade/downgrade) confirm dialog — prorated amount shown before charging the card on file.
  const [showTierConfirm, setShowTierConfirm] = useState(false);
  const [tierTarget, setTierTarget] = useState<"basic" | "essential" | "growth" | null>(null);
  const [tierPreview, setTierPreview] = useState<ChangeTierPreview | null>(null);
  const [tierPreviewLoading, setTierPreviewLoading] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);
  const [committingTier, setCommittingTier] = useState(false);
  // 'review' = show prorated amount; 'pay' = show the card form (upgrade only).
  const [tierStep, setTierStep] = useState<"review" | "pay">("review");

  // Prorated "due now" for the currently SELECTED plan (existing paid customers only),
  // shown live in the Total box as soon as a plan is selected.
  const [selProration, setSelProration] = useState<{ amountDueCents: number | null; currency: string; direction?: string } | null>(null);
  const [selProrationLoading, setSelProrationLoading] = useState(false);
  */

  useEffect(() => {
    if (!activeOrganizationId || currentTier === "free") return;
    let cancelled = false;
    (async () => {
      try {
        const summary = await getBillingSummary(activeOrganizationId, siteId || null);
        const iv = String(summary?.interval || "").toLowerCase();
        if (!cancelled && (iv === "monthly" || iv === "yearly")) {
          setCurrentInterval(iv);
          // Open the toggle on the site's actual interval (once) so a yearly site
          // doesn't land on the Monthly tab. Later manual toggles are preserved.
          if (!billingInitialized.current) {
            setBilling(iv);
            billingInitialized.current = true;
          }
        }
      } catch {
        /* ignore — falls back to tier-only behavior */
      }
    })();
    return () => { cancelled = true; };
  }, [activeOrganizationId, siteId, currentTier]);

  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const [paymentDetails, setPaymentDetails] = useState<Record<string, string>>({});

  // Step 11 — fire thank_you_page_viewed once when the success/confirmation view mounts
  // (covers both the Stripe return and the in-place upgrade receipt).
  const thankYouFiredRef = useRef(false);
  useEffect(() => {
    if (!paymentProcessing || thankYouFiredRef.current) return;
    thankYouFiredRef.current = true;
    analytics.thankYouPageViewed({
      site_id: siteId ? String(siteId) : undefined,
      plan_tier: paymentDetails.plan_id || paymentDetails.plan_type || undefined,
      billing_cycle:
        paymentDetails.interval === "yearly"
          ? "annual"
          : paymentDetails.interval || undefined,
    });
  }, [paymentProcessing, siteId, paymentDetails]);

  // After Stripe redirects back to this page with ?upgraded=1, poll until plan updates then go to dashboard.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") !== "1") return;
    // Clean URL so refresh doesn't re-trigger; also clear the stripe-redirect flag.
    window.history.replaceState({}, "", window.location.pathname);
    sessionStorage.removeItem(`cb_stripe_redirect_${siteId}`);
    // Read the target plan (keep in sessionStorage so DashboardSessionProvider polling can use it after redirect).
    const targetPlan = (sessionStorage.getItem(`cb_target_plan_${siteId}`) || "").trim().toLowerCase();
    // Clear session cache so polls fetch fresh plan data from the server.
    try {
      sessionStorage.removeItem("cbSessionCache");
    } catch {
      // ignore
    }
    // Capture and log payment details passed as URL params from the redirect handler
    const details = {
      amount:          params.get("amount")         ?? "",
      currency:        params.get("currency")        ?? "",
      transaction_id:  params.get("transaction_id") ?? "",
      plan_id:         params.get("plan_id")         ?? "",
      plan_type:       params.get("plan_type")       ?? "",
      interval:        params.get("interval")        ?? "",
      invoice_id:      params.get("invoice_id")      ?? "",
      invoice_url:     params.get("invoice_url")     ?? "",
      customer_email:  params.get("email")           ?? "",
      payment_status:  params.get("payment_status")  ?? "",
      date_of_purchase: params.get("date")           ?? "",
    };
    setPaymentDetails(details);
    setPaymentProcessing(true);
    let attempts = 0;
    let t: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      const planNow = String(await refresh({ showLoading: false }) ?? "").toLowerCase();
      attempts += 1;
      if (planNow !== targetPlan && attempts < 20) {
        t = setTimeout(poll, 1500);
      } else {
        // Use router.push so DashboardSessionProvider stays mounted and the updated
        // plan in React state is immediately visible in the header — no cache needed.
        // router.push(`/dashboard/${siteId}`);
      }
    };
    void poll();
    return () => { if (t) clearTimeout(t); };
  }, [refresh, siteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const CurrentPlanButton = () => (
    <button
      type="button"
      disabled
      className="bg-gray-400 text-[15px] text-white px-6 py-2 rounded-lg cursor-default  max-w-[200px]"
    >
      Current Plan
    </button>
  );

  const prices = {free: 0, basic: 9, essential: 20, growth: 56 };

  const proceedRef = useRef<HTMLDivElement>(null);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selected, setSelected] = useState<Plan>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoOn, setPromoOn] = useState(false);
  const [promoError, setPromoError] = useState(false);
  const [promoErrorMsg, setPromoErrorMsg] = useState("Invalid promo code. Please try again.");
  const [promoValidating, setPromoValidating] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    promotionCodeId: string | null;
    couponId: string;
    discount: {
      percentOff: number | null;
      amountOff: number | null;
      currency: string | null;
      name: string | null;
      duration: string | null;
      durationInMonths: number | null;
    };
  } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [returnedFromStripe, setReturnedFromStripe] = useState(false);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState(5);
  const [mounted, setMounted] = useState(false);


  // useLayoutEffect fires before the browser paints — check sessionStorage here so the
  // correct screen (cancel or upgrade) is shown on the very first paint with no flash.
  useLayoutEffect(() => {
    const key = `cb_stripe_redirect_${siteId}`;
    const params = new URLSearchParams(window.location.search);
    const isSuccess = params.get('upgraded') === '1' || params.get('canceled') === '1';
    const handleReturn = () => {
      setCheckoutLoading(false);
      setReturnedFromStripe(true);
      window.history.pushState(null, '', window.location.href);
    };
    if (sessionStorage.getItem(key) === '1') {
      sessionStorage.removeItem(key);
      // Only show cancel screen if NOT a successful/cancelled Stripe redirect.
      if (!isSuccess) handleReturn();
    }
    setMounted(true);
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        setCheckoutLoading(false);
        if (sessionStorage.getItem(key) === '1') {
          sessionStorage.removeItem(key);
          handleReturn();
        }
      }
    }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [siteId]);

  // Auto-dismiss "Payment not completed" screen after 5 seconds.
  useEffect(() => {
    if (!returnedFromStripe) return;
    setAutoCloseCountdown(5);
    const interval = setInterval(() => {
      setAutoCloseCountdown((n) => {
        if (n <= 1) {
          clearInterval(interval);
          setReturnedFromStripe(false);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [returnedFromStripe]);

  /* NEW WORKFLOW (prorated in-place tier change) — live "due now" fetch, kept for later.
  // When an existing paid customer selects a plan (or flips the interval / applies a coupon),
  // fetch the real prorated amount due now so the Total box reflects their current-plan credit.
  useEffect(() => {
    if (!selected || selected === "free" || currentTier === "free" || !activeOrganizationId) {
      setSelProration(null);
      setSelProrationLoading(false);
      return;
    }
    let cancelled = false;
    setSelProrationLoading(true);
    setSelProration(null);
    (async () => {
      try {
        const p = await previewChangeTier({
          organizationId: activeOrganizationId,
          siteId: siteId || null,
          planId: selected as "basic" | "essential" | "growth",
          interval: billing === "yearly" ? "yearly" : "monthly",
          promotionCodeId: appliedPromo?.promotionCodeId ?? null,
        });
        if (!cancelled) setSelProration({ amountDueCents: p.amountDueCents ?? null, currency: p.currency || "usd", direction: p.direction });
      } catch {
        if (!cancelled) setSelProration(null);
      } finally {
        if (!cancelled) setSelProrationLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected, billing, currentTier, activeOrganizationId, siteId, appliedPromo?.promotionCodeId]);
  */

  if (!mounted) return <div className="fixed inset-0 z-[9999] bg-white" />;


  const getPrice = (plan: keyof typeof prices) => {
    const mp = prices[plan];
    return billing === "yearly" ? Math.round(mp * 0.8) : mp;
  };

  const getYearlyText = (plan: keyof typeof prices) => {
    const mp = prices[plan];
    const yearly = Math.round(mp * 12 * 0.8);
    return `$${yearly} billed yearly`;
  };

  const calculateTotal = () => {
    if (!selected) return 0;
    const mp = prices[selected];
    let total = billing === "yearly" ? mp * 12 * 0.8 : mp;
    if (promoOn && appliedPromo) {
      if (appliedPromo.discount.percentOff != null) {
        total = total * (1 - appliedPromo.discount.percentOff / 100);
      } else if (appliedPromo.discount.amountOff != null) {
        total = Math.max(0, total - appliedPromo.discount.amountOff);
      }
    }
    return Math.round(total);
  };

  const discountLabel = () => {
    if (!appliedPromo) return "";
    if (appliedPromo.discount.percentOff != null) return `${appliedPromo.discount.percentOff}% off`;
    if (appliedPromo.discount.amountOff != null) return `$${appliedPromo.discount.amountOff} off`;
    return "Discount applied";
  };

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setPromoValidating(true);
    setPromoError(false);
    setPromoErrorMsg("");
    try {
      const res = await fetch("/api/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode: code }),
      });
      const data = await res.json() as {
        valid: boolean;
        error?: string;
        promotionCodeId?: string | null;
        couponId?: string;
        discount?: {
          percentOff: number | null;
          amountOff: number | null;
          currency: string | null;
          name: string | null;
          duration: string | null;
          durationInMonths: number | null;
        };
      };
      if (data.valid && data.couponId && data.discount) {
        setAppliedPromo({
          promotionCodeId: data.promotionCodeId ?? null,
          couponId: data.couponId,
          discount: data.discount,
        });
        setPromoOn(true);
        setPromoError(false);
      } else {
        setAppliedPromo(null);
        setPromoOn(false);
        setPromoError(true);
        setPromoErrorMsg(data.error || "Invalid promo code. Please try again.");
      }
    } catch {
      setAppliedPromo(null);
      setPromoOn(false);
      setPromoError(true);
      setPromoErrorMsg("Could not validate code. Please try again.");
    } finally {
      setPromoValidating(false);
    }
  };

  const total = calculateTotal();

  /* NEW WORKFLOW (prorated in-place tier change) — Total-box "due now" derivation, kept for later.
  // Show the prorated "due now" figure (instead of the plan sticker price) once an
  // existing paid customer has selected a plan.
  const showProrated = currentTier !== "free" && !!selected && selected !== "free";
  const proratedStr = selProration?.amountDueCents != null
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: (selProration.currency || "usd").toUpperCase() }).format(selProration.amountDueCents / 100)
    : null;
  */

  async function checkoutWithPlan(plan: "basic" | "essential" | "growth" | "free") {
    if (sessionLoading) {
      alert("Please wait — loading your account.");
      return;
    }
    if (!activeOrganizationId) {
      alert("We could not load your organization. Refresh the page or sign in again.");
      return;
    }
    if (!siteId) {
      alert("Missing site. Open Upgrade from a site in the dashboard.");
      return;
    }
    if (plan === "free") return;

    // Step 9 — final proceed-to-checkout intent (fires before the Stripe redirect).
    analytics.checkoutInitiated(
      plan,
      siteId ? String(siteId) : undefined,
      billing === "yearly" ? "annual" : "monthly"
    );

    /* NEW WORKFLOW (prorated in-place tier change) — kept for later.
    // Existing paid subscription → prorated in-place change. Open the confirmation modal
    // (shows the prorated amount + charges the card on file) instead of a checkout redirect.
    if (currentTier !== "free") {
      void openTierConfirm(plan);
      return;
    }
    */

    // OLD WORKFLOW — every plan change goes through a Stripe checkout redirect (no proration
    // calculation). Existing paid subscriptions cancel-and-recreate via upgradeSubscription;
    // new subscriptions use createCheckoutSession.
    setCheckoutLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const finalUrl = `${origin}/dashboard/${siteId}/upgrade?upgraded=1`;
      const workerBase = process.env.NEXT_PUBLIC_WORKER_URL || "https://consent-webapp-manager.web-8fb.workers.dev";
      const successUrl = `${workerBase}/api/checkout-success-redirect?redirect=${encodeURIComponent(finalUrl)}`;
      const cancelUrl  = origin ? `${origin}/dashboard/${siteId}/upgrade?canceled=1` : undefined;
      const intervalVal = billing === "yearly" ? "yearly" : "monthly";

      let url: string;

      if (currentTier !== "free") {
        // Existing paid subscription — cancel old and create new checkout session.
        ({ url } = await upgradeSubscription({
          siteId,
          organizationId: activeOrganizationId,
          planId: plan,
          interval: intervalVal,
          successUrl,
          cancelUrl,
          ...(appliedPromo
            ? {
                promotionCodeId: appliedPromo.promotionCodeId,
                couponId: appliedPromo.couponId,
              }
            : {}),
        }));
      } else {
        // No existing subscription — standard new checkout.
        ({ url } = await createCheckoutSession({
          organizationId: activeOrganizationId,
          planId: plan,
          interval: intervalVal,
          siteId,
          successUrl,
          cancelUrl,
          ...(appliedPromo
            ? {
                stripePromotionCodeId: appliedPromo.promotionCodeId,
                stripeCouponId: appliedPromo.couponId,
              }
            : {}),
        }));
      }

      sessionStorage.setItem(`cb_stripe_redirect_${siteId}`, '1');
      // Store the target plan so the post-redirect poll can wait for the right plan.
      sessionStorage.setItem(`cb_target_plan_${siteId}`, plan);
      window.location.href = url;
      // Do NOT reset checkoutLoading here — keep overlay visible until browser navigates away.
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not start checkout.");
      setCheckoutLoading(false);
    }
  }

  // Same tier, different interval → open a confirm dialog showing the prorated balance first.
  async function openSwitchConfirm(target: "monthly" | "yearly") {
    if (!activeOrganizationId) return;
    setSwitchTarget(target);
    setPreview(null);
    setSwitchError(null);
    setShowSwitchConfirm(true);
    setPreviewLoading(true);
    try {
      const p = await previewSwitchInterval(activeOrganizationId, target);
      setPreview(p);
    } catch (e) {
      setSwitchError(e instanceof Error ? e.message : "Could not load the charge details.");
    } finally {
      setPreviewLoading(false);
    }
  }

  // Confirmed → charge the card on file in-place (no checkout redirect).
  async function confirmSwitch() {
    if (!activeOrganizationId || !switchTarget || switching) return;
    setSwitching(true);
    setSwitchError(null);
    try {
      await switchBillingInterval(activeOrganizationId, switchTarget);
      setCurrentInterval(switchTarget);
      await refresh({ showLoading: false });
      setShowSwitchConfirm(false);
      router.push(`/dashboard/${siteId}?upgraded=1`);
    } catch (e) {
      setSwitchError(e instanceof Error ? e.message : "Could not switch billing periods. Please try again.");
      setSwitching(false);
    }
  }

  const PlanHeader = ({
    name,
    plan,
    recommended,
  }: {
    name: string;
    plan?: keyof typeof prices;
    recommended?: boolean;
  }) => (
    <div
      className={`p-6 pt-8 ${name === "Growth" ? "pl-[50px]" : ""} ${
        recommended
          ? "bg-[#f0fff1] border border-[rgba(164,191,166,0.3)] rounded-t-[20px] relative"
          : ""
      }`}
    >
      {recommended && (
        <div className="absolute -top-3 left-4 bg-[#4cbb66] text-white text-[13px] px-3 py-1 rounded-full">
          Recommended
        </div>
      )}

      <div className="text-[28px] font-extrabold text-[#007aff] tracking-[-1.5px]">
        {name}
      </div>

      {plan && (
        <>
          <div className={`text-[#007aff] text-sm mt-1 ${plan === "free" ? "invisible" : "visible"}`}>
            14 days trial period
          </div>

          <div className="flex items-baseline gap-1 mt-4">
            <span className="text-[36px] font-extrabold text-[#231d4f]">
              ${getPrice(plan)}
            </span>
            <span className="text-[15px] text-[#848199]">/month</span>
          </div>

          {billing === "yearly" && (
            <div className="text-xs text-[#848199] mt-1">
              {getYearlyText(plan)}
            </div>
          )}
        </>
      )}
    </div>
  );

  const PlanButton = ({
    plan,
    recommended,
  }: {
    plan: keyof typeof prices;
    recommended?: boolean;
  }) => {
    const isSelected = selected === plan;

    return (
      <button
        type="button"
        disabled={checkoutLoading}
        onClick={() => {
          setSelected(plan);
          // Step 8 — plan card selected in the pricing menu.
          analytics.planSelected(
            plan,
            billing === "yearly" ? "annual" : "monthly",
            getPrice(plan),
            siteId ? String(siteId) : undefined
          );
          setTimeout(() => {
            proceedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
        }}
        className={`px-6 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-not-allowed
        ${
          isSelected
            ? "bg-green-500"
            : recommended
            ? "bg-green-500"
            : "bg-[#007aff]"
        }`}
      >
        {isSelected ? "Selected" : "Switch plan"}
      </button>
    );
  };

  /* NEW WORKFLOW (prorated in-place tier change) — confirm/commit handlers, kept for later.
  // Different tier on an existing paid subscription → confirm dialog with the prorated amount first.
  async function openTierConfirm(plan: "basic" | "essential" | "growth") {
    if (!activeOrganizationId) return;
    setTierTarget(plan);
    setTierPreview(null);
    setTierError(null);
    setTierStep("review");
    setShowTierConfirm(true);
    setTierPreviewLoading(true);
    try {
      const p = await previewChangeTier({
        organizationId: activeOrganizationId,
        siteId: siteId || null,
        planId: plan,
        interval: billing === "yearly" ? "yearly" : "monthly",
        promotionCodeId: appliedPromo?.promotionCodeId ?? null,
      });
      setTierPreview(p);
    } catch (e) {
      setTierError(e instanceof Error ? e.message : "Could not load the charge details.");
    } finally {
      setTierPreviewLoading(false);
    }
  }

  // Downgrade confirmed → schedule the change (no payment now).
  async function confirmDowngrade() {
    if (!activeOrganizationId || !tierTarget || committingTier) return;
    setCommittingTier(true);
    setTierError(null);
    try {
      await changeTier({
        organizationId: activeOrganizationId,
        siteId: siteId || null,
        planId: tierTarget,
        interval: billing === "yearly" ? "yearly" : "monthly",
        promotionCodeId: appliedPromo?.promotionCodeId ?? null,
      });
      setShowTierConfirm(false);
      await refresh({ showLoading: false });
      router.push(`/dashboard/${siteId}?upgraded=1`);
    } catch (e) {
      setTierError(e instanceof Error ? e.message : "Could not schedule the change. Please try again.");
      setCommittingTier(false);
    }
  }

  // Upgrade payment succeeded (on the new card) → show the success/proceed page with receipt.
  async function finishUpgradeSuccess(result: ChangeTierResult) {
    setShowTierConfirm(false);
    await refresh({ showLoading: false });
    const amt = result.amountPaidCents != null ? (result.amountPaidCents / 100).toFixed(2) : "";
    setPaymentDetails({
      amount: amt,
      currency: (result.currency || "usd").toUpperCase(),
      transaction_id: result.invoiceId ?? "",
      plan_id: result.planId ?? tierTarget ?? "",
      plan_type: "tier",
      interval: result.interval ?? "",
      invoice_id: result.invoiceId ?? "",
      invoice_url: result.invoiceUrl ?? "",
      customer_email: "",
      payment_status: result.paymentStatus ?? "paid",
      date_of_purchase: new Date().toISOString(),
    });
    if (tierTarget) sessionStorage.setItem(`cb_target_plan_${siteId}`, tierTarget);
    setPaymentProcessing(true);
  }

  // Upgrade "Continue to payment": if nothing is due now (trial or credit covers it), commit
  // without a card; otherwise advance to the card-entry step.
  async function proceedUpgrade() {
    if (!tierPreview) return;
    const amount = tierPreview.amountDueCents ?? 0;
    if (tierPreview.isTrialing || amount <= 0) {
      await commitUpgradeNoCard();
    } else {
      setTierStep("pay");
    }
  }

  async function commitUpgradeNoCard() {
    if (!activeOrganizationId || !tierTarget || committingTier) return;
    setCommittingTier(true);
    setTierError(null);
    try {
      const result = await changeTier({
        organizationId: activeOrganizationId,
        siteId: siteId || null,
        planId: tierTarget,
        interval: billing === "yearly" ? "yearly" : "monthly",
        promotionCodeId: appliedPromo?.promotionCodeId ?? null,
      });
      await finishUpgradeSuccess(result);
    } catch (e) {
      setTierError(e instanceof Error ? e.message : "Could not complete the change. Please try again.");
      setCommittingTier(false);
    }
  }
  */

  // Shown when the user is already on this tier but the grid is toggled to the other interval.
  const SwitchIntervalButton = ({ target }: { target: "monthly" | "yearly" }) => (
    <button
      type="button"
      disabled={switching || previewLoading}
      onClick={() => openSwitchConfirm(target)}
      className="bg-[#007aff] text-white text-[15px] font-medium px-6 py-2 rounded-lg transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-not-allowed max-w-[200px]"
    >
      {target === "yearly" ? "Upgrade to Yearly" : "Switch to Monthly"}
    </button>
  );
function redirectToDashboard() {
  router.push(`/dashboard/${siteId}?upgraded=1`);
}
  if (returnedFromStripe) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white gap-3">
        <div className="w-14 h-14 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-2">
          <svg className="w-7 h-7 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-[18px] font-semibold text-[#111827]">Payment not completed</p>
        <p className="text-sm text-[#6b7280]">You returned without completing the payment.</p>
        <p className="text-xs text-[#9CA3AF]">Returning to upgrade page in {autoCloseCountdown}s…</p>
        <button
          type="button"
          onClick={() => setReturnedFromStripe(false)}
          className="mt-3 px-6 py-2.5 rounded-lg bg-[#007aff] text-white text-sm font-medium hover:bg-[#0066d6] transition-colors"
        >
          Cancel Payment
        </button>
      </div>
    );
  }

  if (checkoutLoading) {
    return (
      <LoadingScreen/>
    );
  }

  if (paymentProcessing) {
    const fmt = (v: string) => v || "—";
    const planLabel = paymentDetails.plan_id
      ? paymentDetails.plan_id.charAt(0).toUpperCase() + paymentDetails.plan_id.slice(1)
      : paymentDetails.plan_type || "—";
    const amountLabel = paymentDetails.amount
      ? `${paymentDetails.currency || "USD"} $${paymentDetails.amount}`
      : "—";
    const dateLabel = paymentDetails.date_of_purchase
      ? new Date(paymentDetails.date_of_purchase).toLocaleString()
      : "—";

    // return (
    //   <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#E6F1FD] gap-6 px-4">
    //     <MailSuccessAnimation />
    //     <div className="text-center">
    //       <p className="text-[18px] font-semibold text-[#111827]">Payment processed!</p>
    //       <p className="text-sm text-[#6b7280] mt-1">Updating your plan — redirecting to dashboard shortly…</p>
    //     </div>
    //     {paymentDetails.amount && (
    //       <div className="bg-white rounded-2xl shadow-sm border border-[#e5e7eb] w-full max-w-sm px-6 py-5 flex flex-col gap-3 text-sm">
    //         <Row label="Plan"           value={planLabel} />
    //         <Row label="Amount"         value={amountLabel} />
    //         <Row label="Billing"        value={fmt(paymentDetails.interval)} />
    //         <Row label="Status"         value={fmt(paymentDetails.payment_status)} />
    //         <Row label="Transaction ID" value={fmt(paymentDetails.transaction_id)} mono />
    //         {paymentDetails.invoice_id && (
    //           <Row label="Invoice ID"   value={paymentDetails.invoice_id} mono />
    //         )}
    //         <Row label="Email"          value={fmt(paymentDetails.customer_email)} />
    //         <Row label="Date"           value={dateLabel} />
    //         {paymentDetails.invoice_url && (
    //           <a
    //             href={paymentDetails.invoice_url}
    //             target="_blank"
    //             rel="noopener noreferrer"
    //             className="mt-1 text-center text-[#007aff] text-xs font-medium hover:underline"
    //           >
    //             View Invoice ↗
    //           </a>
    //         )}
    //       </div>
    //     )}
    //   </div>
    // );
 return <PaymentDone details={paymentDetails} OnClick={redirectToDashboard}/>
 
  }

  return (
    <div className="flex justify-center w-full border-t border-[#000000]/10">
      {/* Switch-interval confirm dialog */}
      {showSwitchConfirm && switchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!switching) setShowSwitchConfirm(false); }}
          />
          <div className="relative z-10 w-[420px] bg-white rounded-[18px] shadow-xl p-7 mx-4">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#eff6ff] flex items-center justify-center">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v10M12 17h.01" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="10" stroke="#007AFF" strokeWidth="2"/>
                </svg>
              </div>
            </div>
            <h3 className="text-[18px] font-bold text-black text-center mb-2">
              Switch to {switchTarget === "yearly" ? "Yearly" : "Monthly"} Billing?
            </h3>

            <div className="text-[13px] text-[#6b7280] text-center leading-relaxed mb-5 min-h-[40px]">
              {previewLoading ? (
                "Calculating your balance..."
              ) : preview ? (
                (() => {
                  const fmt = (cents: number) =>
                    new Intl.NumberFormat(undefined, { style: "currency", currency: (preview.currency || "usd").toUpperCase() })
                      .format(cents / 100);
                  const amount = preview.amountDueCents ?? 0;
                  const per = switchTarget === "yearly" ? "year" : "month";
                  if (preview.isTrialing) {
                    const when = preview.trialEnd ? new Date(preview.trialEnd).toLocaleDateString() : "your trial ends";
                    return `You're on a free trial, so nothing will be charged now. When your trial ends (${when}), you'll be billed ${fmt(amount)}/${per}.`;
                  }
                  if (amount <= 0) {
                    return `No payment is due now. Any unused balance will be credited toward future invoices. Your plan will renew ${per === "year" ? "yearly" : "monthly"}.`;
                  }
                  return `You'll be charged ${fmt(amount)} now, the prorated balance for switching to the card on file. Your plan will then renew ${per === "year" ? "yearly" : "monthly"}.`;
                })()
              ) : switchTarget === "yearly" ? (
                "You'll be charged for a full year at a 20% discount. The difference will be prorated from your current billing cycle."
              ) : (
                "You'll be switched to monthly billing. Unused yearly credit will be prorated on your next invoice."
              )}
            </div>

            {switchError && (
              <div className="mb-4 rounded-[8px] bg-[#fef2f2] border border-[#fecaca] px-3 py-2.5 text-[12px] text-[#dc2626] text-center">
                {switchError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { if (!switching) { setShowSwitchConfirm(false); setSwitchError(null); } }}
                disabled={switching}
                className="flex-1 h-[42px] rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors"
              >
                Keep Current
              </button>
              <button
                type="button"
                onClick={confirmSwitch}
                disabled={switching || previewLoading}
                className="flex-1 h-[42px] rounded-[10px] bg-[#007AFF] text-white text-[14px] font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {switching ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Switching...
                  </>
                ) : (
                  `Switch to ${switchTarget === "yearly" ? "Yearly" : "Monthly"}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW WORKFLOW (prorated in-place tier change) — confirm dialog disabled, kept for later. */}
      {/* DISABLED — re-enable together with the tier-change handlers, state, and Stripe imports above:
      {showTierConfirm && tierTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!committingTier) setShowTierConfirm(false); }}
          />
          <div className="relative z-10 w-[460px] bg-white rounded-[18px] shadow-xl p-7 mx-4">
            <h3 className="text-[20px] font-bold text-[#0a091f] mb-5">Payment Confirmation</h3>

            <div className="space-y-2.5 text-[14px] mb-4">
              <div className="flex gap-2">
                <span className="text-[#6b7280] min-w-[92px]">Current plan:</span>
                <span className="text-[#111827] font-medium">
                  {({ basic: "Basic", essential: "Essential", growth: "Growth", free: "Free" } as Record<string, string>)[currentTier]}
                  {" "}({billing === "yearly" ? "yearly" : "monthly"})
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-[#6b7280] min-w-[92px]">New plan:</span>
                <span className="text-[#111827] font-medium">
                  {({ basic: "Basic", essential: "Essential", growth: "Growth" } as Record<string, string>)[tierTarget]}
                  {" "}(${getPrice(tierTarget)}/month{billing === "yearly" ? ", billed yearly" : ""})
                </span>
              </div>
              {promoOn && appliedPromo && (
                <div className="flex gap-2">
                  <span className="text-[#6b7280] min-w-[92px]">Coupon:</span>
                  <span className="text-[#15803d] font-medium">{discountLabel()} applied</span>
                </div>
              )}
            </div>

            {tierStep === "review" ? (
              <>
                <div className="rounded-[10px] bg-[#eff6ff] border border-[#dbeafe] px-4 py-3 text-[13px] text-[#1e3a8a] leading-relaxed mb-5 min-h-[52px] flex items-center">
                  {tierPreviewLoading ? (
                    "Calculating your pro-rated amount…"
                  ) : tierPreview ? (
                    (() => {
                      const fmt = (cents: number) =>
                        new Intl.NumberFormat(undefined, { style: "currency", currency: (tierPreview.currency || "usd").toUpperCase() })
                          .format(cents / 100);
                      const per = tierPreview.interval === "yearly" ? "year" : "month";
                      if (tierPreview.isTrialing) {
                        return `You're on a free trial, so nothing is charged now. Your plan changes immediately, and you'll be billed ${fmt(tierPreview.amountDueCents ?? 0)}/${per} when the trial ends.`;
                      }
                      if (tierPreview.direction === "downgrade") {
                        const when = tierPreview.effectiveAt ? new Date(tierPreview.effectiveAt).toLocaleDateString() : "the end of your billing period";
                        const newAmt = tierPreview.newPlanAmountCents != null ? `${fmt(tierPreview.newPlanAmountCents)}/${per}` : "the new plan price";
                        return `No payment is due now. You'll keep your current plan until ${when}, then move to the lower plan and pay ${newAmt}.`;
                      }
                      const amount = tierPreview.amountDueCents ?? 0;
                      if (amount <= 0) {
                        return "No payment is due now — your existing balance covers the change. Your plan upgrades immediately.";
                      }
                      return `You will only pay the pro-rated amount for the current billing period: ${fmt(amount)}. You'll enter your card on the next step.`;
                    })()
                  ) : (
                    "You'll pay the pro-rated amount for the current billing period on the next step."
                  )}
                </div>

                {tierPreview?.couponPreviewSkipped && (
                  <div className="mb-4 text-[12px] text-[#b45309]">
                    Note: the coupon will be applied at payment; the amount above may not reflect it.
                  </div>
                )}

                {tierError && (
                  <div className="mb-4 rounded-[8px] bg-[#fef2f2] border border-[#fecaca] px-3 py-2.5 text-[12px] text-[#dc2626] text-center">
                    {tierError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { if (!committingTier) { setShowTierConfirm(false); setTierError(null); } }}
                    disabled={committingTier}
                    className="flex-1 h-[44px] rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (tierPreview?.direction === "downgrade") void confirmDowngrade(); else void proceedUpgrade(); }}
                    disabled={committingTier || tierPreviewLoading || !!tierError}
                    className="flex-1 h-[44px] rounded-[10px] bg-[#007AFF] text-white text-[14px] font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    {committingTier ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Processing…
                      </>
                    ) : tierPreview?.direction === "downgrade" ? (
                      "Confirm downgrade"
                    ) : (
                      "Continue to payment"
                    )}
                  </button>
                </div>
              </>
            ) : stripePromise ? (
              <Elements stripe={stripePromise}>
                <TierCardForm
                  amountLabel={
                    tierPreview?.amountDueCents != null
                      ? new Intl.NumberFormat(undefined, { style: "currency", currency: (tierPreview.currency || "usd").toUpperCase() }).format((tierPreview.amountDueCents || 0) / 100)
                      : ""
                  }
                  organizationId={activeOrganizationId!}
                  siteId={siteId || null}
                  planId={tierTarget}
                  interval={billing === "yearly" ? "yearly" : "monthly"}
                  promotionCodeId={appliedPromo?.promotionCodeId ?? null}
                  onSuccess={finishUpgradeSuccess}
                  onBack={() => setTierStep("review")}
                />
              </Elements>
            ) : (
              <div className="rounded-[8px] bg-[#fef2f2] border border-[#fecaca] px-3 py-2.5 text-[12px] text-[#dc2626] text-center">
                Payment system misconfigured — set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
              </div>
            )}
          </div>
        </div>
      )}
      */}

      <div className="max-w-[1292px] w-full bg-white  overflow-hidden">

        {/* HEADER */}
        <div className="flex gap-8 items-center  px-9 py-3.5 pt-7 mt-2 ">
          <div className="text-xl font-semibold ">
            Chose your Payment Plan
          </div>
          <div className="flex bg-[#f1f5f9] rounded-[22px] p-1 gap-2.25">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5.75 py-2 text-[14px] h-[44px] font-extrabold rounded-[22px] ${
                billing === "monthly"
                  ? "bg-[#007aff] text-white"
                  : "text-[#848199]"
              }`}
            >
              MONTHLY
            </button>

            <button
              onClick={() => setBilling("yearly")}
              className={`px-2 py-2 text-[14px]  h-[44px] font-extrabold rounded-[22px] ${
                billing === "yearly"
                  ? "bg-[#007aff] text-white"
                  : "text-[#848199]"
              }`}
            >
              YEARLY (20% OFF)
            </button>
          </div>

          
        </div>

        {/* PLANS GRID */}
        <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-[200px_200px_220px_316px_1fr] mt-5 px-6 min-w-[1292px]">

          <div></div>

          <PlanHeader name="Free" plan="free" />

          <PlanHeader name="Basic" plan="basic" />

          <PlanHeader name="Essential" plan="essential" recommended />

          <PlanHeader name="Growth" plan="growth" />

          {/* ROW */}
          <Feature label="No of Domains" values={["01", "01", "01", "01"]} />

          <Feature
            label="No of Scans"
            values={[
              "100",
              "750",
              "5000 scans",
              "10000 scans",
            ]}
          />

          <Feature
            label="No of Page Views"
            values={[
              "7500",
              "100,000 pageviews/m",
              "500,000 pageviews/m ",
              "2 Million pageviews/m ",
            ]}
          />

          <Feature
            label="IAB / TCF"
            values={["NIL", "NIL", "Yes", "Yes"]}
          />

          <Feature
            label="Compliance"
            values={[
              "GDPR/CCPA",
              "GDPR/CCPA",
              "GDPR+CCPA",
              "GDPR+CCPA",
            ]}
          />

          {/* BUTTONS — "Current Plan" matches resolvePlanTierForSiteContext for this site (same as header). */}
          <div className="p-4 border-t border-[#000000]/10"></div>

          <div className="p-4 border-t border-[#000000]/10">
            {currentTier === "free" ? (
              <CurrentPlanButton />
            ) : null}
          </div>

          <div className="p-4 border-t border-[#000000]/10">
            {currentTier === "basic" ? (
              currentInterval && currentInterval !== billing ? (
                <SwitchIntervalButton target={billing} />
              ) : (
                <CurrentPlanButton />
              )
            ) : (
              <PlanButton plan="basic" />
            )}
          </div>

          <div className="p-4 px-8 pb-8 bg-[#f0fff1] border-x border-[rgba(164,191,166,0.3)] border-b rounded-b-[20px] border-t border-t-[#000000]/10">
            {currentTier === "essential" ? (
              currentInterval && currentInterval !== billing ? (
                <SwitchIntervalButton target={billing} />
              ) : (
                <CurrentPlanButton />
              )
            ) : (
              <PlanButton plan="essential" recommended />
            )}
          </div>

          <div className="p-4 pl-[50px] border-t border-[#000000]/10">
            {currentTier === "growth" ? (
              currentInterval && currentInterval !== billing ? (
                <SwitchIntervalButton target={billing} />
              ) : (
                <CurrentPlanButton />
              )
            ) : (
              <PlanButton plan="growth" />
            )}
          </div>

        </div>
</div>
        {/* BOTTOM */}
        <div className="grid grid-cols-[430px_1fr] gap-4 p-6 pt-15.5">

          {/* PROMO */}
          <div  className={` rounded-[15px] p-7 relative border-white ${!selected ? 'opacity-50' : ''}`}>
<img src="/images/smallbox.png" alt="promo" className="absolute inset-0 w-full h-full  rounded-[15px] pointer-events-none" />
            <div className="relative z-10 text-lg font-semibold mb-1">Promo code</div>
            {!selected && (
              <p className="relative z-10 text-xs text-[#6b7280] mb-3">Select a plan to apply a promo code.</p>
            )}
            {selected && <div className="mb-4" />}

            {/* ── Promo input (always visible) ── */}
            <div className="relative z-10 flex border border-[#E5E5E5] bg-white pr-1.5 items-center rounded-lg">
                <input
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value.toUpperCase());
                    setPromoOn(false);
                    setPromoError(false);
                    setPromoErrorMsg("");
                    setAppliedPromo(null);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void applyPromo(); } }}
                  disabled={!selected || promoValidating}
                  className="flex-1 min-w-0 px-4 py-3 outline-none disabled:cursor-not-allowed bg-white rounded-lg font-mono tracking-wider uppercase"
                  placeholder="Enter promo code"
                  autoComplete="off"
                  spellCheck={false}
                />

                {promoInput && !promoValidating && (
                  <button
                    type="button"
                    onClick={() => {
                      setPromoOn(false);
                      setPromoInput("");
                      setPromoError(false);
                      setPromoErrorMsg("");
                      setAppliedPromo(null);
                    }}
                    className="shrink-0 px-1 text-gray-400 hover:text-gray-600 text-lg leading-none"
                  >
                    ×
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void applyPromo()}
                  disabled={!selected || !promoInput.trim() || promoValidating}
                  className="shrink-0 bg-[#007aff] rounded-[5px] text-white px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] flex items-center justify-center gap-1.5"
                >
                  {promoValidating ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Checking
                    </>
                  ) : (
                    <>
                      <svg width="15" height="10" viewBox="0 0 15 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 4.76471L5.15732 8.67748C5.34984 8.85868 5.65016 8.85868 5.84268 8.67748L14 1" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Apply
                    </>
                  )}
                </button>
              </div>

            {/* Applied — simple confirmation below the text box */}
            {promoOn && appliedPromo && (
              <div className="relative z-10 mt-3 flex items-center gap-2 text-sm text-green-700">
                <svg width="15" height="10" viewBox="0 0 15 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 4.76471L5.15732 8.67748C5.34984 8.85868 5.65016 8.85868 5.84268 8.67748L14 1" stroke="#15803d" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="font-medium">Applied</span>
                <button
                  type="button"
                  onClick={() => {
                    setPromoOn(false);
                    setPromoInput("");
                    setPromoError(false);
                    setPromoErrorMsg("");
                    setAppliedPromo(null);
                  }}
                  className="text-green-700 underline underline-offset-2 hover:text-green-800"
                >
                  Remove
                </button>
              </div>
            )}

            {promoError && promoErrorMsg && !promoOn && (
              <div className="relative z-10 mt-3 flex items-center gap-1.5 text-sm text-[#ef4444]">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="7.5" cy="7.5" r="6.5" stroke="#ef4444" strokeWidth="1.5"/>
                  <path d="M7.5 4.5V8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="7.5" cy="10.5" r="0.75" fill="#ef4444"/>
                </svg>
                {promoErrorMsg}
              </div>
            )}

          </div>

          {/* TOTAL */}
          <div  ref={proceedRef} className=" relative rounded-[15px] p-7  border-white">
<img src="/images/bigbox.png" alt="promo" className="absolute z-[10] inset-0 w-full h-full  rounded-[15px] pointer-events-none" />

            <div className="flex justify-between items-start relative z-10">

              <div>

                {/* OLD WORKFLOW — plain plan-price total (no proration calculation).
                    The NEW WORKFLOW showed a live "Due now (prorated)" figure here; see the
                    commented showProrated/proratedStr/selProration code above to re-enable. */}
                <div className="text-gray-500">Total</div>

                <div className="text-[40px] text-[#007aff] font-semibold tracking-[-2px]">
                  ${total}
                </div>

                <div>
                  {billing === "yearly"
                    ? "(Billed annually)"
                    : "(Billed monthly)"}
                </div>

              </div>

              <button
                type="button"
                disabled={checkoutLoading || !selected}
                onClick={() => {
                  if (!selected) {
                    alert("Select Basic, Essential, or Growth first.");
                    return;
                  }
                  void checkoutWithPlan(selected);
                }}
                className="bg-[#2ec04f]  border-2 border-white outline-1 outline-[#2ec04f] text-white px-6 py-3 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkoutLoading ? "Redirecting…" : "Proceed to pay"}
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
function Feature({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <>
      <div className="p- py-5.5 border-t border-[#000000]/10 text-[17px] flex items-center ">
        {label}
      </div>

      {values.map((v, i) => (
        <div
          key={i}
          className={`p-4 border-t flex flex-col justify-center border-[#000000]/10  text-[17px] font-bold text-[#5243c2] ${
            i === 2
              ? "bg-[#F0FFF1] border-l border-r border-[#A4BFA64D] px-8"
              : "text-[#5243c2] "
          }
          ${
            i === 3
              ? "pl-[50px] pr-0"
              : ""
          }
          
          `}
        >
         <p><span className={`${v==="NIL" ? "text-[#8E8E8E]" : ""}  ${(i===0 || i===1) && label==="Compliance" ? "text-[#8E8E8E]" : ""}`}>{v}</span></p> 
         {i === 2 && label === "No of Page Views" && (<p className="text-[13px] font-normal text-[#4B5563]">+ $0.49 for additional 10000 page views</p>)}
         {i === 3 && label === "No of Page Views" && (<p className="text-[13px] font-normal text-[#4B5563]">+ $0.39 for additional 10000 page views</p>)}
         {i === 3 && label === "No of Scans" && (<p className="text-[13px] font-normal text-[#4B5563]">+ $0.49 for additional 10000 scans</p>)}

        </div>
      ))}
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-[#6b7280] shrink-0">{label}</span>
      <span className={`text-[#111827] text-right break-all ${mono ? "font-mono text-xs" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}

/* NEW WORKFLOW (prorated in-place tier change) — card-entry step, kept for later.
// Card-entry step for a prorated upgrade (option 3): collects a new card via Stripe Elements,
// charges the prorated amount to it, and handles 3D Secure — mirrors app/checkout/page.tsx.
function TierCardForm({
  amountLabel,
  organizationId,
  siteId,
  planId,
  interval,
  promotionCodeId,
  onSuccess,
  onBack,
}: {
  amountLabel: string;
  organizationId: string;
  siteId: string | null;
  planId: "basic" | "essential" | "growth";
  interval: "monthly" | "yearly";
  promotionCodeId: string | null;
  onSuccess: (result: ChangeTierResult) => void | Promise<void>;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements) { setErr("Payment not ready. Please wait a moment and try again."); return; }
    const cardEl = elements.getElement(CardNumberElement);
    if (!cardEl) { setErr("Enter your card details."); return; }
    setErr("");
    setSubmitting(true);
    try {
      const { paymentMethod, error: pmErr } = await stripe.createPaymentMethod({
        type: "card",
        card: cardEl,
        billing_details: { name: name.trim() || undefined },
      });
      if (pmErr || !paymentMethod) { setErr(pmErr?.message || "Card error. Please check your details."); setSubmitting(false); return; }

      const result = await changeTier({
        organizationId,
        siteId,
        planId,
        interval,
        promotionCodeId,
        paymentMethodId: paymentMethod.id,
      });

      // 3D Secure required → complete it, then success.
      if (result.requiresAction && result.clientSecret) {
        const { error: confErr } = await stripe.confirmCardPayment(result.clientSecret);
        if (confErr) { setErr(confErr.message || "Card authentication failed. Please try another card."); setSubmitting(false); return; }
      }

      await onSuccess(result);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Payment failed. Please try again.");
      setSubmitting(false);
    }
  }

  const fieldCls = "rounded-lg border border-gray-300 px-3 py-2.5 transition focus-within:border-[#007AFF] focus-within:ring-2 focus-within:ring-[#007AFF]/20";

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-[13px] text-[#374151]">
        {amountLabel
          ? <>You&apos;ll be charged <span className="font-semibold text-[#0a091f]">{amountLabel}</span> now — the prorated amount.</>
          : "Enter your card to complete the upgrade."}
      </p>

      <div>
        <label className="mb-1 block text-[13px] text-gray-700">Card number</label>
        <div className={fieldCls}><CardNumberElement options={STRIPE_FIELD_STYLE} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[13px] text-gray-700">Expiry</label>
          <div className={fieldCls}><CardExpiryElement options={STRIPE_FIELD_STYLE} /></div>
        </div>
        <div>
          <label className="mb-1 block text-[13px] text-gray-700">CVC</label>
          <div className={fieldCls}><CardCvcElement options={STRIPE_FIELD_STYLE} /></div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[13px] text-gray-700">Name on card</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20"
        />
      </div>

      {err && <div className="rounded-[8px] bg-[#fef2f2] border border-[#fecaca] px-3 py-2.5 text-[12px] text-[#dc2626]">{err}</div>}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex-1 h-[44px] rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={submitting || !stripe}
          className="flex-1 h-[44px] rounded-[10px] bg-[#007AFF] text-white text-[14px] font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Processing…
            </>
          ) : amountLabel ? `Pay ${amountLabel}` : "Confirm & pay"}
        </button>
      </div>
    </form>
  );
}
*/