"use client";

import { X } from "lucide-react";

export default function AddSiteModal({ open,  }: any) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        // onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[648px] bg-white rounded-lg shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-6 bg-[#E6F1FD] rounded-t-lg">
          <h2 className=" font-semibold ">
            Add New Site
          </h2>

          <button
          //  onClick={onClose}
           >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-5">

          <p className="text-xs text-gray-500 mb-7 mt-2">
            Add a new website to your organization. Enter your website URL.
            You can configure banner settings in the Cookie Banner tab.
          </p>

          {/* Website URL */}
          <div className="mb-6">
            <label className="text-sm font-medium ">
              Website URL *
            </label>

            <input
              type="text"
              placeholder="Acme.com"
              className="mt-1 w-full border border-gray-300 rounded-md px-3 h-[48px] py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Jurisdiction */}
          <div className="mb-3">
            <label className="text-sm font-medium">
              Jurisdiction
            </label>

            <select className="mt-1 w-full border h-[48px] border-gray-300 rounded-md px-3 py-2  focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>GDPR</option>
              <option>CCPA</option>
              <option>LGPD</option>
            </select>
          </div>

          <p className="text-xs text-gray-500 mb-9">
            Add a new website to your organization. Enter your website URL.
            You can configure banner settings in the Cookie Banner tab.
          </p>

          {/* Button */}
          <button className="w-full bg-[#007AFF] text-white text-[15px] font-medium py-3.5 rounded-md hover:bg-blue-600 transition">
            Add website
          </button>

        </div>
      </div>
    </div>
  );
}