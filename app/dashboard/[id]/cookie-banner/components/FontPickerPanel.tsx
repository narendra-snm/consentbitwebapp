import React, { useState } from 'react';
import { useAppContext } from "@/app/context/AppProvider";
import type { TypeSettings } from './bannerAppearance';

function Tooltip({ text, children, align = 'left' }: { text: string; children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <span className="relative group inline-flex items-center">
      {children}
      <span className={`pointer-events-none absolute bottom-full mb-2 w-max max-w-[220px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs text-[#374151] shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal ${align === 'right' ? 'right-0' : 'left-0'}`}>
        {text}
      </span>
    </span>
  );
}

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
          <div className="mb-2">
            <Tooltip text="Controls how thick or thin the banner text appears.">
              <label className="cursor-default">Weight</label>
            </Tooltip>
          </div>
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
          <Tooltip text="Set the text alignment inside the banner — left, center, or right.">
            <label className="cursor-default">Alignment</label>
          </Tooltip>
          <div className="flex items-center space-x-2">
            {(['left', 'center', 'right'] as Alignment[]).map((a) => {
              const tipText = a === 'left' ? 'Align banner text to the left.' : a === 'center' ? 'Center the banner text.' : 'Align banner text to the right.';
              return (
                <div key={a} className="relative group">
                  <button
                    type="button"
                    onClick={() => patch({ alignment: a })}
                    className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${
                      alignment === a
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-white border border-[#E5E5E5] hover:bg-gray-50'
                    }`}
                    aria-label={`Align ${a}`}
                  >
                    {a === 'left' && <AlignLeftIcon active={alignment === 'left'} />}
                    {a === 'center' && <AlignCenterIcon active={alignment === 'center'} />}
                    {a === 'right' && <AlignRightIcon active={alignment === 'right'} />}
                  </button>
                  <span className={`pointer-events-none absolute bottom-full mb-2 w-max max-w-[160px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs text-[#374151] shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal ${a === 'left' ? 'left-0' : 'right-0'}`}>
                    {tipText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FontPickerPanel;
