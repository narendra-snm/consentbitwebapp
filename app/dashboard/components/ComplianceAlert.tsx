"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export default function ComplianceAlert() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="w-full  mt-4.25">

      {/* Greeting */}
      <p className="text-[17px]  ">
        Hi sam! <br />
        </p>
      <p className="text-[17px] text-[#4B5563] mb-5">
        You are currently viewing the dashboard for{" "}
        <span className="text-blue-600 font-medium cursor-pointer hover:underline">
          acme.com
        </span>
      </p>

      {/* Alert Box */}
      <div className="flex items-start justify-between relative pr-13.5 bg-[#FFEFEF] border border-[#FFEFEF] rounded-[10px] p-4">

        {/* Left */}
        <div className="flex gap-3 ">

          {/* Icon */}
          <div className="mt-0.5 text-[#AC2734]">
                        <img src="/images/Icon-triangle.svg" alt="Verification" className="mt-1" />

          </div>

          {/* Text */}
          <div>
            <p className="text-sm font-bold text-[#AC2734]">
              Compliance alert: Cookie banner missing
            </p>

            <p className="text-sm text-[#AC2734] mt-1 max-w-[808px] font-semibold">
              Your site currently sets no cookies, but future updates or
              third-party tools could introduce them without warning. This can
              put you at risk of non-compliance with US state privacy laws.
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">

          {/* Button */}
          <button className="bg-[#007AFF] py-2 px-2.5 mt-2 hover:bg-blue-700 text-white text-sm  rounded-md font-medium">
            Enable consent banner
          </button>

          {/* Close */}
          <button
            onClick={() => setVisible(false)}
            className="text-gray-400 hover:text-gray-600 absolute top-2 right-2"
          >
            <X size={16} />
          </button>

        </div>
      </div>
    </div>
  );
}