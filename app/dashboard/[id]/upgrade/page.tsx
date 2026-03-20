"use client";
import { useState } from "react";

type Plan = "basic" | "essential" | "growth" | null;

export default function PricingTable() {
  const prices = { basic: 9, essential: 20, growth: 56 };

  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selected, setSelected] = useState<Plan>(null);
  const [promoInput, setPromoInput] = useState("TESTWEB");
  const [promoOn, setPromoOn] = useState(false);

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
          <div className="text-[#007aff] text-sm mt-1">
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
        onClick={() => setSelected(plan)}
        className={`px-6 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-85
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

  return (
    <div className="flex justify-center w-full">
      <div className="max-w-[1292px] w-full bg-white  overflow-hidden">

        {/* HEADER */}
        <div className="flex gap-8 items-center  px-9 py-3.5 pt-7 mt-2 border-t border-[#000000]/10">
          <div className="text-xl font-semibold ">
            Chose your Payment Plan
          </div>
          <div className="flex bg-[#f1f5f9] rounded-[22px] p-1 gap-1">
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
              className={`px-5.75 py-2 text-[14px]  h-[44px] font-extrabold rounded-[22px] ${
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
        <div className="grid grid-cols-[200px_220px_220px_316px_260px] px-6">

          <div></div>

          <PlanHeader name="Free" />

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
              "10000 pageviews/m + $.49 extra",
            ]}
          />

          <Feature
            label="No of Page views"
            values={[
              "7500",
              "100,000 page views/m",
              "500,000 pageviews/m + $.49",
              "2 Million pageviews/m + $.39",
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

          {/* BUTTONS */}
          <div></div>

          <div className="p-4">
            <button className="bg-gray-400 text-white px-6 py-2 rounded-lg">
              Current Plan
            </button>
          </div>

          <div className="p-4">
            <PlanButton plan="basic" />
          </div>

          <div className="p-4 bg-[#f0fff1] border-x border-[rgba(164,191,166,0.3)] border-b rounded-b-[20px]">
            <PlanButton plan="essential" recommended />
          </div>

          <div className="p-4 pl-[50px]">
            <PlanButton plan="growth" />
          </div>

        </div>

        {/* BOTTOM */}
        <div className="grid grid-cols-[430px_1fr] gap-4 p-6">

          {/* PROMO */}
          <div className="bg-[#e6f1fd] rounded-[15px] p-7 border-[10px] border-dashed border-white">

            <div className="text-lg font-semibold mb-4">Promo code</div>

            <div className="flex border rounded-lg overflow-hidden">

              <input
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                className="flex-1 px-4 py-3 outline-none"
              />

              <button
                onClick={applyPromo}
                className="bg-[#007aff] text-white px-4"
              >
                Apply
              </button>

            </div>

            {promoOn && (
              <div className="mt-3 text-sm font-medium">
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

                <div>
                  {billing === "yearly"
                    ? "(Billed annually)"
                    : "(Billed monthly)"}
                </div>

              </div>

              <button className="bg-[#2ec04f] text-white px-6 py-3 rounded-lg">
                Proceed to pay
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
      <div className="p-4 border-t border-[#000000]/10 text-[15px] text-[#111827]">
        {label}
      </div>

      {values.map((v, i) => (
        <div
          key={i}
          className={`p-4 border-t border-[#000000]/10  text-[15px] font-bold text-[#5243c2] ${
            i === 2
              ? "bg-[#F0FFF1] border-l border-r border-[#A4BFA64D]"
              : "text-[#5243c2]"
          }
          ${
            i === 3
              ? "pl-[50px]"
              : ""
          }
          
          `}
        >
          {v}
        </div>
      ))}
    </>
  );
}