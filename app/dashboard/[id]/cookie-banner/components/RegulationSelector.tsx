"use client";
import { useEffect, useMemo, useRef, useState } from "react";
 const ChevronDown = ({ size = 16, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
import { useRouter } from "next/navigation";
import { useDashboardSession } from "@/app/dashboard/DashboardSessionProvider";

export function RegulationSelector({
  site,
  loading,
  disabled,
  effectivePlanId,
  onChange,
}: {
  site?: any | null;
  loading?: boolean;
  disabled?: boolean;
  effectivePlanId?: string;
  onChange?: (next: { bannerType: 'gdpr' | 'ccpa'; regionMode: 'gdpr' | 'ccpa' | 'both' }) => void | Promise<void>;
}) {
  const router = useRouter();
  const { activeSiteId } = useDashboardSession();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const canUseBoth = useMemo(() => {
    const v = String(effectivePlanId ?? '').toLowerCase();
    return v === 'essential' || v === 'growth';
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
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    setValue(computedValue);
  }, [computedValue]);

  // Close upgrade card when clicking outside
  useEffect(() => {
    if (!showUpgrade) return;
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowUpgrade(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUpgrade]);

  const options = [
    { label: 'GDPR (EU)' },
    { label: 'GDPR + CCPA' },
    { label: 'CCPA (USA)' },
  ];

  function handleSelect(label: string) {
    if (label === 'GDPR + CCPA' && !canUseBoth) {
      setOpen(false);
      setShowUpgrade(true);
      return;
    }

    setValue(label);
    setOpen(false);
    setShowUpgrade(false);

    if (!onChange) return;
    if (label === 'CCPA (USA)') { onChange({ bannerType: 'ccpa', regionMode: 'ccpa' }); return; }
    if (label === 'GDPR (EU)') { onChange({ bannerType: 'gdpr', regionMode: 'gdpr' }); return; }
    if (label === 'GDPR + CCPA') { onChange({ bannerType: 'gdpr', regionMode: 'both' }); return; }
  }

  return (
    <div ref={wrapperRef} className="w-full max-w-[409px] mx-auto">
      <div className="relative">

        {/* Select Button */}
        <button
          type="button"
          disabled={Boolean(loading || disabled)}
          onClick={() => {
            if (loading || disabled) return;
            setOpen(!open);
            setShowUpgrade(false);
          }}
          className={`w-full h-12 px-4 flex items-center justify-between bg-white border border-[#e5e5e5] rounded-lg font-['DM_Sans'] text-base text-[#111827] ${
            loading || disabled ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          style={{ fontVariationSettings: "'opsz' 14" }}
          suppressHydrationWarning
        >
          <span suppressHydrationWarning>{value}</span>
          <svg
  xmlns="http://www.w3.org/2000/svg"
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
>
  <path d="M6 9l6 6 6-6" />
</svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute mt-2 w-full bg-white border border-[#e5e5e5] rounded-lg shadow-sm z-10">
            {options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleSelect(opt.label)}
                className="w-full text-left px-4 py-3 font-['DM_Sans'] text-[15px] text-[#111827] hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Upgrade to Pro card — same design as IAB/TCF tooltip */}
        {showUpgrade && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-50">
            <div className="w-[222px] bg-white rounded-xl shadow-xl border border-gray-200 p-2 pt-4">
              <p className="font-semibold mb-1">Upgrade to Pro</p>
              <p className="text-sm text-[#1A5EA1] leading-relaxed mb-3">
                To enable this feature, please switch to the Essential or Growth plan.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowUpgrade(false);
                  const id = activeSiteId || site?.id;
                  router.push(id ? `/dashboard/${id}/upgrade` : '/dashboard');
                }}
                className="w-full h-[40px] flex items-center justify-center gap-3 bg-[#007AFF] hover:bg-blue-700 text-white text-[15px] font-semibold py-3.75 rounded-md transition"
              >
                Get Pro Plan <span>→</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
