"use client";

import { useState } from "react";
import { Copy, Check, Link2, Info } from "lucide-react";

interface BannerLinkSectionProps {
  effectivePlanId?: string;
  consentType: "gdpr" | "ccpa" | "both";
}

export function BannerLinkSection({ effectivePlanId, consentType }: BannerLinkSectionProps) {
  const [copied, setCopied] = useState(false);

  const planKey = String(effectivePlanId ?? "free").toLowerCase();
  const isLocationBased = planKey === "essential" || planKey === "growth";

  const snippet = `<a href="#" data-consentbit-trigger>Cookie Settings</a>`;

  const descriptionLine = isLocationBased
    ? "Location-based — shows GDPR banner for EU visitors, CCPA banner for US visitors."
    : consentType === "ccpa"
    ? "Opens your CCPA consent banner when clicked."
    : "Opens your GDPR cookie banner when clicked.";

  function handleCopy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="w-full max-w-[409px] mx-auto mt-3">
      <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg">
        {/* Header */}
        <div className="flex items-center gap-2 px-[18px] py-4">
          <Link2 className="w-4 h-4 text-[#007AFF] shrink-0" />
          <h3 className="font-['DM_Sans'] font-semibold text-base text-black leading-5">
            Banner Link
          </h3>
          <div className="relative group ml-1">
            <Info className="w-3.5 h-3.5 text-[#9CA3AF] cursor-default" />
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-white border border-gray-200 shadow-md text-[#374151] text-[11px] leading-relaxed rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Add this link anywhere on your website — footer, privacy page, nav — so visitors can reopen the banner.
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-200" />
            </div>
          </div>
        </div>

        <div className="px-[18px] pb-5 space-y-3">
          {/* Plan badge + behaviour */}
          <div className="flex items-start gap-2">
            <span className={`shrink-0 mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              isLocationBased
                ? "bg-[#E6F1FD] text-[#007AFF]"
                : "bg-gray-100 text-gray-500"
            }`}>
              {isLocationBased ? "Location-based" : consentType === "ccpa" ? "CCPA" : "GDPR"}
            </span>
            <p className="text-[12px] text-[#6B7280] leading-snug">{descriptionLine}</p>
          </div>

          {/* Snippet box */}
          <div className="relative">
            <div className="w-full bg-white border border-[#e5e5e5] rounded-lg px-3 py-3 pr-11 font-mono text-[12px] text-[#374151] break-all select-all">
              {snippet}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
              title={copied ? "Copied!" : "Copy snippet"}
            >
              {copied
                ? <Check className="w-4 h-4 text-[#22c55e]" />
                : <Copy className="w-4 h-4 text-[#6B7280]" />
              }
            </button>
          </div>

          {/* Usage hint */}
          <p className="text-[11px] text-[#9CA3AF]">
            Paste this HTML into your website's footer or privacy policy page.
            The <code className="bg-gray-100 px-1 rounded text-[10px]">data-consentbit-trigger</code> attribute is what activates it.
          </p>
        </div>
      </div>
    </div>
  );
}
