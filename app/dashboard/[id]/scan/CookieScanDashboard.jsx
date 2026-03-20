"use client";
import { useState } from "react";
import DatePicker from "react-datepicker";

const svgPaths ={
p1e49fd00: "M3.13333 8V0H4.85V8H3.13333ZM0 4.88889V3.11111H8V4.88889H0Z",
}


export function CookieScanDashboard() {
  const [showScheduler, setShowScheduler] = useState(false);
const [date, setDate] = useState(new Date());
  return (
    <div className="w-full max-w-[1194px] mx-auto bg-white p-0">
      {showScheduler && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">

    <div className="bg-white rounded-2xl p-6 shadow-xl w-[360px]">

      {/* Date + Time */}
      <div className="flex gap-3 mb-4">

        <div className="flex-1 border border-[#7bb3ff] rounded-lg px-4 py-3 text-center font-semibold">
          {date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long"
          })}
        </div>

        <div className="flex-1 border border-[#7bb3ff] rounded-lg px-4 py-3 text-center font-semibold">
          {date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })}
        </div>

      </div>

      {/* Calendar */}
      <DatePicker
        selected={date}
        onChange={(d) => setDate(d)}
        inline
        showTimeSelect
        timeIntervals={30}
        dateFormat="MMMM d, yyyy h:mm aa"
      />

      {/* Buttons */}
      <div className="flex justify-between mt-4">

        <button
          onClick={() => setShowScheduler(false)}
          className="text-gray-500 font-medium"
        >
          Cancel
        </button>

        <button
          onClick={() => {
            console.log("Scheduled:", date);
            setShowScheduler(false);
          }}
          className="bg-[#007aff] text-white px-5 py-2 rounded-lg"
        >
          Done
        </button>

      </div>

    </div>

  </div>
)}
      {/* Top Section - Scan Info */}
      <div className="grid grid-cols-2 gap-4 mb-7">
        {/* Last Successful Scan */}
        <div className="bg-[#e6f1fd] rounded-lg p-4.5 flex items-center justify-between">
          <div>
            <h3 className="font-['DM_Sans'] font-semibold text-base text-black leading-5 mb-1" style={{ fontVariationSettings: "'opsz' 14" }}>
              Last successful scan
            </h3>
            <p className="font-['DM_Sans'] font-normal text-base text-[#4b5563]" style={{ fontVariationSettings: "'opsz' 14" }}>
              February 11, 2026 19:35:12 (UTC)
            </p>
          </div>
          <button className="bg-[#007aff] text-white px-8.25 py-2 h-10 rounded-lg font-['DM_Sans'] font-normal text-[15px] leading-5 hover:bg-[#0066d6] transition-colors" style={{ fontVariationSettings: "'opsz' 14" }}>
            Scan Now
          </button>
        </div>

        {/* Next Scan */}
        <div className="bg-[#e6f1fd] rounded-lg p-4.5 flex items-center justify-between">
          <div>
            <h3 className="font-['DM_Sans'] font-semibold text-base text-black leading-5 mb-1" style={{ fontVariationSettings: "'opsz' 14" }}>
              Next scan
            </h3>
            <p className="font-['DM_Sans'] font-normal text-base text-[#4b5563]" style={{ fontVariationSettings: "'opsz' 14" }}>
              Not scheduled
            </p>
          </div>
          <button onClick={() => setShowScheduler(true)} className="bg-[#007aff] text-white px-[16px] py-2 h-10 rounded-lg font-['DM_Sans'] font-normal text-[15px] leading-5 hover:bg-[#0066d6] transition-colors" style={{ fontVariationSettings: "'opsz' 14" }}>
            Schedule Scan
          </button>
        </div>
      </div>

      {/* Cookie List Section */}
      <div className="border-b border-black/10 pb-[27px] mb-[36px]">
        {/* Cookie List Header */}
        <div className="flex items-center justify-between mb-4.5 pb-6.5 border-b border-[#000000]/10">
          <h2 className="font-['DM_Sans'] font-semibold text-[25px] text-black tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
            Cookie List
          </h2>
          <div className="flex items-center gap-3">
            <button className="border border-[#007aff] rounded-[11px] px-4 h-[42px] flex items-center gap-2 text-[#007aff] font-['DM_Sans'] font-normal text-sm hover:bg-blue-50 transition-colors" style={{ fontVariationSettings: "'opsz' 14" }}>
              <span>Add Cookie</span>
              <svg className="w-2 h-2" fill="none" viewBox="0 0 8 8">
                <path d={svgPaths.p1e49fd00} fill="#007AFF" />
              </svg>
            </button>
            <button className="border-2 border-[rgba(46,192,79,0.1)] bg-[#2ec04f] text-white rounded-[11px] px-[11px] h-[42px] font-['DM_Sans'] font-medium text-sm hover:bg-[#26a342] transition-colors" style={{ fontVariationSettings: "'opsz' 14" }}>
              Publish Changes
            </button>
          </div>
        </div>

        {/* Cookie Categories Grid */}
        <div className="grid grid-cols-[261px_1fr] gap-[45px]">
          {/* Left Sidebar - Categories */}
          <div className="space-y-[15px]">
            <div className="bg-[#f1f5f9] rounded-2xl py-[17px] px-3">
              <p className="font-['DM_Sans'] font-medium text-base text-black" style={{ fontVariationSettings: "'opsz' 14" }}>
                Necessary (0 Cookie)
              </p>
            </div>
            <div className="py-[17px] px-3">
              <p className="font-['DM_Sans'] font-normal text-base text-[#111827]" style={{ fontVariationSettings: "'opsz' 14" }}>
                Functional (0 Cookie)
              </p>
            </div>
            <div className="py-[17px] px-3">
              <p className="font-['DM_Sans'] font-normal text-base text-[#111827]" style={{ fontVariationSettings: "'opsz' 14" }}>
                Analytics (0 Cookie)
              </p>
            </div>
            <div className="py-[17px] px-3">
              <p className="font-['DM_Sans'] font-normal text-base text-[#111827]" style={{ fontVariationSettings: "'opsz' 14" }}>
                Performance (0 Cookie)
              </p>
            </div>
            <div className="py-[17px] px-3">
              <p className="font-['DM_Sans'] font-normal text-base text-[#111827]" style={{ fontVariationSettings: "'opsz' 14" }}>
                Advertisement (0 Cookie)
              </p>
            </div>
          </div>

          {/* Right Content - Category Details */}
          <div>
            <h3 className="font-['DM_Sans'] font-semibold text-xl text-black leading-5 mb-[21px]" style={{ fontVariationSettings: "'opsz' 14" }}>
              Necessary
            </h3>
            <p className="font-['DM_Sans'] font-normal text-base text-[#4b5563] leading-normal" style={{ fontVariationSettings: "'opsz' 14" }}>
              Necessary cookies are required to enable the basic features of this site, such as providing secure log-in or adjusting your consent preferences. These cookies do not store any personally identifiable data.
            </p>
          </div>
        </div>
      </div>

      {/* Scan History Section */}
      <div>
        <h2 className="font-['DM_Sans'] font-semibold text-[25px] text-black tracking-tight mb-[18px]" style={{ fontVariationSettings: "'opsz' 14" }}>
          Scan History
        </h2>

        {/* Table */}
        <div className="w-full">
  {/* Table Header */}
  <div className="grid grid-cols-[260px_140px_160px_140px_140px_140px_1fr] gap-4 bg-[#f2f7ff] border-b border-[#9fbce4] rounded-[5px] h-[46px] items-center px-6">
    <div className="font-['DM_Sans'] font-medium text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      Scan Date (UTC ± 00:00)
    </div>
    <div className="font-['DM_Sans'] font-medium text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      Scan Status
    </div>
    <div className="font-['DM_Sans'] font-medium text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      Urls Scanned
    </div>
    <div className="font-['DM_Sans'] font-medium text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      Categories
    </div>
    <div className="font-['DM_Sans'] font-medium text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      Cookies
    </div>
    <div className="font-['DM_Sans'] font-medium text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      Scripts
    </div>
    <div></div>
  </div>

  {/* Table Row 1 */}
  <div className="grid grid-cols-[260px_140px_160px_140px_140px_140px_1fr] gap-4 bg-white border-b border-[#9fbce4] h-[50px] items-center px-6">
    <div className="font-['DM_Sans'] font-medium text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      11 February 2026 19:35:12
    </div>

    <div>
      <div className="inline-flex items-center gap-1 bg-[#b6f5cf] px-2 py-0.5 rounded-full h-[19px]">
        <div className="w-[5px] h-[5px] bg-[#118a41] rounded-full"></div>
        <span className="font-['DM_Sans'] font-medium text-[10px] text-[#118a41] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
          Completed
        </span>
      </div>
    </div>

    <div className="font-['DM_Sans'] font-normal text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      2
    </div>

    <div className="font-['DM_Sans'] font-normal text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      NA
    </div>

    <div className="font-['DM_Sans'] font-normal text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      NA
    </div>

    <div className="font-['DM_Sans'] font-normal text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      NA
    </div>

    <div className="font-['DM_Sans'] font-medium text-sm text-[#007aff] tracking-tight hover:underline cursor-pointer whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
      More info
    </div>
  </div>

  {/* Table Row 2 */}
  <div className="grid grid-cols-[260px_140px_160px_140px_140px_140px_1fr] gap-4 bg-white border-b border-[#9fbce4] h-[50px] items-center px-6">
    <div className="font-['DM_Sans'] font-medium text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      11 February 2026 19:35:12
    </div>

    <div>
      <div className="inline-flex items-center gap-1 bg-[#b6f5cf] px-2 py-0.5 rounded-full h-[19px]">
        <div className="w-[5px] h-[5px] bg-[#118a41] rounded-full"></div>
        <span className="font-['DM_Sans'] font-medium text-[10px] text-[#118a41] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
          Completed
        </span>
      </div>
    </div>

    <div className="font-['DM_Sans'] font-normal text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      1 ( Homepage)
    </div>

    <div className="font-['DM_Sans'] font-normal text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      NA
    </div>

    <div className="font-['DM_Sans'] font-normal text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      NA
    </div>

    <div className="font-['DM_Sans'] font-normal text-sm text-[#0a091f] tracking-tight" style={{ fontVariationSettings: "'opsz' 14" }}>
      NA
    </div>

    <div className="font-['DM_Sans'] font-medium text-sm text-[#007aff] tracking-tight hover:underline cursor-pointer whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
      More info
    </div>
  </div>
</div>
      </div>
    </div>
  );
}
