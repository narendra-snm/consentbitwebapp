
"use client";


export const runtime = 'edge';

import { useParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react"; // useRef kept for proceedRef
import { createCheckoutSession, upgradeSubscription } from "@/lib/client-api";
import { useDashboardSession } from "../../DashboardSessionProvider";

type Plan = "basic" | "essential" | "growth" | "free" | null;

export default function PricingTable() {
  const params = useParams();
  const siteId = params?.id != null ? String(params.id) : "";
  const { activeOrganizationId, loading: sessionLoading, refresh, effectivePlanId } =
    useDashboardSession();

  /** Which tier column is the active subscription (from /api/sites). */
  const currentTier = String(effectivePlanId || "free").toLowerCase() as
    | "free"
    | "basic"
    | "essential"
    | "growth";

  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // After Stripe redirects back to this page with ?upgraded=1, poll until plan updates then go to dashboard.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") !== "1") return;
    // Clean URL so refresh doesn't re-trigger; also clear the stripe-redirect flag.
    window.history.replaceState({}, "", window.location.pathname);
    sessionStorage.removeItem(`cb_stripe_redirect_${siteId}`);
    // Clear session cache so polls fetch fresh plan data from the server.
    try { sessionStorage.removeItem("cbSessionCache"); } catch { /* ignore */ }
    setPaymentProcessing(true);
    let attempts = 0;
    let t: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      const planNow = String(await refresh({ showLoading: false }) || "free").toLowerCase();
      attempts += 1;
      // Stop as soon as the plan is no longer "free", or after 20 attempts (~30s).
      if (planNow === "free" && attempts < 20) {
        t = setTimeout(poll, 1500);
      } else {
        // Clear stale session cache and set a stable post-payment flag for the dashboard.
        try {
          sessionStorage.removeItem("cbSessionCache");
          sessionStorage.setItem(`cb_post_payment_${siteId}`, "1");
        } catch { /* ignore */ }
        window.location.href = `/dashboard/${siteId}`;
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
      const successUrl = origin ? `${origin}/dashboard/${siteId}/upgrade?upgraded=1` : undefined;
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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#007aff] border-t-transparent animate-spin" />
        <p className="text-[18px] font-semibold text-[#111827]">Proceeding to payment…</p>
        <p className="text-sm text-[#6b7280]">You will be redirected to Stripe shortly.</p>
      </div>
    );
  }

  if (paymentProcessing) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white gap-6">
        <div className="w-14 h-14 rounded-full border-4 border-[#2ec04f] border-t-transparent animate-spin" />
        <p className="text-[18px] font-semibold text-[#111827]">Payment processed!</p>
        <p className="text-sm text-[#6b7280]">Updating your plan — redirecting to dashboard shortly…</p>
      </div>
    );
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
        <div className="grid grid-cols-[200px_200px_220px_316px_1fr] px-6">

          <div></div>

          <PlanHeader name="Free" plan="free" />

          <PlanHeader name="Basic" plan="basic" />

          <PlanHeader name="Essential" plan="essential" recommended />

          <PlanHeader name="Growth" plan="growth" />

          {/* ROW */}
          <Feature label="No of Domains" values={["01", "01", "01", "01"]} />

          <Feature
            label="No of scans"
            values={[
              "100",
              "750",
              "5000 scans",
              "10000 pageviews/m ",
            ]}
          />

          <Feature
            label="No of Page views"
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

          {/* BUTTONS — "Current Plan" sits under the column that matches effectivePlanId (not always Free). */}
          <div className="p-4 border-t border-[#000000]/10"></div>

          <div className="p-4 border-t border-[#000000]/10">
            {currentTier === "free" ? (
              <CurrentPlanButton />
            ) : (
              <span className="text-sm text-[#848199]">—</span>
            )}
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

        {/* BOTTOM */}
        <div className="grid grid-cols-[430px_1fr] gap-4 p-6 pt-15.5">

          {/* PROMO */}
          <div className={`bg-[#e6f1fd] rounded-[15px] p-7 border-[10px] border-dashed border-white ${!selected ? 'opacity-50' : ''}`}>

            <div className="text-lg font-semibold mb-1">Promo code</div>
            {!selected && (
              <p className="text-xs text-[#6b7280] mb-3">Select a plan to apply a promo code.</p>
            )}
            {selected && <div className="mb-4" />}

            <div className="flex border border-[#E5E5E5] bg-white pr-1.5 items-center rounded-lg overflow-hidden">

              <div className="relative flex-1">
                <input
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value); setPromoOn(false); }}
                  disabled={!selected}
                  className="w-full px-4 py-3 pr-8 outline-none disabled:cursor-not-allowed bg-white"
                  placeholder="Enter promo code"
                />
                {promoInput && (
                  <button
                    type="button"
                    onClick={() => { setPromoOn(false); setPromoInput(''); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                onClick={applyPromo}
                disabled={!selected}
                className="bg-[#007aff] rounded-[5px] text-white px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
             <svg className="inline mr-1" width="15" height="10" viewBox="0 0 15 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 4.76471L5.15732 8.67748C5.34984 8.85868 5.65016 8.85868 5.84268 8.67748L14 1" stroke="white" stroke-width="2" stroke-linecap="round"/>
</svg>
   Apply
              </button>

            </div>

            {promoOn && (
              <div className="mt-3 text-[17px] font-medium text-[#111827] text-[#15803d]">
                Promo applied. You pay ${total}
              </div>
            )}

          </div>

          {/* TOTAL */}
          <div ref={proceedRef} className="bg-[#e6f1fd] rounded-[15px] p-7 border-[10px] border-dashed border-white">

            <div className="flex justify-between items-start">

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
         {i === 2 && label === "No of Page views" && (<p className="text-[13px] font-normal text-[#4B5563]">+ $.49 for additional 10000 page views</p>)}
         {i === 3 && label === "No of Page views" && (<p className="text-[13px] font-normal text-[#4B5563]">+ $.39 for additional 10000 page views</p>)}
         {i === 3 && label === "No of scans" && (<p className="text-[13px] font-normal text-[#4B5563]">+ $.49 for additional 10000 page views</p>)}

        </div>
      ))}
    </>
  );
}