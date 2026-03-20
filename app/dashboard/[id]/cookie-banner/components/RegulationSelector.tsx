import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

export function RegulationSelector({
  site,
  loading,
  effectivePlanId,
  onChange,
}: {
  site?: any | null;
  loading?: boolean;
  effectivePlanId?: string;
  onChange?: (next: { bannerType: 'gdpr' | 'ccpa'; regionMode: 'gdpr' | 'ccpa' | 'both' }) => void | Promise<void>;
}) {
  const isFree = useMemo(() => {
    const v = String(effectivePlanId ?? '').toLowerCase();
    return v === 'free' || v.startsWith('free');
  }, [effectivePlanId]);
  const computedValue = useMemo(() => {
    const bannerType = site?.banner_type || "gdpr";
    const regionMode = site?.region_mode || "gdpr";
    if (regionMode === 'both') return 'GDPR + CCPA';
    if (bannerType === 'ccpa' || regionMode === 'ccpa') return 'CCPA (USA)';
    return 'GDPR (EU)';
  }, [site]);

  const [value, setValue] = useState<string>(computedValue);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setValue(computedValue);
  }, [computedValue]);

  const options: Array<{ label: string; disabled: boolean }> = [
    { label: 'GDPR (EU)', disabled: false },
    { label: 'GDPR + CCPA', disabled: isFree },
    { label: 'CCPA (USA)', disabled: false },
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
            {options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  if (loading) return;

                  if (opt.disabled) return;

                  setValue(opt.label);
                  setOpen(false);

                  if (!onChange) return;

                  if (opt.label === 'CCPA (USA)') {
                    onChange({ bannerType: 'ccpa', regionMode: 'ccpa' });
                    return;
                  }

                  if (opt.label === 'GDPR (EU)') {
                    onChange({ bannerType: 'gdpr', regionMode: 'gdpr' });
                    return;
                  }

                  if (opt.label === 'GDPR + CCPA') {
                    onChange({ bannerType: 'gdpr', regionMode: 'both' });
                    return;
                  }
                }}
                disabled={loading || opt.disabled}
                className="w-full text-left px-4 py-3 font-['DM_Sans'] text-[15px] text-[#111827] hover:bg-gray-50 disabled:opacity-60"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}