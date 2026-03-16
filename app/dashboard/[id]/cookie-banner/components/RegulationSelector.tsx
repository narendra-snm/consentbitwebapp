import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function RegulationSelector() {
  const [value, setValue] = useState("CCPA (USA)");
  const [open, setOpen] = useState(false);

  const options = [
    "CCPA (USA)",
    "GDPR (EU)",
    "LGPD (Brazil)",
    "PIPEDA (Canada)"
  ];

  return (
    <div className="w-full max-w-[409px] mx-auto">
      <div className="relative">

        {/* Select Button */}
        <button
          onClick={() => setOpen(!open)}
          className="w-full h-12 px-4 flex items-center justify-between bg-white border border-[#e5e5e5] rounded-lg font-['DM_Sans'] text-base text-[#111827]"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          {value}

          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute mt-2 w-full bg-white border border-[#e5e5e5] rounded-lg shadow-sm overflow-hidden z-10">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  setValue(option);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-3 font-['DM_Sans'] text-[15px] text-[#111827] hover:bg-gray-50"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}