"use client";

export default function ToggleSwitch({
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