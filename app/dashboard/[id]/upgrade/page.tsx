"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createCheckoutSession } from "@/lib/client-api";
import { useDashboardSession } from "../../DashboardSessionProvider";
import { Playwrite_NG_Modern } from "next/font/google";

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs text-[#374151] shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal text-center">
        {text}
      </span>
    </span>
  );
}

function TooltipBelow({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group inline-flex">
      {children}
      <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-[220px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs text-[#374151] shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal text-center">
        {text}
      </span>
    </span>
  );
}

type Plan = "basic" | "essential" | "growth" | "free" | null;
type CheckoutStage = "redirecting" | "processing_success" | null;

export default function PricingTable() {
  const params = useParams();
  const siteId = params?.id != null ? String(params.id) : "";
  const router = useRouter();
  const { activeOrganizationId, loading: sessionLoading, refresh, effectivePlanId } =
    useDashboardSession();

  /** Which tier column is the active subscription (from /api/sites). */
  const currentTier = String(effectivePlanId || "free").toLowerCase() as
    | "free"
    | "basic"
    | "essential"
    | "growth";

  // // After Stripe redirects back, reload sites + effectivePlanId (webhook may finish a moment later).
  // useEffect(() => {
  //   if (typeof window === "undefined") return;
  //   const ok = new URLSearchParams(window.location.search).get("success");
  //   if (ok !== "1") return;
  //   void refresh({ showLoading: false });
  //   // Webhook can lag; refresh again so "Current plan" moves off Free.
  //   const t = window.setTimeout(() => void refresh({ showLoading: false }), 2500);
  //   return () => window.clearTimeout(t);
  // }, [refresh]);
useEffect(() => {
  if (typeof window === "undefined") return;

  const search = new URLSearchParams(window.location.search);
  const ok = search.get("success");
  const targetPlan = (search.get("plan") || "").toLowerCase();
  const sessionId = search.get("session_id");

  if (ok !== "1" || !targetPlan) return;

  // Show a "payment succeeded" loading state while we wait for the webhook and session refresh.
  setCheckoutStage("processing_success");

  let cancelled = false;
  let timer: number | undefined;

  const cleanUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("success");
    url.searchParams.delete("canceled");
    url.searchParams.delete("plan");
    url.searchParams.delete("session_id");
    window.history.replaceState({}, "", url.toString());
  };

  const poll = async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (cancelled) return;

      await refresh({ showLoading: false });

      const current = String(effectivePlanId || "free").toLowerCase();

      if (current === targetPlan) {
        cleanUrl();
        // We have the latest plan locally — send the user back to the dashboard.
        router.replace(`/dashboard/${encodeURIComponent(siteId)}?success=1`);
        return;
      }

      await new Promise((resolve) => {
        timer = window.setTimeout(resolve, 1500);
      });
    }

    cleanUrl();
    // Even if the webhook is delayed, send the user back to the dashboard; it will refresh there too.
    router.replace(`/dashboard/${encodeURIComponent(siteId)}?success=1`);
  };

  void poll();

  return () => {
    cancelled = true;
    if (timer) window.clearTimeout(timer);
  };
}, [refresh, effectivePlanId, router, siteId]);

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

  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selected, setSelected] = useState<Plan>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoOn, setPromoOn] = useState(false);
  const [checkoutStage, setCheckoutStage] = useState<CheckoutStage>(null);
  // Kept for backwards-compatibility while we remove the old overlay UI.
  // (Checkout now redirects in the same tab.)
  const [awaitingPayment] = useState(false);

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

//   async function checkoutWithPlan(plan: "basic" | "essential" | "growth" | "free") {
//     if (sessionLoading) {
//       alert("Please wait — loading your account.");
//       return;
//     }
//     if (!activeOrganizationId) {
//       alert(
//         "We could not load your organization. Refresh the page or sign in again.",
//       );
//       return;
//     }
//     if (!siteId) {
//       alert("Missing site. Open Upgrade from a site in the dashboard.");
//       return;
//     }
//     setCheckoutLoading(true);
//     try {
//      const origin = typeof window !== "undefined" ? window.location.origin : "";

// const successUrl = origin
//   ? `${origin}/dashboard/${siteId}/upgrade?success=1`
//   : undefined;

// const cancelUrl = origin
//   ? `${origin}/dashboard/${siteId}/upgrade?canceled=1`
//   : undefined;

// const { url } = await createCheckoutSession({
//   organizationId: activeOrganizationId,
//   planId: plan,
//   interval: billing === "yearly" ? "yearly" : "monthly",
//   siteId,
//   successUrl,
//   cancelUrl,
// });
// window.location.assign(url);
//     } catch (e) {
//       alert(e instanceof Error ? e.message : "Could not start checkout.");
//     } finally {
//       setCheckoutLoading(false);
//     }
//   }
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

  if (plan === "free") {
    alert("Please select a paid plan.");
    return;
  }

  setCheckoutStage("redirecting");

  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const basePath = `/dashboard/${siteId}/upgrade`;

    const successUrl = origin
      ? `${origin}${basePath}?success=1&plan=${encodeURIComponent(plan)}&session_id={CHECKOUT_SESSION_ID}`
      : undefined;

    const cancelUrl = origin
      ? `${origin}${basePath}?canceled=1`
      : undefined;

    const { url } = await createCheckoutSession({
      organizationId: activeOrganizationId,
      planId: plan,
      interval: billing === "yearly" ? "yearly" : "monthly",
      siteId,
      successUrl,
      cancelUrl,
    });

    window.location.assign(url);
  } catch (e) {
    alert(e instanceof Error ? e.message : "Could not start checkout.");
    setCheckoutStage(null);
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
      <Tooltip text={isSelected ? "This plan is selected. Click Proceed to pay to continue." : `Switch to the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.`}>
        <button
          type="button"
          disabled={checkoutStage !== null}
          onClick={() => {
            setSelected(plan);
          }}
          className={`px-6 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-85 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed
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
      </Tooltip>
    );
  };

  return (
    <div className="flex justify-center w-full border-t border-[#000000]/10">
      {/* Checkout loading overlay (redirecting / payment success processing) */}
      {checkoutStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-[380px] rounded-[16px] bg-white p-8 shadow-lg text-center">
            <div className="mb-4 flex justify-center">
              <div className="h-10 w-10 rounded-full border-4 border-[#007aff] border-t-transparent animate-spin" />
            </div>
            {checkoutStage === "redirecting" ? (
              <>
                <p className="text-base font-semibold text-black mb-1">Redirecting to checkout…</p>
                <p className="text-sm text-[#4b5563]">Opening Stripe checkout in this tab.</p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-black mb-1">Payment succeeded</p>
                <p className="text-sm text-[#4b5563]">
                  Updating your dashboard with the latest plan details…
                </p>
              </>
            )}
          </div>
        </div>
      )}
      <div className="max-w-[1292px] w-full bg-white  overflow-hidden">

        {/* HEADER */}
        <div className="flex gap-8 items-center  px-9 py-3.5 pt-7 mt-2 ">
          <div className="text-xl font-semibold ">
            Chose your Payment Plan
          </div>
          <div className="flex bg-[#f1f5f9] rounded-[22px] p-1 gap-2.25">
            <TooltipBelow text="Billed month-to-month. Cancel anytime.">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-5.75 py-2 text-[14px] h-[44px] font-extrabold rounded-[22px] cursor-pointer ${
                  billing === "monthly"
                    ? "bg-[#007aff] text-white"
                    : "text-[#848199]"
                }`}
              >
                MONTHLY
              </button>
            </TooltipBelow>

            <TooltipBelow text="Pay for a full year and save 20% compared to monthly billing.">
              <button
                onClick={() => setBilling("yearly")}
                className={`px-5.75 py-2 text-[14px] h-[44px] font-extrabold rounded-[22px] cursor-pointer ${
                  billing === "yearly"
                    ? "bg-[#007aff] text-white"
                    : "text-[#848199]"
                }`}
              >
                YEARLY (20% OFF)
              </button>
            </TooltipBelow>
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
            label="No of Scans"
            values={[
              "100",
              "750",
              "5000 scans",
              "10000 pageviews/m ",
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

            <div className="flex border rounded-lg overflow-hidden">

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

              <Tooltip text={!selected ? "Select a plan first to apply a promo code." : "Apply your promo code for a discount."}>
                <button
                  onClick={applyPromo}
                  disabled={!selected}
                  className="bg-[#007aff] text-white px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </Tooltip>

            </div>

            {promoOn && (
              <div className="mt-3 text-[17px] font-medium text-[#111827] text-[#15803d]">
                Promo applied. You pay ${total}
              </div>
            )}

          </div>

          {/* TOTAL */}
          <div className="bg-[#e6f1fd] rounded-[15px] p-7 border-[10px] border-dashed border-white">

            <div className="flex justify-between items-start">

              <div>

                <div className="text-gray-500">Total</div>

                <div className="text-[40px] text-[#007aff] font-semibold tracking-[-2px]">
                  ${total}
                </div>
               
                {/* <div>
                  {billing === "yearly"
                    ? "(Billed annually)"
                    : "(Billed monthly)"}
                </div> */}
                <div className="text-gray-500">Payable now</div>

              </div>

              <Tooltip text={!selected ? "Select a plan above to proceed to payment." : `Proceed to pay for the ${selected.charAt(0).toUpperCase() + selected.slice(1)} plan via Stripe.`}>
                <button
                  type="button"
                  disabled={checkoutStage !== null || !selected}
                  onClick={() => {
                    if (!selected) {
                      alert("Select Basic, Essential, or Growth first.");
                      return;
                    }
                    void checkoutWithPlan(selected);
                  }}
                  className="bg-[#2ec04f] border-2 border-white outline-1 outline-[#2ec04f] text-white px-6 py-3 rounded-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {checkoutStage === "redirecting" ? "Redirecting…" : "Proceed to pay"}
                </button>
              </Tooltip>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
const FEATURE_TOOLTIPS: Record<string, string> = {
  "No of Domains": "Number of websites you can add under this plan.",
  "No of Scans": "How many automated cookie scans you can run per month.",
  "No of Page Views": "Maximum monthly page views tracked for consent analytics.",
  "IAB / TCF": "IAB Transparency & Consent Framework — required for ad networks and publishers in the EU.",
  "Compliance": "Privacy regulations covered. GDPR for EU visitors, CCPA for California visitors.",
};

function Feature({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  const tip = FEATURE_TOOLTIPS[label];
  return (
    <>
      <div className="p- py-5.5 border-t border-[#000000]/10 text-[17px] flex items-center gap-1.5">
        {label}
        {tip && (
          <Tooltip text={tip}>
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#e5e7eb] text-[#6b7280] text-[10px] font-bold cursor-default select-none">?</span>
          </Tooltip>
        )}
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
