"use client";
import { useState } from "react";
import { Sidebar } from "./SideBar";
import ConsentPreview from "./ConsentPreview";
import BannerControl from "./BannerControl";
import ColorPickerPanel from "./ColorPickerPanel";
import FontPickerPanel from "./FontPickerPanel";
import { CookieNoticeAccordion2 } from "./CookieNoticeAccordion2";
import PreferenceBannerAccordion from "./PreferenceBannerAccordion";
import CookieListAccordion from "./CookieListAccordion";
import { FloatingButtonSettings } from "./FloatingButtonSettings";
import { RegulationSelector } from "./RegulationSelector";

export default function page() {
  const [active, setActive] = useState("General");
  return (
    <div className="border-t border-[#00000010] mt-0.25 grid grid-cols-[172px_minmax(420px,454px)_740px]">
      <Sidebar active={active} setActive={setActive} />
      <div className="w-full  px-5.5 pt-10 space-y-5 border-r border-[#00000010]">
        {/* Consent Template Card */}
        {active === "General" && (
          <div>
            <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg p-4 mb-4.25">
              <p className="font-semibold text-base text-black mb-3">
                Consent template
              </p>

              <div className="relative mb-3">
                <button className="w-full px-4 py-3 bg-white border border-[#e5e5e5] rounded-lg text-left flex items-center justify-between hover:border-gray-400 transition-colors">
                  <span className="text-base text-[#111827]">CCPA (USA)</span>

                  <svg
                    className="w-[10px] h-[4px]"
                    fill="none"
                    viewBox="0 0 10.7962 4.41784"
                  >
                    <path
                      d="M0.500015 0.500015L4.13305 3.46692C4.86927 4.06815 5.92694 4.06814 6.66315 3.46692L10.2962 0.500015"
                      stroke="black"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <p className="text-[15px] leading-[22px] text-black tracking-tight">
                The selected template (opt-out banner) supports CCA/CPRA
                (California), VCDPA (Virginia), CPA (Colorado), CTDPA
                (Connecticut), & UCPA (Utah)
              </p>
            </div>

            {/* IAB Support Card */}
            <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg p-4">
              <p className="font-semibold text-base text-black mb-4">
                Support IAB TCF v2.3
              </p>

              {/* Toggle 1 */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-black tracking-tight">
                  Support Google's Additional Consent Mode
                </p>

                <div className="relative">
                  <div className="bg-[#d8d8d8] h-[22px] w-[42px] rounded-full"></div>
                  <div className="absolute bg-white left-[3px] top-[2px] rounded-full w-[18px] h-[18px]"></div>
                </div>
              </div>

              {/* Toggle 2 */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-black tracking-tight">
                  Enable Google's Advertiser Consent Mode
                </p>

                <div className="relative">
                  <div className="bg-[#d8d8d8] h-[22px] w-[42px] rounded-full"></div>
                  <div className="absolute bg-white left-[3px] top-[2px] rounded-full w-[18px] h-[18px]"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        {active === "Content" && (
          <>
            <RegulationSelector/>
            <CookieNoticeAccordion2 />
            <PreferenceBannerAccordion /> <CookieListAccordion /><FloatingButtonSettings/>
            
          </>
        )}
        {active === "Layout" && <BannerControl />}
        {active === "Colors" && <ColorPickerPanel />}
        {active === "Type" && <FontPickerPanel />}
      </div>
      <ConsentPreview />
    </div>
  );
}
