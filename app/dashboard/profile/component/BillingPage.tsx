import { useEffect, useMemo, useState } from "react";
import { getBillingInvoices, type BillingInvoice } from "@/lib/client-api";

const svgPaths =  {
p112ba780: "M6.3 0H2.8C2.41395 0 2.1 0.31395 2.1 0.7V2.1H0.7C0.31395 2.1 0 2.41395 0 2.8V6.3C0 6.68605 0.31395 7 0.7 7H4.2C4.58605 7 4.9 6.68605 4.9 6.3V4.9H6.3C6.68605 4.9 7 4.58605 7 4.2V0.7C7 0.31395 6.68605 0 6.3 0ZM0.7 6.3V2.8H4.2L4.2007 6.3H0.7ZM6.3 4.2H4.9V2.8C4.9 2.41395 4.58605 2.1 4.2 2.1H2.8V0.7H6.3V4.2Z",
p1e2ddd80: "M10.1417 7.15C10.5083 8.45833 11.5333 9.49167 12.85 9.85833",
p25ef6100: "M13.3333 1.66667H6.66667C3.33333 1.66667 1.66667 3.33333 1.66667 6.66667V17.5C1.66667 17.9583 2.04167 18.3333 2.5 18.3333H13.3333C16.6667 18.3333 18.3333 16.6667 18.3333 13.3333V6.66667C18.3333 3.33333 16.6667 1.66667 13.3333 1.66667Z",
p2846bb80: "M6.85355 0.5C6.85355 0.223858 6.6297 0 6.35355 0H1.85355C1.57741 0 1.35355 0.223858 1.35355 0.5C1.35355 0.776142 1.57741 1 1.85355 1H5.85355V5C5.85355 5.27614 6.07741 5.5 6.35355 5.5C6.6297 5.5 6.85355 5.27614 6.85355 5V0.5ZM0.353553 6.5L0.707107 6.85355L6.70711 0.853553L6.35355 0.5L6 0.146447L0 6.14645L0.353553 6.5Z",
p378e8c00: "M10.7583 6.53333L6.43334 10.8583C6.26667 11.025 6.10834 11.35 6.07501 11.5833L5.84168 13.2333C5.75834 13.8333 6.17501 14.25 6.77501 14.1667L8.42499 13.9333C8.65832 13.9 8.98335 13.7417 9.15001 13.575L13.475 9.25C14.2167 8.50833 14.575 7.64167 13.475 6.54166C12.375 5.43333 11.5083 5.78333 10.7583 6.53333Z",
pbc14700: "M5.25 4.08333H0.583333V2.04167H0V4.08333C0 4.40504 0.261625 4.66667 0.583333 4.66667H5.25C5.57171 4.66667 5.83333 4.40504 5.83333 4.08333V2.04167H5.25V4.08333Z",
pc41fd00: "M2.91667 3.5L4.08333 2.04167H3.20833V0H2.625V2.04167H1.75L2.91667 3.5Z",
}

// import imgMastercard from "figma:asset/f16ae9b9607d2d26ba4c40c3c8f6541a860101c4.png";

interface Invoice {
  date: string;
  invoiceNumber: string;
  amount: string;
  paymentMethod: string;
  status: string;
  hostedInvoiceUrl?: string | null;
  invoicePdf?: string | null;
}

type Props = {
  currentPlan: "Free" | "Basic" | "Essential" | "Growth";
  domainCount: number;
  organizationId?: string | null;
  scansCount?: number;
  pageViews?: number;
};

export default function BillingPage({
  currentPlan,
  domainCount,
  organizationId,
  scansCount = 0,
  pageViews = 0,
}: Props) {
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [rawInvoices, setRawInvoices] = useState<BillingInvoice[]>([]);

  useEffect(() => {
    if (!organizationId) {
      setRawInvoices([]);
      return;
    }
    let cancelled = false;
    setInvoiceLoading(true);
    setInvoiceError(null);
    getBillingInvoices(organizationId, 20)
      .then((res) => {
        if (!cancelled) setRawInvoices(Array.isArray(res.invoices) ? res.invoices : []);
      })
      .catch((e) => {
        if (!cancelled) setInvoiceError(e?.message || "Failed to load invoices");
      })
      .finally(() => {
        if (!cancelled) setInvoiceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const invoices = useMemo<Invoice[]>(() => {
    return (rawInvoices || []).map((inv) => {
      const created = inv.created ? new Date(inv.created) : null;
      const date = created && !Number.isNaN(created.getTime())
        ? created.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
        : "-";
      const amount = ((inv.amountPaid ?? inv.amountDue ?? 0) / 100).toFixed(2) + " USD";
      const status = String(inv.status || "open").toLowerCase() === "paid" ? "Completed" : String(inv.status || "Open");
      return {
        date,
        invoiceNumber: inv.number || inv.id,
        amount,
        paymentMethod: "Card",
        status,
        hostedInvoiceUrl: inv.hostedInvoiceUrl,
        invoicePdf: inv.invoicePdf,
      };
    });
  }, [rawInvoices]);

  const planLabel = currentPlan;
  const upgradeCta =
    currentPlan === "Free"
      ? "Upgrade to Basic"
      : currentPlan === "Basic"
        ? "Upgrade to Essential"
        : currentPlan === "Essential"
          ? "Upgrade to Growth"
          : "Manage Subscription";
  const canUpgrade = currentPlan !== "Growth";

  return (
      
        <div className="grid grid-cols-[614px_1fr] gap-2.5 overflow-auto">
          {/* Left Column - Invoices */}
          <div className="px-3.5 pt-6 bg-[#FBFBFB] rounded-[10px] border border-[#EBEBEB] h-fit">
            {/* Header with Filters */}
            <div className="flex items-center justify-between mb-[30px]">
              <p className=" font-semibold leading-[20px] text-[16px] text-black tracking-[-1px]" style={{ fontVariationSettings: "'opsz' 14" }}>
                Invoices
              </p>
              <div className="flex items-center gap-[12px]">
                {/* Year Dropdown */}
                <div className="relative">
                  <select disabled className="appearance-none bg-white border border-[#e5e5e5] rounded-[5px] h-[36px] px-[12px] pr-[32px] font-['DM_Sans:Regular',sans-serif] font-normal text-[14px] text-black outline-none cursor-pointer disabled:opacity-60" style={{ fontVariationSettings: "'opsz' 14" }}>
                    <option>Year</option>
                  </select>
                  <div className="absolute right-[12px] top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                      <path d="M1 1L5 5L9 1" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
                
                {/* Month Dropdown */}
                <div className="relative">
                  <select disabled className="appearance-none bg-white border border-[#e5e5e5] rounded-[5px] h-[36px] px-[12px] pr-[32px] font-['DM_Sans:Regular',sans-serif] font-normal text-[14px] text-black outline-none cursor-pointer disabled:opacity-60" style={{ fontVariationSettings: "'opsz' 14" }}>
                    <option>Month</option>
                  </select>
                  <div className="absolute right-[12px] top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                      <path d="M1 1L5 5L9 1" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
                
                {/* All Domains Dropdown */}
                <div className="relative">
                  <select disabled className="appearance-none bg-white border border-[#e5e5e5] rounded-[5px] h-[36px] px-[12px] pr-[32px] font-['DM_Sans:Regular',sans-serif] font-normal text-[14px] text-black outline-none cursor-pointer disabled:opacity-60" style={{ fontVariationSettings: "'opsz' 14" }}>
                    <option>All Domains</option>
                  </select>
                  <div className="absolute right-[12px] top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                      <path d="M1 1L5 5L9 1" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[100px_150px_90px_120px_90px] gap-[8px] mb-[16px]">
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                Issue Date
              </p>
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                Invoice Number
              </p>
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                Amount
              </p>
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                Payment Method
              </p>
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                Status
              </p>
            </div>

            {/* Table Rows */}
            <div className="space-y-[20px]">
              {invoices.map((invoice, index) => (
                <div key={index} className="grid grid-cols-[100px_150px_90px_120px_90px] gap-[8px] items-center">
                  {/* Issue Date */}
                  <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                    {invoice.date}
                  </p>

                  {/* Invoice Number with Icons */}
                  <div className="flex items-center gap-[6px]">
                    <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[12px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                      {invoice.invoiceNumber}
                    </p>
                    {invoice.hostedInvoiceUrl ? (
                      <a
                        href={invoice.hostedInvoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-[#e6f1fd] border border-[#cedef0] rounded-[2px] size-[13px] flex items-center justify-center"
                        title="Open invoice"
                      >
                        <svg className="w-[7px] h-[7px]" fill="none" viewBox="0 0 7 7">
                          <path d={svgPaths.p112ba780} fill="#007AFF" />
                        </svg>
                      </a>
                    ) : null}
                    {invoice.invoicePdf ? (
                      <a
                        href={invoice.invoicePdf}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-[#e6f1fd] border border-[#cedef0] rounded-[2px] size-[13px] flex items-center justify-center"
                        title="Download invoice PDF"
                      >
                        <svg className="w-[6px] h-[5px]" fill="none" viewBox="0 0 5.83333 4.66667">
                          <path d={svgPaths.pc41fd00} fill="#007AFF" />
                          <path d={svgPaths.pbc14700} fill="#007AFF" />
                        </svg>
                      </a>
                    ) : null}
                  </div>

                  {/* Amount */}
                  <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[14px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                    {invoice.amount}
                  </p>

                  {/* Payment Method */}
                  <div className="flex items-center gap-[7px]">
                    {/* <img src={imgMastercard} alt="" className="size-[18px]" /> */}
                    <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[20px] text-[12px] text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                      {invoice.paymentMethod}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="bg-[#b6f5cf] h-[19px] px-[8px] rounded-[50px] flex items-center gap-[4px] w-fit">
                    <div className="size-[5px]">
                      <svg className="block size-full" fill="none" viewBox="0 0 5 5">
                        <circle cx="2.5" cy="2.5" r="2.5" fill="#118A41" />
                      </svg>
                    </div>
                    <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[normal] text-[#118a41] text-[10px] tracking-[-0.5px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
                      {invoice.status}
                    </p>
                  </div>
                </div>
              ))}
              {invoiceLoading ? (
                <p className="text-sm text-[#6b7280]">Loading invoices...</p>
              ) : null}
              {invoiceError ? (
                <p className="text-sm text-[#b91c1c]">{invoiceError}</p>
              ) : null}
              {!invoiceLoading && !invoiceError && invoices.length === 0 ? (
                <p className="text-sm text-[#6b7280]">No invoices found.</p>
              ) : null}
            </div>
          </div>

          {/* Right Column - Billing Details */}
          <div className="">
            {/* Your Current plan */}
            <div className="w-full max-w-[554px]  bg-[#FBFBFB] border border-[#EBEBEB] rounded-lg overflow-hidden px-5 py-5.5">
      {/* Header */}
      <div className=" pb-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-medium ">Your Current plan</h2>
        <span className="text-xl font-black text-[#007AFF]">{planLabel}</span>
      </div>

      {/* Content Section 1 */}
      <div className=" pt-2 pb-3.5 border-b border-gray-200">
        <div className="grid grid-cols-3 gap-8 text-left">
          {/* No of Domains */}
          <div>
            <p className="text-[17px] font-normal mb-1">No of Domains</p>
            <p className="text-[17px] font-semibold text-[#5243C2]">{String(domainCount).padStart(2, "0")}</p>
          </div>

          {/* No of scans */}
          <div>
            <p className="text-[17px] font-normal mb-1">No of scans</p>
            <p className="text-[17px]text-2xl font-bold text-[#5243C2]">{scansCount}</p>
          </div>

          {/* Compliance */}
          <div>
            <p className="text-[17px] font-normal mb-1">Compliance</p>
            <p className="text-[17px] font-bold text-[#5243C2]">GDPR/CCPA</p>
          </div>
        </div>
      </div>

      {/* Content Section 2 */}
      <div className=" pt-2  ">
        <div className="grid grid-cols-3 gap-8">
          {/* No of Page views */}
          <div>
            <p className="text-[17px] font-normal mb-1">No of Page views</p>
            <p className="text-[17px] font-bold text-[#5243C2]">{pageViews}</p>
          </div>

          {/* IAB / TCF */}
          <div>
            <p className="text-[17px] font-normal mb-1">IAB / TCF</p>
            <p className="text-[17px] font-bold text-gray-400">NIL</p>
          </div>

          {/* Empty column */}
          <div></div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className=" pt-7 flex gap-4">
        <button
          className="flex-1 min-h-[36px] bg-[#007AFF] hover:bg-blue-700 active:bg-blue-800 text-white  py-2 px-4 rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={!canUpgrade}
        >
          {upgradeCta}
        </button>
        <button className="flex-1 min-h-[36px] bg-[#E9E5E5] hover:bg-gray-300 active:bg-gray-400 text-[#4B5563]  py-2 px-4 rounded-lg transition-colors cursor-pointer">
          Cancel Subscription
        </button>
      </div>
    </div>

           

         

            {/* Name and Email */}
         
          </div>
        </div>
      
  );
}
