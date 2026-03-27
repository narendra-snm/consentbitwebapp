'use client';

import type { BannerLayoutValue } from './bannerAppearance';

type Position = BannerLayoutValue['position'];

const positions: Array<{ id: Position; label: string }> = [
  { id: 'box', label: 'Box' },
  { id: 'banner', label: 'Banner' },
  { id: 'bottom-center', label: 'Bottom Center' },
];

const animations = ['Fade In', 'Slide Up', 'Slide Down', 'Zoom In'];

type Props = {
  value: BannerLayoutValue;
  onChange: (next: BannerLayoutValue) => void;
};

export default function BannerControl({ value, onChange }: Props) {
  const { position, alignment, borderRadius, animation } = value;

  const patch = (partial: Partial<BannerLayoutValue>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <div className="max-w-[454px] space-y-6 rounded-lg bg-white  ">
      <div className="space-y-3 mb-[50px]">
        <h3 className=" font-semibold pb-1">Banner position</h3>
        <div className="flex items-end gap-8">
          {positions.map((pos) => (
            <button
              key={pos.id}
              type="button"
              onClick={() => patch({ position: pos.id })}
              className="relative flex flex-col items-start gap-2 focus:outline-none"
              aria-label={`Select ${pos.label} position`}
            >
              {position === pos.id && (
                <span className="absolute top-1 right-1">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="8" cy="8" r="8" fill="#2EC04F" />
                    <path
                      d="M5 8L6.64645 9.64645C6.84171 9.84171 7.15829 9.84171 7.35355 9.64645L11 6"
                      stroke="white"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              )}

              {pos.id === 'box' && (
                <svg width="100" height="64" viewBox="0 0 100 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0.5" y="0.5" width="99" height="63" rx="3.5" fill="white" stroke="#E5E5E5" />
                  <rect x="7" y="38" width="50" height="21" rx="2" fill="#007AFF" />
                  <path d="M85 13L86.6464 14.6464C86.8417 14.8417 87.1583 14.8417 87.3536 14.6464L91 11" stroke="white" strokeLinecap="round" />
                </svg>
              )}
              {pos.id === 'banner' && (
                <svg width="100" height="64" viewBox="0 0 100 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0.5" y="0.5" width="99" height="63" rx="3.5" fill="white" stroke="#E5E5E5" />
                  <rect x="7" y="38" width="86" height="21" rx="2" fill="#007AFF" />
                  <path d="M85 13L86.6464 14.6464C86.8417 14.8417 87.1583 14.8417 87.3536 14.6464L91 11" stroke="white" strokeLinecap="round" />
                </svg>
              )}
              {pos.id === 'bottom-center' && (
                <svg width="100" height="64" viewBox="0 0 100 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0.5" y="0.5" width="99" height="63" rx="3.5" fill="white" stroke="#E5E5E5" />
                  <rect x="15" y="38" width="70" height="21" rx="2" fill="#007AFF" />
                </svg>
              )}
              <span className="text-sm text-[#111827] ml-1">{pos.label}</span>
            </button>
          ))}
        </div>
      </div>

      {position === 'box' && (
      <div className="space-y-3 mb-[37px]">
        <h3 className=" font-semibold text-gray-900">Alignment</h3>
        {/* <p className="text-xs text-[#6b7280]">Corner position for the box layout only.</p> */}

        <div className="flex items-center gap-10">
          {(['bottom-left', 'bottom-right'] as const).map((a) => {
            const isActive = alignment === a;
            return (
              <label key={a} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="alignment"
                  value={a}
                  checked={isActive}
                  onChange={() => patch({ alignment: a })}
                  className="hidden"
                />
                <span
                  className={`flex items-center justify-center w-[27px] h-[27px] rounded-full border transition
            ${isActive ? 'border-blue-500' : 'border-gray-300'}`}
                >
                  {isActive && <span className="w-4 h-4 bg-blue-500 rounded-full" />}
                </span>
                <span className="text-sm text-[#111827]">
                  {a === 'bottom-left' ? 'Bottom left' : 'Bottom right'}
                </span>
              </label>
            );
          })}
        </div>
      </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-[#F9F9FA] p-5 space-y-3">
        <h3 className=" font-semibold ">Border Radious</h3>
        <input
          type="number"
          min={0}
          value={borderRadius}
          onChange={(e) => patch({ borderRadius: e.target.value })}
          className="w-full rounded-lg border border-[#E5E5E5] bg-white px-4 py-3  text-[#111827] outline-none focus:border-blue-500"
          placeholder="12"
        />
      </div>

      <div className="rounded-xl border border-[#E5E5E5] bg-[#F9F9FA] p-5 space-y-3">
        <h3 className=" font-semibold ">Animation</h3>
        <select
          value={animation}
          onChange={(e) => patch({ animation: e.target.value })}
          className="w-full rounded-lg border border-[#E5E5E5] pr-10 bg-white px-4 py-3  text-[#111827] outline-none focus:border-blue-500"
        >
          {animations.map((anim) => (
            <option key={anim} value={anim.toLowerCase().replace(' ', '-')}>
              {anim}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
