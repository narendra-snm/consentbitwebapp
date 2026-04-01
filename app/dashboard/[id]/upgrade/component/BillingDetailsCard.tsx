const svgPaths =  {
p1e2ddd80: "M10.1417 7.15C10.5083 8.45833 11.5333 9.49167 12.85 9.85833",
p25ef6100: "M13.3333 1.66667H6.66667C3.33333 1.66667 1.66667 3.33333 1.66667 6.66667V17.5C1.66667 17.9583 2.04167 18.3333 2.5 18.3333H13.3333C16.6667 18.3333 18.3333 16.6667 18.3333 13.3333V6.66667C18.3333 3.33333 16.6667 1.66667 13.3333 1.66667Z",
p2846bb80: "M6.85355 0.5C6.85355 0.223858 6.6297 0 6.35355 0H1.85355C1.57741 0 1.35355 0.223858 1.35355 0.5C1.35355 0.776142 1.57741 1 1.85355 1H5.85355V5C5.85355 5.27614 6.07741 5.5 6.35355 5.5C6.6297 5.5 6.85355 5.27614 6.85355 5V0.5ZM0.353553 6.5L0.707107 6.85355L6.70711 0.853553L6.35355 0.5L6 0.146447L0 6.14645L0.353553 6.5Z",
p378e8c00: "M10.7583 6.53333L6.43334 10.8583C6.26667 11.025 6.10834 11.35 6.07501 11.5833L5.84168 13.2333C5.75834 13.8333 6.17501 14.25 6.77501 14.1667L8.42499 13.9333C8.65832 13.9 8.98335 13.7417 9.15001 13.575L13.475 9.25C14.2167 8.50833 14.575 7.64167 13.475 6.54166C12.375 5.43333 11.5083 5.78333 10.7583 6.53333Z",
}

import imgImage4 from "../../../../../public/images/card.png";

interface BillingDetailsProps {
  name: string;
  email: string;
  country: string;
  address: string;
  cardNumber: string;
  cardExpiry: string;
  cardType: string;
  cardHolderName: string;
  onEditCard?: () => void;
  onVisitStripePortal?: () => void;
}

function VuesaxLinearMessageEdit() {
  return (
    <svg className="size-[20px]" fill="none" viewBox="0 0 20 20">
      <g id="message-edit">
        <path d={svgPaths.p25ef6100} stroke="#292D32" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        <g>
          <path d={svgPaths.p378e8c00} stroke="#292D32" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
          <path d={svgPaths.p1e2ddd80} stroke="#292D32" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
        </g>
      </g>
    </svg>
  );
}

export default function BillingDetailsCard({
  name,
  email,
  country,
  address,
  cardNumber,
  cardExpiry,
  cardType,
  cardHolderName,
  onEditCard,
  onVisitStripePortal,
}: BillingDetailsProps) {
  return (
    <div className="w-full max-w-[554px] bg-[#e6f1fd] border border-[#ebebeb] rounded-[10px] p-[20px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-[17px]">
        <h2
          className="font-['DM_Sans:Medium',sans-serif] font-medium text-[18px] text-black tracking-[-0.18px]"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          Billing Details
        </h2>
        <button
          onClick={onVisitStripePortal}
          className="bg-white px-[11px] py-[8px] rounded-[8px] h-[41px]"
        >
          <p
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-[14px] text-black leading-[20px] whitespace-nowrap"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Visit Stripe portal to edit billing details →
          </p>
        </button>
      </div>

      {/* Divider */}
      <div className="h-[1px] bg-black opacity-10 mb-[21px]" />

      {/* Name and Email Row */}
      <div className="grid grid-cols-2 gap-[20px] mb-[21px]">
        <div>
          <p
            className="font-['DM_Sans:9pt_Regular',sans-serif] font-normal text-[17px] text-black opacity-50 tracking-[-1px] mb-[5px]"
            style={{ fontVariationSettings: "'opsz' 9" }}
          >
            Name
          </p>
          <p
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-[17px] text-black tracking-[-1px]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {name}
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
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-[17px] text-black tracking-[-1px]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {email}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-[1px] bg-black opacity-10 mb-[21px]" />

      {/* Country and Address Row */}
      <div className="grid grid-cols-2 gap-[20px] mb-[21px]">
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
            {country}
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
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-[17px] text-black tracking-[-1px]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {address}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-[1px] bg-black opacity-10 mb-[21px]" />

      {/* Payment Method Label */}
      <p
        className="font-['DM_Sans:9pt_Regular',sans-serif] font-normal text-[17px] text-black opacity-50 tracking-[-1px] mb-[16px]"
        style={{ fontVariationSettings: "'opsz' 9" }}
      >
        Payment Methood
      </p>

      {/* Credit Card Section */}
      <div className="relative">
        <div
          className="rounded-[7px] h-[202px] p-[27px] flex flex-col justify-between"
          style={{
            backgroundImage: "linear-gradient(136.145deg, rgb(0, 122, 255) 10.202%, rgb(226, 237, 255) 87.027%)",
            transform: "rotate(180deg)"
          }}
        >
          <div style={{ transform: "rotate(180deg)" }}>
            {/* Card Number */}
            <p
              className="font-['DM_Sans:Bold',sans-serif] font-bold text-[19px] text-[#111827] mb-[14px]"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {cardNumber}
            </p>

            {/* Card Info Row */}
            <p
              className="font-['DM_Sans:9pt_Regular',sans-serif] font-normal text-[17px] text-black tracking-[-1px] mb-[29px]"
              style={{ fontVariationSettings: "'opsz' 9" }}
            >
              {cardType} - Expires {cardExpiry}
            </p>

            {/* Cardholder Name and Logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[23px]">
                <p
                  className="font-['DM_Sans:9pt_Regular',sans-serif] font-normal text-[17px] text-black opacity-50 tracking-[-1px]"
                  style={{ fontVariationSettings: "'opsz' 9" }}
                >
                  {cardHolderName}
                </p>
                <p
                  className="font-['DM_Sans:Bold',sans-serif] font-bold text-[19px] text-[#111827] opacity-50"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  •••
                </p>
              </div>
              <img
                alt="Card type"
                className="size-[42px] object-cover"
                src={typeof imgImage4 === 'string' ? imgImage4 : imgImage4.src}
              />
            </div>
          </div>
        </div>

        {/* Edit Button and Stripe Portal Link */}
        <div className="absolute top-0 right-0 flex flex-col items-end gap-[8px]">
          <button
            onClick={onEditCard}
            className="bg-[#f9f9fa] border border-[#e5e5e5] p-[8px] rounded-[8px] size-[36px] flex items-center justify-center"
          >
            <VuesaxLinearMessageEdit />
          </button>
          <div className="flex items-start gap-[4px]">
            <p
              className="font-['DM_Sans:Bold',sans-serif] font-bold text-[12px] text-[#292d32] tracking-[-1px] leading-[14px] text-right"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Stripe Customer<br />portal
            </p>
            <svg className="size-[6px] mt-[4px]" fill="none" viewBox="0 0 6.85355 6.85355">
              <path d={svgPaths.p2846bb80} fill="black" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
