"use client";


import { useState } from "react";

export default function ComplianceAlert({
  userName,
  siteDomain,
  bannerActive,
}: {
  userName?: string;
  siteDomain?: string;
  bannerActive?: boolean;
}) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;
const show=false
  return (
    <div className="w-full  mt-4.25">

      {/* Greeting */}
      <p className="text-[17px]  ">
        Hi {userName || "there"}! <br />
        </p>
      <p className="text-[17px] text-[#4B5563] mb-5">
        You are currently viewing the dashboard for{" "}
        <span className="text-[#0777E6] font-medium cursor-pointer hover:underline">
          {siteDomain || "—"}
        </span>
      </p>

      {/* Alert Box */}
      { show && <div className="flex items-start justify-between relative pr-13.5 bg-[#FFEFEF] border border-[#FFEFEF] rounded-[10px] p-4">

        {/* Left */}
        <div className="flex gap-3 ">

          {/* Icon */}
          <div className="mt-0.5 text-[#AC2734]">
                        <img src="/images/Icon-triangle.svg" alt="Verification" className="mt-1" />

          </div>

          {/* Text */}
          <div>
            <p className="text-sm font-bold text-[#AC2734]">
              Compliance alert: Cookie banner {bannerActive ? "active" : "missing"}
            </p>

            <p className="text-sm text-[#AC2734] mt-1 max-w-[808px] font-medium">
              Your site currently sets no cookies, but future updates or
              third-party tools could introduce them without warning. This can
              put you at risk of non-compliance with US state privacy laws.
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">

          {/* Button */}
          <button className="bg-[#007AFF] py-2 px-2.5 mt-2 hover:bg-blue-700 text-white text-[15px] rounded-md ">
            {bannerActive ? "Review banner settings" : "Enable consent banner"}
          </button>

          {/* Close */}
          <button
            onClick={() => setVisible(false)}
            className="text-gray-400 hover:text-gray-600 absolute top-6 right-2.75"
          >
             <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.9398 8L13.1398 3.80667C13.2653 3.68113 13.3359 3.51087 13.3359 3.33333C13.3359 3.1558 13.2653 2.98554 13.1398 2.86C13.0143 2.73447 12.844 2.66394 12.6665 2.66394C12.4889 2.66394 12.3187 2.73447 12.1931 2.86L7.9998 7.06L3.80646 2.86C3.68093 2.73447 3.51066 2.66394 3.33313 2.66394C3.1556 2.66394 2.98533 2.73447 2.8598 2.86C2.73426 2.98554 2.66374 3.1558 2.66374 3.33333C2.66374 3.51087 2.73426 3.68113 2.8598 3.80667L7.0598 8L2.8598 12.1933C2.79731 12.2553 2.74771 12.329 2.71387 12.4103C2.68002 12.4915 2.6626 12.5787 2.6626 12.6667C2.6626 12.7547 2.68002 12.8418 2.71387 12.9231C2.74771 13.0043 2.79731 13.078 2.8598 13.14C2.92177 13.2025 2.99551 13.2521 3.07675 13.2859C3.15798 13.3198 3.24512 13.3372 3.33313 13.3372C3.42114 13.3372 3.50827 13.3198 3.58951 13.2859C3.67075 13.2521 3.74449 13.2025 3.80646 13.14L7.9998 8.94L12.1931 13.14C12.2551 13.2025 12.3288 13.2521 12.4101 13.2859C12.4913 13.3198 12.5785 13.3372 12.6665 13.3372C12.7545 13.3372 12.8416 13.3198 12.9228 13.2859C13.0041 13.2521 13.0778 13.2025 13.1398 13.14C13.2023 13.078 13.2519 13.0043 13.2857 12.9231C13.3196 12.8418 13.337 12.7547 13.337 12.6667C13.337 12.5787 13.3196 12.4915 13.2857 12.4103C13.2519 12.329 13.2023 12.2553 13.1398 12.1933L8.9398 8Z" fill="#2B2B2B"/>
</svg>
          </button>

        </div>
      </div>}
    </div>
  );
}