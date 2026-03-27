import React, { useState } from 'react';
import { useAppContext } from "@/app/context/AppProvider";
import type { TypeSettings } from './bannerAppearance';

const FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Raleway', 'Oswald', 'Merriweather', 'Playfair Display', 'Source Sans Pro',
];
const WEIGHTS = ['Thin', 'Light', 'Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold', 'Black'];

type Alignment = 'left' | 'center' | 'right';

type Props = {
  /** When set with `onChange`, panel is controlled from parent `appearance.type` (publish + preview stay in sync). */
  value?: TypeSettings;
  onChange?: (next: TypeSettings) => void;
};

const AlignLeftIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="16" height="2" rx="1" fill={active ? 'white' : '#555'} />
    <rect x="2" y="9" width="10" height="2" rx="1" fill={active ? 'white' : '#555'} />
    <rect x="2" y="14" width="13" height="2" rx="1" fill={active ? 'white' : '#555'} />
  </svg>
);

const AlignCenterIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="16" height="2" rx="1" fill={active ? 'white' : '#555'} />
    <rect x="5" y="9" width="10" height="2" rx="1" fill={active ? 'white' : '#555'} />
    <rect x="3.5" y="14" width="13" height="2" rx="1" fill={active ? 'white' : '#555'} />
  </svg>
);

const AlignRightIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="16" height="2" rx="1" fill={active ? 'white' : '#555'} />
    <rect x="8" y="9" width="10" height="2" rx="1" fill={active ? 'white' : '#555'} />
    <rect x="5" y="14" width="13" height="2" rx="1" fill={active ? 'white' : '#555'} />
  </svg>
);

const FontPickerPanel: React.FC<Props> = ({ value, onChange }) => {
  const ctx = useAppContext();
  const [localFont, setLocalFont] = useState('Inter');

  const controlled = value != null && onChange != null;
  const font = controlled ? value.font : localFont;
  const weight = controlled ? value.weight : ctx.weight;
  const alignment = controlled ? value.alignment : ctx.alignment;

  const patch = (next: Partial<TypeSettings>) => {
    if (controlled && value && onChange) {
      onChange({ ...value, ...next });
      return;
    }
    if (next.font != null) {
      setLocalFont(next.font);
      ctx.setFontFamily(next.font);
    }
    if (next.weight != null) ctx.setWeight(next.weight);
    if (next.alignment != null) ctx.setAlignment(next.alignment);
  };

  return (
    <div className="max-w-[410px] w-full  bg-white rounded-lg ">
      <div className="bg-[#F9F9FA] border border-[#E5E5E5] rounded-lg p-4 pb-6 space-y-4">

        {/* Choose Font */}
        <div>
          <div className="flex items-center space-x-1 mb-2">
            <label className="font-semibold ">Choose Font</label>
            <button
              type="button"
              className=" text-[10px] ml-1 flex items-center justify-center leading-none flex-shrink-0"
              aria-label="Font info"
            >
             <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="0.5" y="0.5" width="17" height="17" rx="8.5" fill="#D4D4D4" stroke="#D4D4D4"/>
<path d="M5.96387 7.60144C5.96387 7.01877 6.08677 6.49072 6.33259 6.0173C6.58751 5.53477 6.94713 5.15694 7.41145 4.88381C7.88487 4.61069 8.43568 4.47412 9.06387 4.47412C9.64655 4.47412 10.1609 4.57882 10.607 4.78822C11.0532 4.99762 11.3946 5.2844 11.6313 5.64857C11.8771 6.01274 12 6.42699 12 6.89131C12 7.44667 11.8816 7.90188 11.6449 8.25695C11.4082 8.61201 11.0805 8.93522 10.6617 9.22655C10.2065 9.5452 9.88326 9.81378 9.69207 10.0323C9.50088 10.2417 9.40528 10.5148 9.40528 10.8517V11.2067H8.35374V10.7288C8.35374 10.3919 8.41747 10.1006 8.54493 9.85475C8.67239 9.60893 8.82716 9.40864 9.00925 9.25387C9.20044 9.08999 9.46901 8.88969 9.81498 8.65298C10.1518 8.41627 10.4022 8.17046 10.5661 7.91554C10.7391 7.66062 10.8256 7.35562 10.8256 7.00056C10.8256 6.56355 10.6617 6.20849 10.3339 5.93536C10.0153 5.65312 9.59647 5.51201 9.07753 5.51201C8.48575 5.51201 8.00778 5.7032 7.64361 6.08558C7.28854 6.46796 7.11101 6.97324 7.11101 7.60144H5.96387ZM8.12158 13.4327C8.12158 13.2051 8.19441 13.023 8.34008 12.8865C8.48575 12.7408 8.67239 12.668 8.9 12.668C9.1276 12.668 9.31424 12.7408 9.45991 12.8865C9.60558 13.023 9.67841 13.2051 9.67841 13.4327C9.67841 13.6603 9.60558 13.847 9.45991 13.9926C9.31424 14.1292 9.1276 14.1975 8.9 14.1975C8.67239 14.1975 8.48575 14.1292 8.34008 13.9926C8.19441 13.847 8.12158 13.6603 8.12158 13.4327Z" fill="#5C5C5C"/>
</svg>

            </button>
          </div>
          {/* <div className="relative">
            <select
              value={font}
              onChange={(e) => patch({ font: e.target.value })}
              className="w-full appearance-none bg-white border h-[48px] border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer pr-8"
            >
              {FONTS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div> */}
        </div>

        {/* Weight */}
        <div>
          <label className="block   mb-2">Weight</label>
          <div className="relative">
            <select
              value={weight}
              onChange={(e) => patch({ weight: e.target.value })}
              className="w-full appearance-none bg-white border h-[48px] border-gray-300 rounded-lg px-3 py-2   text-[#111827] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer pr-8"
            >
              {WEIGHTS.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Alignment */}
        <div className="flex items-center justify-between">
          <label className="">Alignment</label>
          <div className="flex items-center space-x-2">
            {(['left', 'center', 'right'] as Alignment[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => patch({ alignment: a })}
                className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${
                  alignment === a
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-white border border-[#E5E5E5]  hover:bg-gray-50'
                }`}
                aria-label={`Align ${a}`}
              >
                {a === 'left' && <AlignLeftIcon active={alignment === 'left'} />}
                {a === 'center' && <AlignCenterIcon active={alignment === 'center'} />}
                {a === 'right' && <AlignRightIcon active={alignment === 'right'} />}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FontPickerPanel;
