import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { firstSetup, createCheckoutSession } from "@/lib/client-api";
import { useDashboardSession } from "../DashboardSessionProvider";

const svgPaths = {
  p131d6680: "M11.8618 9.49625C11.5149 8.89875 10.9993 7.20813 10.9993 5C10.9993 3.67392 10.4725 2.40215 9.53481 1.46447C8.59713 0.526784 7.32536 0 5.99928 0C4.67319 0 3.40142 0.526784 2.46374 1.46447C1.52606 2.40215 0.999276 3.67392 0.999276 5C0.999276 7.20875 0.483026 8.89875 0.136151 9.49625C0.0475697 9.64815 0.000609559 9.82073 5.89435e-06 9.99657C-0.000597771 10.1724 0.0451765 10.3453 0.132712 10.4978C0.220248 10.6503 0.34645 10.777 0.498591 10.8652C0.650732 10.9534 0.823433 10.9999 0.999276 11H3.5499C3.66526 11.5645 3.97204 12.0718 4.41836 12.4361C4.86468 12.8004 5.42314 12.9994 5.99928 12.9994C6.57542 12.9994 7.13387 12.8004 7.58019 12.4361C8.02651 12.0718 8.33329 11.5645 8.44865 11H10.9993C11.1751 10.9998 11.3477 10.9532 11.4997 10.865C11.6518 10.7768 11.7779 10.65 11.8654 10.4975C11.9528 10.345 11.9986 10.1722 11.9979 9.99641C11.9973 9.82062 11.9503 9.64811 11.8618 9.49625ZM5.99928 12C5.68916 11.9999 5.3867 11.9037 5.13352 11.7246C4.88035 11.5455 4.6889 11.2924 4.58553 11H7.41303C7.30965 11.2924 7.11821 11.5455 6.86503 11.7246C6.61185 11.9037 6.30939 11.9999 5.99928 12ZM0.999276 10C1.48053 9.1725 1.99928 7.255 1.99928 5C1.99928 3.93913 2.4207 2.92172 3.17085 2.17157C3.92099 1.42143 4.93841 1 5.99928 1C7.06014 1 8.07756 1.42143 8.8277 2.17157C9.57785 2.92172 9.99928 3.93913 9.99928 5C9.99928 7.25312 10.5168 9.17062 10.9993 10H0.999276Z",
  p139a3680: "M7 2V0.5C7 0.367392 7.05268 0.240215 7.14645 0.146447C7.24021 0.0526784 7.36739 0 7.5 0C7.63261 0 7.75979 0.0526784 7.85355 0.146447C7.94732 0.240215 8 0.367392 8 0.5V2C8 2.13261 7.94732 2.25979 7.85355 2.35355C7.75979 2.44732 7.63261 2.5 7.5 2.5C7.36739 2.5 7.24021 2.44732 7.14645 2.35355C7.05268 2.25979 7 2.13261 7 2ZM11.5 7.5C11.5 8.29113 11.2654 9.06448 10.8259 9.72228C10.3864 10.3801 9.76164 10.8928 9.03073 11.1955C8.29983 11.4983 7.49556 11.5775 6.71964 11.4231C5.94371 11.2688 5.23098 10.8878 4.67157 10.3284C4.11216 9.76902 3.7312 9.05629 3.57686 8.28036C3.42252 7.50444 3.50173 6.70017 3.80448 5.96927C4.10723 5.23836 4.61992 4.61365 5.27772 4.17412C5.93552 3.7346 6.70887 3.5 7.5 3.5C8.56051 3.50116 9.57725 3.92296 10.3271 4.67285C11.077 5.42275 11.4988 6.43949 11.5 7.5ZM10.5 7.5C10.5 6.90666 10.3241 6.32664 9.99441 5.83329C9.66476 5.33994 9.19623 4.95542 8.64805 4.72836C8.09987 4.5013 7.49667 4.44189 6.91473 4.55764C6.33279 4.6734 5.79824 4.95912 5.37868 5.37868C4.95912 5.79824 4.6734 6.33279 4.55764 6.91473C4.44189 7.49667 4.5013 8.09987 4.72836 8.64805C4.95542 9.19623 5.33994 9.66476 5.83329 9.99441C6.32664 10.3241 6.90666 10.5 7.5 10.5C8.2954 10.4992 9.05798 10.1828 9.62041 9.62041C10.1828 9.05798 10.4992 8.2954 10.5 7.5ZM3.14625 3.85375C3.24007 3.94757 3.36732 4.00028 3.5 4.00028C3.63268 4.00028 3.75993 3.94757 3.85375 3.85375C3.94757 3.75993 4.00028 3.63268 4.00028 3.5C4.00028 3.36732 3.94757 3.24007 3.85375 3.14625L2.85375 2.14625C2.75993 2.05243 2.63268 1.99972 2.5 1.99972C2.36732 1.99972 2.24007 2.05243 2.14625 2.14625C2.05243 2.24007 1.99972 2.36732 1.99972 2.5C1.99972 2.63268 2.05243 2.75993 2.14625 2.85375L3.14625 3.85375ZM3.14625 11.1462L2.14625 12.1462C2.05243 12.2401 1.99972 12.3673 1.99972 12.5C1.99972 12.6327 2.05243 12.7599 2.14625 12.8538C2.24007 12.9476 2.36732 13.0003 2.5 13.0003C2.63268 13.0003 2.75993 12.9476 2.85375 12.8538L3.85375 11.8538C3.90021 11.8073 3.93706 11.7521 3.9622 11.6914C3.98734 11.6308 4.00028 11.5657 4.00028 11.5C4.00028 11.4343 3.98734 11.3692 3.9622 11.3086C3.93706 11.2479 3.90021 11.1927 3.85375 11.1462C3.8073 11.0998 3.75214 11.0629 3.69145 11.0378C3.63075 11.0127 3.5657 10.9997 3.5 10.9997C3.4343 10.9997 3.36925 11.0127 3.30855 11.0378C3.24786 11.0629 3.19271 11.0998 3.14625 11.1462ZM11.5 4C11.5657 4.00005 11.6307 3.98716 11.6914 3.96207C11.7521 3.93697 11.8073 3.90017 11.8538 3.85375L12.8538 2.85375C12.9476 2.75993 13.0003 2.63268 13.0003 2.5C13.0003 2.36732 12.9476 2.24007 12.8538 2.14625C12.7599 2.05243 12.6327 1.99972 12.5 1.99972C12.3673 1.99972 12.2401 2.05243 12.1462 2.14625L11.1462 3.14625C11.0762 3.21618 11.0286 3.3053 11.0092 3.40235C10.9899 3.49939 10.9998 3.59998 11.0377 3.6914C11.0756 3.78281 11.1397 3.86092 11.222 3.91586C11.3043 3.9708 11.4011 4.00008 11.5 4ZM11.8538 11.1462C11.7599 11.0524 11.6327 10.9997 11.5 10.9997C11.3673 10.9997 11.2401 11.0524 11.1462 11.1462C11.0524 11.2401 10.9997 11.3673 10.9997 11.5C10.9997 11.6327 11.0524 11.7599 11.1462 11.8538L12.1462 12.8538C12.1927 12.9002 12.2479 12.9371 12.3086 12.9622C12.3692 12.9873 12.4343 13.0003 12.5 13.0003C12.5657 13.0003 12.6308 12.9873 12.6914 12.9622C12.7521 12.9371 12.8073 12.9002 12.8538 12.8538C12.9002 12.8073 12.9371 12.7521 12.9622 12.6914C12.9873 12.6308 13.0003 12.5657 13.0003 12.5C13.0003 12.4343 12.9873 12.3692 12.9622 12.3086C12.9371 12.2479 12.9002 12.1927 12.8538 12.1462L11.8538 11.1462ZM2.5 7.5C2.5 7.36739 2.44732 7.24021 2.35355 7.14645C2.25979 7.05268 2.13261 7 2 7H0.5C0.367392 7 0.240215 7.05268 0.146447 7.14645C0.0526784 7.24021 0 7.36739 0 7.5C0 7.63261 0.0526784 7.75979 0.146447 7.85355C0.240215 7.94732 0.367392 8 0.5 8H2C2.13261 8 2.25979 7.94732 2.35355 7.85355C2.44732 7.75979 2.5 7.63261 2.5 7.5ZM7.5 12.5C7.36739 12.5 7.24021 12.5527 7.14645 12.6464C7.05268 12.7402 7 12.8674 7 13V14.5C7 14.6326 7.05268 14.7598 7.14645 14.8536C7.24021 14.9473 7.36739 15 7.5 15C7.63261 15 7.75979 14.9473 7.85355 14.8536C7.94732 14.7598 8 14.6326 8 14.5V13C8 12.8674 7.94732 12.7402 7.85355 12.6464C7.75979 12.5527 7.63261 12.5 7.5 12.5ZM14.5 7H13C12.8674 7 12.7402 7.05268 12.6464 7.14645C12.5527 7.24021 12.5 7.36739 12.5 7.5C12.5 7.63261 12.5527 7.75979 12.6464 7.85355C12.7402 7.94732 12.8674 8 13 8H14.5C14.6326 8 14.7598 7.94732 14.8536 7.85355C14.9473 7.75979 15 7.63261 15 7.5C15 7.36739 14.9473 7.24021 14.8536 7.14645C14.7598 7.05268 14.6326 7 14.5 7Z",
  p976e200: "M7.06185 6.00307L11.7868 1.28557C11.9281 1.14434 12.0074 0.952795 12.0074 0.753069C12.0074 0.553343 11.9281 0.361797 11.7868 0.220569C11.6456 0.079341 11.4541 0 11.2543 0C11.0546 0 10.8631 0.079341 10.7218 0.220569L6.00435 4.94557L1.28685 0.220569C1.14562 0.079341 0.954075 1.77326e-07 0.754349 1.78814e-07C0.554623 1.80302e-07 0.363077 0.079341 0.221849 0.220569C0.0806209 0.361797 0.00128013 0.553343 0.00128013 0.753069C0.00128013 0.952795 0.0806209 1.14434 0.221849 1.28557L4.94685 6.00307L0.221849 10.7206C0.151552 10.7903 0.0957569 10.8732 0.0576804 10.9646C0.0196039 11.056 0 11.1541 0 11.2531C0 11.3521 0.0196039 11.4501 0.0576804 11.5415C0.0957569 11.6329 0.151552 11.7158 0.221849 11.7856C0.291571 11.8559 0.374522 11.9117 0.465916 11.9497C0.557311 11.9878 0.65534 12.0074 0.754349 12.0074C0.853358 12.0074 0.951387 11.9878 1.04278 11.9497C1.13418 11.9117 1.21713 11.8559 1.28685 11.7856L6.00435 7.06057L10.7218 11.7856C10.7916 11.8559 10.8745 11.9117 10.9659 11.9497C11.0573 11.9878 11.1553 12.0074 11.2543 12.0074C11.3534 12.0074 11.4514 11.9878 11.5428 11.9497C11.6342 11.9117 11.7171 11.8559 11.7868 11.7856C11.8571 11.7158 11.9129 11.6329 11.951 11.5415C11.9891 11.4501 12.0087 11.3521 12.0087 11.2531C12.0087 11.1541 11.9891 11.056 11.951 10.9646C11.9129 10.8732 11.8571 10.7903 11.7868 10.7206L7.06185 6.00307Z",
};

type BillingPeriod = "monthly" | "yearly";
type PlanType = "free" | "basic" | "essential" | "growth";

interface PricingPlan {
  id: PlanType;
  name: string;
  price: number;
  domains: string;
  scans: string;
  pageViews: string;
  iabTcf: string;
  compliance: string;
  buttonText: string;
  buttonColor: string;
  isRecommended?: boolean;
  additionalNote?: string;
}

const plans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    domains: "01",
    scans: "100",
    pageViews: "7500",
    iabTcf: "NIL",
    compliance: "GDPR/CCPA",
    buttonText: "Take this plan",
    buttonColor: "#007AFF",
  },
  {
    id: "basic",
    name: "Basic",
    price: 9,
    domains: "01",
    scans: "750",
    pageViews: "100,000/m",
    iabTcf: "NIL",
    compliance: "GDPR/CCPA",
    buttonText: "14 day free trial",
    buttonColor: "#007AFF",
  },
  {
    id: "essential",
    name: "Essential",
    price: 20,
    domains: "01",
    scans: "5000",
    pageViews: "500,000",
    iabTcf: "Yes",
    compliance: "GDPR+CCPA",
    buttonText: "14 day free trial",
    buttonColor: "#4CBB66",
    isRecommended: true,
    additionalNote: "+ $.49 for additional 10000 page views",
  },
  {
    id: "growth",
    name: "Growth",
    price: 56,
    domains: "01",
    scans: "10000",
    pageViews: "2 Million/m",
    iabTcf: "Yes",
    compliance: "GDPR+CCPA",
    buttonText: "14 day free trial",
    buttonColor: "#007AFF",
    additionalNote: "+ $.39 for additional 10000 page views",
  },
];

export default function AddNewSiteModal({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const { refresh, activeSiteId, activeOrganizationId, sites } = useDashboardSession();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const checkoutTab = useRef<Window | null>(null);

  const hasExistingFreeSite = useMemo(() => {
    const rows = Array.isArray(sites) ? sites : [];
    return rows.some((site: any) => {
      const raw =
        site?.planId ??
        site?.plan_id ??
        site?.subscription_plan ??
        site?.plan ??
        "free";
      return String(raw || "free").toLowerCase() === "free";
    });
  }, [sites]);

  const freeSiteLimitReached = selectedPlan === "free" && hasExistingFreeSite;

  // Poll for checkout tab closure
  useEffect(() => {
    if (!checkoutPending) return;
    const timer = setInterval(() => {
      if (checkoutTab.current?.closed) {
        clearInterval(timer);
        setCheckoutPending(false);
        setSubmitting(false);
        void refresh({ showLoading: false });
        onClose?.();
      }
    }, 800);
    return () => clearInterval(timer);
  }, [checkoutPending, refresh, onClose]);

  function handleCancelCheckout() {
    if (checkoutTab.current && !checkoutTab.current.closed) {
      checkoutTab.current.close();
    }
    checkoutTab.current = null;
    setCheckoutPending(false);
    setSubmitting(false);
  }

  function normalizeDomain(raw: string): string {
    return raw.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
  }

  async function handlePlanAction(planId: PlanType) {
    if (planId === "free" && hasExistingFreeSite) {
      setSubmitError("Free plan allows only one site. Upgrade to add more sites.");
      return;
    }
    setSelectedPlan(planId);
    const domain = normalizeDomain(websiteUrl);
    if (!domain) {
      setUrlError("Please enter a valid website URL.");
      return;
    }
    setUrlError(null);
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (planId === "free") {
        const result = await firstSetup({ websiteUrl: domain });
        const newSiteId = String(result?.siteId || result?.site?.id || "").trim();
        await refresh({ showLoading: false });
        onClose?.();
        router.push(newSiteId ? `/dashboard/${newSiteId}` : "/dashboard");
      } else {
        if (!activeOrganizationId) {
          setSubmitError("Organization not loaded. Please refresh and try again.");
          setSubmitting(false);
          return;
        }
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const data = await createCheckoutSession({
          organizationId: activeOrganizationId,
          planId: planId as "basic" | "essential" | "growth",
          interval: billingPeriod === "yearly" ? "yearly" : "monthly",
          siteId: null,
          siteName: domain,
          siteDomain: domain,
          successUrl: `${origin}/dashboard?postSetup=1&domain=${encodeURIComponent(domain)}`,
          cancelUrl: `${origin}/dashboard`,
        });
        const tab = window.open(data.url, "_blank");
        checkoutTab.current = tab;
        setCheckoutPending(true);
      }
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Failed to add website");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-[10px] max-w-[1136px] shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Submitting overlay */}
        {submitting && (
          <div className="absolute inset-0 bg-white/75 z-50 flex flex-col items-center justify-center rounded-[10px] gap-3">
            <svg
              className="animate-spin h-8 w-8 text-[#007AFF]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-[#007AFF] font-medium">
              {selectedPlan === "free" ? "Setting up your site…" : "Redirecting to checkout…"}
            </p>
          </div>
        )}

        {/* Checkout pending full-page overlay */}
        {checkoutPending && (
          <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm">
            <svg
              className="animate-spin h-10 w-10 text-[#007AFF] mb-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-[#231d4f] font-semibold text-lg mb-1">Complete your payment in the new tab</p>
            <p className="text-gray-500 text-sm mb-7">Waiting for confirmation from Stripe…</p>
            <button
              type="button"
              onClick={handleCancelCheckout}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-[#e6f1fd] h-[67px] rounded-t-[10px] px-[28px] flex items-center justify-between">
          <p
            className="font-semibold leading-[20px] text-[#111827] text-[16px]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Add New Site
          </p>
          <button onClick={onClose} className="w-[18px] h-[18px] flex items-center justify-center">
            <svg className="w-[12px] h-[12px]" fill="none" viewBox="0 0 12.0087 12.0074">
              <path d={svgPaths.p976e200} fill="#2B2B2B" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="pb-[60px]">
          {/* Website URL Section */}
          <div className="mt-[26px] grid grid-cols-[1fr_1fr] gap-4 px-[28px]">
            <div className="flex items-center gap-7">
              <label
                className="font-semibold leading-[normal] text-[#161616] text-[14px] tracking-[-0.28px] block"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Website URL *
              </label>
              <div className="relative w-full max-w-[402px]">
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => {
                    setWebsiteUrl(e.target.value);
                    if (urlError) setUrlError(null);
                  }}
                  placeholder="acme.com"
                  className={`w-full h-[48px] bg-white border rounded-lg px-[18px] font-['DM_Sans:Regular',sans-serif] font-normal text-[#161616] text-[14px] tracking-[-0.28px] outline-none focus:border-[#007aff] ${
                    urlError ? "border-[#b91c1c]" : "border-[#e5e5e5]"
                  }`}
                  style={{ fontVariationSettings: "'opsz' 14" }}
                />
                {urlError && (
                  <p className="mt-1.5 text-xs text-[#b91c1c] flex items-center gap-1">
                    <span>⚠</span>
                    {urlError}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <p
                className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[normal] opacity-60 text-[#161616] text-[14px] tracking-[-0.28px]"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Add a new website to your organization. Enter your website URL. You can configure banner settings in the Cookie Banner tab.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-black/10 my-[32px]" />

          {/* Choose Pricing Plan Section */}
          <div className="mb-[28px] flex items-center gap-3.25 px-[28px]">
            <p
              className="font-semibold leading-[normal] text-[#161616] text-sm tracking-[-0.28px]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Choose Pricing plan
            </p>

            {/* Billing Toggle */}
            <div className="relative h-[44px] w-[255px] flex rounded-[22px] bg-[#f1f5f9] overflow-hidden">
              {/* Sliding pill */}
              <div
                className={`absolute top-0 h-full bg-[#007aff] rounded-[22px] shadow-[0px_5px_7px_0px_rgba(82,67,194,0.23)] transition-all duration-300 ${
                  billingPeriod === "monthly" ? "left-0 w-[100px]" : "left-[100px] right-0"
                }`}
              />
              {/* Monthly */}
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`z-10 pl-[23px] flex items-center justify-center font-extrabold text-[14px] pr-0 whitespace-nowrap ${
                  billingPeriod === "monthly" ? "text-white" : "text-[#848199]"
                }`}
              >
                MONTHLY
              </button>
              {/* Yearly */}
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`z-10 flex-1 flex items-center justify-center font-extrabold text-[14px] whitespace-nowrap ${
                  billingPeriod === "yearly" ? "text-white" : "text-[#848199]"
                }`}
              >
                YEARLY (20% OFF)
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-4 gap-[25px] relative px-[28px]">
            {plans.map((plan) => {
              const displayPrice =
                billingPeriod === "yearly" && plan.price > 0
                  ? Math.floor(plan.price * 0.8)
                  : plan.price;
              const isDisabled = hasExistingFreeSite && plan.id === "free";

              return (
                <div
                  key={plan.id}
                  className={`relative z-20 ${
                    !isDisabled ? "hover:scale-105 transition-transform duration-300 ease-out" : ""
                  }`}
                >
                  {/* Recommended Badge */}
                  {plan.isRecommended && (
                    <div className="absolute -top-[21px] left-1/2 -translate-x-1/2 z-10 w-full">
                      <div className="bg-[#4cbb66] rounded-t-lg px-2.5 pb-2 pt-1.5 flex items-center justify-baseline">
                        <p
                          className="font-semibold leading-[normal] text-[10px] text-white tracking-[-0.2px] uppercase whitespace-nowrap"
                          style={{ fontVariationSettings: "'opsz' 14" }}
                        >
                          Recommended
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Card */}
                  <div
                    onClick={() => {
                      if (!isDisabled) setSelectedPlan(plan.id as PlanType);
                    }}
                    className={`relative rounded-[8px] border ${
                      plan.isRecommended
                        ? "border-[#e5e5e5] bg-[#f0fff1]"
                        : "border-[#e5e5e5] bg-[#e6f1fd]"
                    } ${
                      selectedPlan != null && selectedPlan === plan.id
                        ? "ring-2 ring-[#007aff] border-[#007aff]"
                        : !isDisabled
                        ? "hover:border-gray-300 hover:ring-1 hover:ring-gray-200 cursor-pointer"
                        : "cursor-not-allowed"
                    } ${isDisabled ? "opacity-60" : ""}`}
                  >
                    {/* Card Header */}
                    <div className="bg-white border-b border-[#e5e5e5] rounded-t-[8px] px-[12px] py-[16px] pt-[21px] h-[69px] flex items-center justify-between">
                      <p
                        className={`font-bold leading-[normal] text-[#007aff] tracking-[-${
                          plan.id === "free" ? "0.9" : "0.8"
                        }px]`}
                        style={{ fontVariationSettings: "'opsz' 14" }}
                      >
                        {plan.name}
                      </p>
                      <div className="flex items-end gap-[2px]">
                        {displayPrice > 0 && (
                          <>
                            <p
                              className="font-medium leading-tight text-[#231d4f] text-[36px] tracking-[-2px]"
                              style={{ fontVariationSettings: "'opsz' 14" }}
                            >
                              ${displayPrice}
                            </p>
                            <p
                              className="font-medium leading-normal text-[#848199] text-base uppercase pb-[2px]"
                              style={{ fontVariationSettings: "'opsz' 14" }}
                            >
                              /m
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Card Stats */}
                    <div className="px-[12px] pt-2 pb-[36px] grid grid-cols-2 gap-x-[8px] gap-y-[27px]">
                      {[
                        { label: "No of Domains", value: plan.domains },
                        { label: "No of scans", value: plan.scans },
                        { label: "No of Page views", value: plan.pageViews },
                        { label: "IAB / TCF", value: plan.iabTcf, muted: plan.iabTcf === "NIL" },
                        { label: "Compliance", value: plan.compliance, muted: plan.iabTcf === "NIL" },
                      ].map(({ label, value, muted }) => (
                        <div key={label}>
                          <p
                            className="font-normal leading-[normal] text-[#000000]/70 text-[12px] tracking-[-0.22px] mb-[4px]"
                            style={{ fontVariationSettings: "'opsz' 9" }}
                          >
                            {label}
                          </p>
                          <p
                            className={`font-bold leading-[normal] text-[17px] ${
                              muted ? "text-[#8e8e8e]" : "text-[#5243c2]"
                            }`}
                            style={{ fontVariationSettings: "'opsz' 14" }}
                          >
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Card Button */}
                    <div className="px-[12px] pb-[37px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isDisabled) {
                            void handlePlanAction(plan.id as PlanType);
                          }
                        }}
                        disabled={isDisabled}
                        className="px-4.5 h-[44px] rounded-[8px] flex items-center justify-center cursor-pointer disabled:cursor-not-allowed w-full"
                        style={{ backgroundColor: plan.buttonColor }}
                      >
                        <p
                          className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[15px] text-white whitespace-nowrap"
                          style={{ fontVariationSettings: "'opsz' 14" }}
                        >
                          {plan.buttonText}
                        </p>
                      </button>
                    </div>

                    {/* Additional Note */}
                    {plan.additionalNote && (
                      <div className="absolute -bottom-[24px] left-0 right-0 px-[12px]">
                        <p
                          className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[normal] text-[#4B5563] text-[13px] tracking-[-0.22px] text-left"
                          style={{ fontVariationSettings: "'opsz' 9" }}
                        >
                          {plan.additionalNote}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit Error */}
          {submitError ? (
            <p className="mt-8 text-sm text-[#b91c1c] px-[28px] flex items-center gap-1">
              <span>⚠</span>
              {submitError}
            </p>
          ) : (
            <p className="mt-8 text-sm text-[#b91c1c] invisible px-[28px]">hi</p>
          )}
        </div>
      </div>
    </div>
  );
}