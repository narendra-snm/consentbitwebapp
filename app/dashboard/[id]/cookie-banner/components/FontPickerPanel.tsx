import React, { useState } from 'react';

const FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Raleway', 'Oswald', 'Merriweather', 'Playfair Display', 'Source Sans Pro',
];

const WEIGHTS = ['Thin', 'Light', 'Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold', 'Black'];

type Alignment = 'left' | 'center' | 'right';

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

const FontPickerPanel: React.FC = () => {
  const [font, setFont] = useState('Inter');
  const [weight, setWeight] = useState('Bold');
  const [alignment, setAlignment] = useState<Alignment>('left');

  return (
    <div className="max-w-[410px] w-full  bg-white rounded-lg ">
      <div className="bg-[#F9F9FA] border border-[#E5E5E5] rounded-lg p-4 pb-6 space-y-4">

        {/* Choose Font */}
        <div>
          <div className="flex items-center space-x-1 mb-2">
            <label className=" ">Choose Font</label>
            <button
              type="button"
              className="w-4 h-4 rounded-full border border-gray-400 text-gray-400 text-[10px] flex items-center justify-center leading-none flex-shrink-0"
              aria-label="Font info"
            >
              ?
            </button>
          </div>
          <div className="relative">
            <select
              value={font}
              onChange={(e) => setFont(e.target.value)}
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
          </div>
        </div>

        {/* Weight */}
        <div>
          <label className="block   mb-2">Weight</label>
          <div className="relative">
            <select
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full appearance-none bg-white border h-[48px] border-gray-300 rounded-lg px-3 py-2  text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer pr-8"
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
            {(['left', 'right','center', ] as Alignment[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAlignment(a)}
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