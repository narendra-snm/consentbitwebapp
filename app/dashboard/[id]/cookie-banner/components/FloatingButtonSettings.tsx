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

          <ToggleSwitch
            checked={floatingEnabled}
            onChange={() =>
              onChange({ ...value, enabled: !floatingEnabled })
            }
          />
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
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="position"
                value="left"
                checked={position === "left"}
                onChange={() => onChange({ ...value, position: "left" })}
                className="w-5 h-5 accent-[#007aff]"
              />

              <span
                className="font-['DM_Sans'] text-[15px] text-[#111827]"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Bottom left
              </span>
            </label>

            {/* Bottom Right */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="position"
                value="right"
                checked={position === "right"}
                onChange={() => onChange({ ...value, position: "right" })}
                className="w-5 h-5 accent-[#007aff]"
              />

              <span
                className="font-['DM_Sans'] text-[15px] text-[#111827]"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Bottom right
              </span>
            </label>

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