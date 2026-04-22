
"use client";




import { useParams, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"; // useRef kept for proceedRef
import { createCheckoutSession, upgradeSubscription } from "@/lib/client-api";
import { resolvePlanTierForSiteContext } from "@/lib/dashboard-plan-tier";
import { useDashboardSession } from "../../DashboardSessionProvider";
import LoadingScreen from "@/components/animations/LoadingScreen";
import PaymentDone from "@/components/animations//PaymentDone";

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

  const [paymentProcessing, setPaymentProcessing] = useState(false);
  
  const [paymentDetails, setPaymentDetails] = useState<Record<string, string>>({});

  // After Stripe redirects back to this page with ?upgraded=1, poll until plan updates then go to dashboard.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") !== "1") return;
    // Clean URL so refresh doesn't re-trigger; also clear the stripe-redirect flag.
    window.history.replaceState({}, "", window.location.pathname);
    sessionStorage.removeItem(`cb_stripe_redirect_${siteId}`);
    // Read and clear the target plan we stored before redirecting to Stripe.
    const targetPlan = (sessionStorage.getItem(`cb_target_plan_${siteId}`) || "").trim().toLowerCase();
    sessionStorage.removeItem(`cb_target_plan_${siteId}`);
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
    console.log("[Payment Success] Transaction details:", details);
    console.log("[UpgradePoll] start — targetPlan:", targetPlan, "siteId:", siteId);
    setPaymentProcessing(true);
    let attempts = 0;
    let t: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      const planNow = String(await refresh({ showLoading: false }) ?? "").toLowerCase();
      attempts += 1;
      console.log(`[UpgradePoll] attempt ${attempts} — planNow: "${planNow}" | targetPlan: "${targetPlan}" | match: ${planNow === targetPlan}`);
      if (planNow !== targetPlan && attempts < 20) {
        t = setTimeout(poll, 1500);
      } else {
        console.log(`[UpgradePoll] done — reason: ${planNow === targetPlan ? "plan matched" : "max attempts"} | navigating to dashboard`);
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

    if (promoOn) total *= 0.8;

    return Math.round(total);
  };

  const applyPromo = () => {
    if (promoInput.trim() === "TESTWEB") {
      setPromoOn(true);
      setPromoError(false);
    } else {
      setPromoOn(false);
      setPromoError(true);
    }
  };

  const total = calculateTotal();

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
        // Existing paid subscription — cancel old and create new checkout session
        ({ url } = await upgradeSubscription({
          siteId,
          organizationId: activeOrganizationId,
          planId: plan,
          interval: intervalVal,
          successUrl,
          cancelUrl,
        }));
      } else {
        // No existing subscription — standard new checkout
        ({ url } = await createCheckoutSession({
          organizationId: activeOrganizationId,
          planId: plan,
          interval: intervalVal,
          siteId,
          successUrl,
          cancelUrl,
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
function redirectToDashboard() {
  router.push(`/dashboard/${siteId}`);
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
              <CurrentPlanButton />
            ) : (
              <PlanButton plan="basic" />
            )}
          </div>

          <div className="p-4 px-8 pb-8 bg-[#f0fff1] border-x border-[rgba(164,191,166,0.3)] border-b rounded-b-[20px] border-t border-t-[#000000]/10">
            {currentTier === "essential" ? (
              <CurrentPlanButton />
            ) : (
              <PlanButton plan="essential" recommended />
            )}
          </div>

          <div className="p-4 pl-[50px] border-t border-[#000000]/10">
            {currentTier === "growth" ? (
              <CurrentPlanButton />
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

            <div className="relative z-10 flex border border-[#E5E5E5] bg-white pr-1.5 items-center rounded-lg">

              <input
                value={promoInput}
                onChange={(e) => { setPromoInput(e.target.value); setPromoOn(false); setPromoError(false); }}
                disabled={!selected}
                className="flex-1 min-w-0 px-4 py-3 outline-none disabled:cursor-not-allowed bg-white rounded-lg"
                placeholder="Enter promo code"
              />

              {promoInput && (
                <button
                  type="button"
                  onClick={() => { setPromoOn(false); setPromoInput(''); setPromoError(false); }}
                  className="shrink-0 px-1 text-gray-400 hover:text-gray-600 text-lg leading-none"
                >
                  ×
                </button>
              )}

              <button
                type="button"
                onClick={applyPromo}
                disabled={!selected || !promoInput.trim()}
                className="shrink-0 bg-[#007aff] rounded-[5px] text-white px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="inline mr-1" width="15" height="10" viewBox="0 0 15 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 4.76471L5.15732 8.67748C5.34984 8.85868 5.65016 8.85868 5.84268 8.67748L14 1" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Apply
              </button>

            </div>

            {promoOn && (
              <div className="relative z-10 mt-3 text-[17px] font-medium text-[#15803d]">
                Promo applied. You pay ${total}
              </div>
            )}

            {promoError && (
              <div className="relative z-10 mt-3 flex items-center gap-1.5 text-sm text-[#ef4444]">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="7.5" cy="7.5" r="6.5" stroke="#ef4444" strokeWidth="1.5"/>
                  <path d="M7.5 4.5V8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="7.5" cy="10.5" r="0.75" fill="#ef4444"/>
                </svg>
                Invalid promo code. Please try again.
              </div>
            )}

          </div>

          {/* TOTAL */}
          <div  ref={proceedRef} className=" relative rounded-[15px] p-7  border-white">
<img src="/images/bigbox.png" alt="promo" className="absolute z-[10] inset-0 w-full h-full  rounded-[15px] pointer-events-none" />

            <div className="flex justify-between items-start relative z-10">

              <div>

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