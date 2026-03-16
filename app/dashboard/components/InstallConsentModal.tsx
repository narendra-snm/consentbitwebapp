"use client";

import { X, Copy, Share2, Check } from "lucide-react";

export default function InstallConsentModal({ open }: any) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        // onClick={onclose}
      />

      {/* Modal */}
<div className="relative w-full max-w-[1007px] max-h-[95vh] bg-white rounded-[10px] shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-6 bg-[#E6F1FD]">
          <h2 className="text-sm font-semibold ">
            A Install ConsentBit on your website
          </h2>

          <button 
          // onClick={onclose}
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <div className="px-8 py-6 overflow-y-auto">

          {/* STEP 1 */}
          <h3 className=" font-bold mt-0.5 mb-5">
            Step 1: Copy this banner installation code
          </h3>

          {/* Code Box */}
          <div className="relative bg-[#F9F9FA] border border-[#E5E5E5] p-5 pb-8.5 rounded-md   text-[#161616] mb-3.75">

            <p className="pr-10">
              {"<!-- Start cookieyes banner -->"}
              {" <script id='cookieyes' type='text/javascript' src='https://cdn-cookieyes.com/client_data/.../script.js'></script> "}
              {"<!-- End cookieyes banner -->"}
            </p>
<svg width="24" className="absolute right-4 bottom-4  text-gray-500 cursor-pointer" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16 12.9V17.1C16 20.6 14.6 22 11.1 22H6.9C3.4 22 2 20.6 2 17.1V12.9C2 9.4 3.4 8 6.9 8H11.1C14.6 8 16 9.4 16 12.9Z" stroke="#4B5563" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M22 6.9V11.1C22 14.6 20.6 16 17.1 16H16V12.9C16 9.4 14.6 8 11.1 8H8V6.9C8 3.4 9.4 2 12.9 2H17.1C20.6 2 22 3.4 22 6.9Z" stroke="#4B5563" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

          </div>

          {/* Buttons */}
          <div className="flex gap-3 mb-9.25">

            <button className="flex items-center gap-2 px-2.75 py-3.5 text-xs bg-[#E6F1FD] rounded-md hover:bg-gray-200">
              Copy code
              <Copy size={14}  className="ml-5.5"/>
            </button>

            <button className="flex items-center gap-2 px-2.75 py-3.5 text-xs bg-[#E6F1FD] rounded-md hover:bg-gray-200">
              Send code to a team mate
              <Share2 size={14} />
            </button>

          </div>

          {/* Instruction */}
          <p className="font-semibold mb-5">
            Paste the code right after the opening{" "}
            <span className="bg-blue-100 text-blue-700 px-1 rounded">
              {"<head>"}
            </span>{" "}
            tag in your site's source code.
          </p>

          <p className="text-xs  mb-1">
            Refer to our platform-wise guides for instructions.
          </p>

          {/* Platform Icons */}
          <div className="flex gap-2 mb-7.25">
                      <img src="/images/allplatform.svg" alt="Verification" className="" />

          </div>

          {/* STEP 3 */}
          <h3 className=" font-bold  mb-2.5">
            Step 3: Verify your installation.
          </h3>

          <p className="text-xs  mb-2">
            Enter your website domain
          </p>

          {/* Domain input */}
          <div className="flex items-center gap-2 mb-2.25">

            <input
              type="text"
              placeholder="Yoursite.com"
              className="border rounded-lg px-3 py-2 text-sm w-[319px] h-[48px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="bg-green-500 text-white p-2 rounded-md">
              <Check size={16} />
            </div>

          </div>

          <p className="text-xs  mb-5.5">
            Your site domain <br />
            Yoursite.com <br />
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </p>

          {/* Verify Button */}
          <button className="bg-[#007AFF] text-white px-10.5 py-3.5 rounded-lg text-sm hover:bg-blue-700">
            Verify
          </button>

        </div>
        
      </div>
    </div>
  );
}