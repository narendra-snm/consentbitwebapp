"use client";

import Accordion from "./ui/Accordion";
import ToggleSwitch from "./ui/ToggleSwitch";
const svgPaths =  {
p10f04680: "M1.00001 1.00001L4.84084 5.19456C5.23724 5.62746 5.91949 5.62746 6.31588 5.19457L10.1567 1.00001",
p1382e600: "M16.2 0H1.8C0.8073 0 0 0.797333 0 1.77778V14.2222C0 15.2027 0.8073 16 1.8 16H16.2C17.1927 16 18 15.2027 18 14.2222V1.77778C18 0.797333 17.1927 0 16.2 0ZM1.8 14.2222V3.55556H16.2L16.2018 14.2222H1.8Z",
p2ab11100: "M6.5637 5.59375L3.2274 8.88886L6.5637 12.184L7.8363 10.9271L5.7726 8.88886L7.8363 6.85064L6.5637 5.59375ZM11.4363 5.59375L10.1637 6.85064L12.2274 8.88886L10.1637 10.9271L11.4363 12.184L14.7726 8.88886L11.4363 5.59375Z",
}
type CookieNoticeSettings = {
  title: string;
  message: string;
  closeButton: boolean;
  acceptAll: string;
  rejectButton: boolean;
  rejectAll?: string;
  doNotSellLabel?: string;
  customizeButton: boolean;
  customizeLabel: string;
  cookiePolicyLink: boolean;
  url: string;
};

export function CookieNoticeAccordion2({
  value,
  onChange,
  bannerType,
  isOpen,
  onToggle,
}: {
  value?: Partial<CookieNoticeSettings>;
  onChange?: (next: CookieNoticeSettings) => void;
  bannerType: "gdpr" | "ccpa";
  isOpen?: boolean;
  onToggle?: (nextOpen: boolean) => void;
}) {
  const settings: CookieNoticeSettings = {
    title: 'We value your privacy',
    message: 'We use cookies to enhance your browsing experience, serve personalised ads or content, and analyse our traffic. By clicking "Accept All", you consent to our use of cookies.',
    closeButton: true,
    acceptAll: 'Accept',
    rejectAll: 'Reject All',
    doNotSellLabel: 'Do Not Share My Personal Information',
    rejectButton: true,
    customizeButton: true,
    customizeLabel: 'Preferences',
    cookiePolicyLink: true,
    url: 'https.link.com',
    ...(value || {}),
  };

  const update = (patch: Partial<CookieNoticeSettings>) => {
    onChange?.({ ...settings, ...patch });
  };

  const toggleSwitch = (field: keyof CookieNoticeSettings) => {
    const current = settings[field];
    if (typeof current !== "boolean") return;
    update({ [field]: !current } as Partial<CookieNoticeSettings>);
  };

  return (
    <div className="w-full max-w-[409px] mx-auto">

      <Accordion title="Cookie Notice" isOpen={isOpen} onToggle={onToggle}>

       <div className=" pb-6 space-y-6">
            {/* Title Section */}
            <div className="space-y-2">
              <label className="block font-['DM_Sans'] font-normal text-base text-black leading-5" style={{ fontVariationSettings: "'opsz' 14" }}>
                Title
              </label>
              <input
                type="text"
                value={settings.title}
                onChange={(e) => update({ title: e.target.value })}
                className="w-full h-12 px-4 bg-white border-[3px] border-[rgba(0,122,255,0.1)] rounded-lg focus:border-[#007aff] focus:outline-none font-['DM_Sans'] text-base text-[#111827]"
                style={{ fontVariationSettings: "'opsz' 14" }}
              />
            </div>

            {/* Message — CCPA only; GDPR main copy uses saved description / defaults */}
            {bannerType === "ccpa" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    className="block font-['DM_Sans'] font-normal text-base text-black leading-5"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  >
                    Message
                  </label>
                  <button className="w-5 h-5 flex items-center justify-center text-[#007aff]">
                    <svg className="w-[18px] h-4" fill="none" viewBox="0 0 18 16">
                      <g>
                        <path d={svgPaths.p1382e600} fill="#007AFF" />
                        <path d={svgPaths.p2ab11100} fill="#007AFF" />
                      </g>
                    </svg>
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    value={settings.message}
                    onChange={(e) => update({ message: e.target.value })}
                    rows={5}
                    className="w-full p-4 bg-white border border-[#e5e5e5] rounded-lg focus:border-[#007aff] focus:outline-none font-['DM_Sans'] text-[15px] text-[#111827] resize-none leading-normal"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  />
                  <button className="absolute bottom-3 right-3 text-gray-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 20 20">
                      <g filter="url(#filter0_d)" id="Vector 4">
                        <path d="M16 5.5L10.5 11" stroke="#A1A1A1" strokeLinecap="round" />
                      </g>
                      <g filter="url(#filter1_d)" id="Vector 5">
                        <path d="M15 0.5L4.5 11" stroke="#A1A1A1" strokeLinecap="round" />
                      </g>
                      <defs>
                        <filter
                          id="filter0_d"
                          x="6"
                          y="5"
                          width="14.5"
                          height="14.5"
                          filterUnits="userSpaceOnUse"
                          colorInterpolationFilters="sRGB"
                        >
                          <feFlood floodOpacity="0" result="BackgroundImageFix" />
                          <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                          />
                          <feOffset dy="4" />
                          <feGaussianBlur stdDeviation="2" />
                          <feComposite in2="hardAlpha" operator="out" />
                          <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
                          />
                          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
                          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
                        </filter>
                        <filter
                          id="filter1_d"
                          x="0"
                          y="0"
                          width="19.5"
                          height="19.5"
                          filterUnits="userSpaceOnUse"
                          colorInterpolationFilters="sRGB"
                        >
                          <feFlood floodOpacity="0" result="BackgroundImageFix" />
                          <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                          />
                          <feOffset dy="4" />
                          <feGaussianBlur stdDeviation="2" />
                          <feComposite in2="hardAlpha" operator="out" />
                          <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
                          />
                          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
                          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
                        </filter>
                      </defs>
                    </svg>
                  </button>
                </div>
              </div>
            ) : null}

          
            {/* Accept — GDPR initial banner only (hidden for CCPA) */}
            {bannerType === "gdpr" ? (
              <div className="space-y-2">
                <label
                  className="block font-['DM_Sans'] font-normal text-base text-black leading-5"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  Accept All
                </label>
                <input
                  type="text"
                  value={settings.acceptAll}
                  onChange={(e) => update({ acceptAll: e.target.value })}
                  className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg focus:border-[#007aff] focus:outline-none font-['DM_Sans'] text-base text-[#111827]"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                />
              </div>
            ) : null}
              {/* Close button — main banner + preference modals (same setting) */}
            


            {/* "Reject All" button Section */}
            {bannerType === "gdpr" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-['DM_Sans'] font-normal text-base text-black leading-5" style={{ fontVariationSettings: "'opsz' 14" }}>
                    "Reject All" button
                  </label>
                  <ToggleSwitch
                    checked={settings.rejectButton}
                    onChange={() => toggleSwitch('rejectButton')}
                  />
                </div>
                <input
                  type="text"
                  value={settings.rejectAll || ''}
                  onChange={(e) => update({ rejectAll: e.target.value })}
                  className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg font-['DM_Sans'] text-base text-[#111827]"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-6">
                  <label
                    className="block font-['DM_Sans'] font-normal text-base text-black leading-5"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  >
                    Do Not Share link
                  </label>
                  <ToggleSwitch
                    checked={settings.rejectButton}
                    onChange={() => toggleSwitch('rejectButton')}
                  />
                </div>
                <label
                  className="block font-['DM_Sans'] font-normal text-base text-black leading-5"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  Link text
                </label>
                <input
                  type="text"
                  value={settings.doNotSellLabel || ''}
                  onChange={(e) => update({ doNotSellLabel: e.target.value })}
                  className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg font-['DM_Sans'] text-base text-[#111827]"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                />
              </div>
            )}

            {/* "Customize" — GDPR only (Preference button); CCPA has no equivalent on the main banner */}
            {bannerType === 'gdpr' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    className="block font-['DM_Sans'] font-normal text-base text-black leading-5"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  >
                    &quot;Preference&quot; button
                  </label>
                  <ToggleSwitch
                    checked={settings.customizeButton}
                    onChange={() => toggleSwitch('customizeButton')}
                  />
                </div>
                <input
                  type="text"
                  value={settings.customizeLabel}
                  onChange={(e) => update({ customizeLabel: e.target.value })}
                  className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg font-['DM_Sans'] text-base text-[#111827]"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                />
              </div>
            ) : null}

            {/* Privacy policy link on initial banner (+ GDPR preference intro / CCPA opt-out when enabled) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="block font-['DM_Sans'] font-normal text-base text-black leading-5"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  {bannerType === "ccpa"
                    ? "Privacy policy link"
                    : '"Cookie policy" link'}
                </label>
                <ToggleSwitch
                  checked={settings.cookiePolicyLink}
                  onChange={() => toggleSwitch("cookiePolicyLink")}
                />
              </div>
              {bannerType === "gdpr" ? (
                <input
                  type="text"
                  value="Policy"
                  readOnly
                  className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg font-['DM_Sans'] text-base text-[#111827]"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                className="block font-['DM_Sans'] font-normal text-base text-black leading-5"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                {bannerType === "ccpa" ? "Privacy policy URL" : "URL"}
              </label>
              <input
                type="text"
                value={settings.url}
                onChange={(e) => update({ url: e.target.value })}
                placeholder="https://"
                className="w-full h-12 px-4 bg-white border border-[#e5e5e5] rounded-lg focus:border-[#007aff] focus:outline-none font-['DM_Sans'] text-base text-[#111827]"
                style={{ fontVariationSettings: "'opsz' 14" }}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-['DM_Sans'] font-normal text-base text-black leading-5" style={{ fontVariationSettings: "'opsz' 14" }}>
                  Close button
                </label>
                <ToggleSwitch 
                  checked={settings.closeButton} 
                  onChange={() => toggleSwitch('closeButton')} 
                />
              </div>
            </div>
          </div>

      </Accordion>

    </div>
  );
}