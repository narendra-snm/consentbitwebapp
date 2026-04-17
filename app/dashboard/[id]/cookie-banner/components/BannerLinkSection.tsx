"use client";

import { useState } from "react";


interface BannerLinkSectionProps {
  effectivePlanId?: string;
  consentType: "gdpr" | "ccpa" | "both";
}
 const Copy = ({ size = 16, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1-2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

 const Check = ({ size = 16, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

 const Link2 = ({ size = 16, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 7h3a5 5 0 0 1 0 10h-3" />
    <path d="M9 17H6a5 5 0 0 1 0-10h3" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

 const Info = ({ size = 16, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
export function BannerLinkSection({ effectivePlanId, consentType }: BannerLinkSectionProps) {
  const [copied, setCopied] = useState(false);

  const planKey = String(effectivePlanId ?? "").toLowerCase();
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
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors cursor-pointer" 
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
