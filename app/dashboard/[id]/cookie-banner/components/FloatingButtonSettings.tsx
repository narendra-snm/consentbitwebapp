import React from "react";

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group inline-flex items-center">
      {children}
      <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-max max-w-[220px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-normal text-[#374151] shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal">
        {text}
      </span>
    </span>
  );
}

export type FloatingButtonState = {
  enabled: boolean;
  position: "left" | "right";
};

export function FloatingButtonSettings({
  value,
  onChange,
}: {
  value: FloatingButtonState;
  onChange: (next: FloatingButtonState) => void;
}) {
  const { enabled: floatingEnabled, position } = value;

  return (
    <div className="w-full max-w-[409px] mx-auto">
      <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg p-[18px] space-y-5">

        {/* Floating Button Toggle */}
        <div className="flex items-center justify-between">
          <label
            className="font-['DM_Sans'] font-semibold text-base text-black leading-5"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Floating button
          </label>

          <Tooltip text="Show a persistent floating button so visitors can reopen the consent banner at any time.">
            <ToggleSwitch
              checked={floatingEnabled}
              onChange={() => onChange({ ...value, enabled: !floatingEnabled })}
            />
          </Tooltip>
        </div>

        {/* Position */}
        <div className="space-y-3">
          <label
            className="block font-['DM_Sans'] text-base text-[#111827]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Position
          </label>

          <div className="flex items-center gap-8">

            {/* Bottom Left */}
            <div className="relative group">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="position"
                  value="left"
                  checked={position === "left"}
                  onChange={() => onChange({ ...value, position: "left" })}
                  className="w-5 h-5 accent-[#007aff]"
                />
                <span className="font-['DM_Sans'] text-[15px] text-[#111827]" style={{ fontVariationSettings: "'opsz' 14" }}>
                  Bottom left
                </span>
              </label>
              <span className="pointer-events-none absolute bottom-full left-0 mb-2 w-max max-w-[200px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-normal text-[#374151] shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal">
                Pin the floating button to the bottom-left corner.
              </span>
            </div>

            {/* Bottom Right */}
            <div className="relative group">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="position"
                  value="right"
                  checked={position === "right"}
                  onChange={() => onChange({ ...value, position: "right" })}
                  className="w-5 h-5 accent-[#007aff]"
                />
                <span className="font-['DM_Sans'] text-[15px] text-[#111827]" style={{ fontVariationSettings: "'opsz' 14" }}>
                  Bottom right
                </span>
              </label>
              <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-max max-w-[200px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-normal text-[#374151] shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal">
                Pin the floating button to the bottom-right corner.
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`relative w-[42px] h-[22px] rounded-full transition-colors ${
        checked ? "bg-[#007aff]" : "bg-gray-300"
      }`}
    >
      <div
        className={`absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full transition-transform ${
          checked ? "right-[2px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}