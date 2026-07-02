"use client";

import React from "react";

interface BillingDetailsCardProps {
  name?: string;
  email?: string;
  country?: string;
  address?: string;
  /** Still accepted for API compat — no longer rendered here */
  pm?: unknown;
  onVisitStripePortal?: () => void;
  onEditCard?: () => void;
  onOpenPortal?: () => void;
}

export default function BillingDetailsCard({
  name,
  email,
  country,
  address,
  onVisitStripePortal,
}: BillingDetailsCardProps) {
  const safeName    = name    || "Not available";
  const safeEmail   = email   || "Not available";
  const safeCountry = country || "Not available";
  const safeAddress = address || "Not available";

  return (
    <div className="w-full max-w-[554px] bg-[#e6f1fd] border border-[#ebebeb] rounded-[10px] p-[20px]">
      <div className="flex items-center justify-between mb-[17px] gap-4">
        <h2
          className="font-['DM_Sans:Medium',sans-serif] font-medium text-[18px] text-black tracking-[-0.18px]"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          Billing Details
        </h2>

        <button
          type="button"
          onClick={onVisitStripePortal}
          className="bg-white px-[11px] py-[8px] rounded-[8px] min-h-[41px] whitespace-nowrap hover:bg-gray-50 transition-colors"
        >
          <p
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-[14px] text-black leading-[20px]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Visit Stripe portal to edit billing details →
          </p>
        </button>
      </div>

      <div className="h-[1px] bg-black opacity-10 mb-[21px]" />

      <div className="grid grid-cols-2 gap-[20px] mb-[21px]">
        <div>
          <p
            className="font-['DM_Sans:9pt_Regular',sans-serif] font-normal text-[17px] text-black opacity-50 tracking-[-1px] mb-[5px]"
            style={{ fontVariationSettings: "'opsz' 9" }}
          >
            Name
          </p>
          <p
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-[17px] text-black tracking-[-1px] break-words"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {safeName}
          </p>
        </div>

        <div>
          <p
            className="font-['DM_Sans:9pt_Regular',sans-serif] font-normal text-[17px] text-black opacity-50 tracking-[-1px] mb-[5px]"
            style={{ fontVariationSettings: "'opsz' 9" }}
          >
            Email
          </p>
          <p
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-[17px] text-black tracking-[-1px] break-words"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {safeEmail}
          </p>
        </div>
      </div>

      <div className="h-[1px] bg-black opacity-10 mb-[21px]" />

      <div className="grid grid-cols-2 gap-[20px]">
        <div>
          <p
            className="font-['DM_Sans:9pt_Regular',sans-serif] font-normal text-[17px] text-black opacity-50 tracking-[-1px] mb-[5px]"
            style={{ fontVariationSettings: "'opsz' 9" }}
          >
            Country
          </p>
          <p
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-[17px] text-black tracking-[-1px]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {safeCountry}
          </p>
        </div>

        <div>
          <p
            className="font-['DM_Sans:9pt_Regular',sans-serif] font-normal text-[17px] text-black opacity-50 tracking-[-1px] mb-[5px]"
            style={{ fontVariationSettings: "'opsz' 9" }}
          >
            Address
          </p>
          <p
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-[17px] text-black tracking-[-1px] break-words"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {safeAddress}
          </p>
        </div>
      </div>
    </div>
  );
}
