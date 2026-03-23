"use client";

import Image from 'next/image';
import { useEffect, useMemo, useState } from "react";
import { getBannerLanguage, getTranslation } from "./translations";
import { useAppContext } from "@/app/context/AppProvider";
import floatingBtnLogo from '@/public/asset/logo.webp';
import { normalizePrivacyPolicyUrl } from '@/lib/normalizePrivacyPolicyUrl';
import type { BannerLayoutValue } from './bannerAppearance';
import { pxBorderRadiusToRem, weightLabelToNumeric } from './bannerAppearance';
import {CookieConsentBanner} from "./Iab"
/** Strip legacy "More info." suffix from saved preference copy */
function stripTrailingMoreInfo(text: string): string {
  return (text || '').replace(/\s*More info\.?\s*$/i, '').trim();
}

export default function ConsentPreview({
  iabEnabled,
  previewBannerType,
  siteDomain,
  consentType,
  content,
  floatingButton = { enabled: true, position: 'left' as const },
  onPublishChanges,
  isPublishing = false,
  canPublish = false,
  publishError = null,
  publishSuccess = false,
  onDismissPublishSuccess,
  onNext,
  bothModeBannerType,
  onBothModeBannerTypeChange,
  /** Initial cookie banner layout (matches published embed: box / banner / popup). */
  initialLayout,
}: {
  iabEnabled: boolean;
  previewBannerType?: "gdpr" | "ccpa";
  siteDomain?: string | null;
  consentType?: 'gdpr' | 'ccpa' | 'both';
  /** When template is GDPR+CCPA, sync preview tabs with Content editor (controlled). */
  bothModeBannerType?: 'gdpr' | 'ccpa';
  onBothModeBannerTypeChange?: (next: 'gdpr' | 'ccpa') => void;
  /** Floating reopen / preferences control in the browser mock */
  floatingButton?: { enabled: boolean; position: 'left' | 'right' };
  /** Persist banner + floating settings to backend (same payload as dashboard save). */
  onPublishChanges?: () => void | Promise<void>;
  isPublishing?: boolean;
  /** True when there are unpublished draft changes (content, floating button, layout, colors, type). */
  canPublish?: boolean;
  publishError?: string | null;
  publishSuccess?: boolean;
  /** Called when user closes the publish-success popup (backdrop or OK). */
  onDismissPublishSuccess?: () => void;
  /** Optional action for top-right Next button. */
  onNext?: () => void;
  initialLayout?: Pick<BannerLayoutValue, 'position' | 'alignment' | 'borderRadius' | 'borderRadius'>;
  content?: {
    title?: string;
    message?: string;
    acceptAll?: string;
    rejectAll?: string;
    preferencesLabel?: string;
    doNotSellLabel?: string;
    preferenceTitle?: string;
    preferenceMessage?: string;
    closeButton?: boolean;
    rejectButton?: boolean;
    customizeButton?: boolean;
    cookiePolicyLink?: boolean;
    privacyPolicyUrl?: string;
    /** CCPA opt-out preference panel (Do Not Share → modal) */
    ccpaOptOutTitle?: string;
    ccpaOptOutMessage?: string;
    saveMyPreferencesLabel?: string;
  };
}) {
  // Avoid unused prop warnings in strict TS configs.
  void siteDomain;
  const { colors, alignment, bannerLayout, fontFamily: bannerFont, weight } =
    useAppContext();

  const isFreeForced = Boolean(previewBannerType);

  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );

  // For free-plan selection, dropdown already forces previewBannerType.
  // For "both" (non-free), allow switching using the preview tabs.
  const [activeBothType, setActiveBothType] = useState<"gdpr" | "ccpa">("gdpr");

  const selectedBannerType: "gdpr" | "ccpa" = useMemo(() => {
    if (previewBannerType) return previewBannerType;
    if (consentType === 'ccpa') return 'ccpa';
    if (consentType === 'both') {
      if (bothModeBannerType != null) return bothModeBannerType;
      return activeBothType;
    }
    return 'gdpr';
  }, [previewBannerType, consentType, bothModeBannerType, activeBothType]);

  const lang = useMemo(
    () => getBannerLanguage({ autoDetectLanguage: true }),
    [],
  );
  const t = useMemo(() => (key: string) => getTranslation(lang, key), [lang]);

  /**
   * Accept + Reject (primary actions) — same colors.
   * Defaults come from `DEFAULT_APPEARANCE` / saved customization (e.g. primary `#0284c7`), not fixed Tailwind blues.
   */
  const acceptRejectStyle = useMemo(
    () => ({
      backgroundColor: colors.buttonColor,
      color: colors.buttonTextColor,
      borderColor: colors.buttonTextColor,
    }),
    [colors.buttonColor, colors.buttonTextColor],
  );

  /** Preference + Save in panel — same colors (defaults in `bannerAppearance` / DB customise fields). */
  const preferenceStyle = useMemo(
    () => ({
      backgroundColor: colors.preferencesButtonBg,
      color: colors.preferencesButtonText,
      borderColor: colors.preferencesButtonText,
    }),
    [colors.preferencesButtonBg, colors.preferencesButtonText],
  );

  /** Banner / prefs titles + category row labels — matches Colors "Heading color". */
  const headingStyle = useMemo(
    () => ({
      color: colors.headingColor,
      textAlign: alignment as "left" | "center" | "right",
    }),
    [colors.headingColor, alignment],
  );

  /** Body copy — matches Colors "Text color" (avoid `text-black` / fixed grays that override). */
  const bodyTextStyle = useMemo(
    () => ({
      color: colors.textColor,
      textAlign: alignment as "left" | "center" | "right",
    }),
    [colors.textColor, alignment],
  );

  /** Type tab: font + weight (same as `bannerFontFamily` / `bannerFontWeight` on publish). */
  const bannerTypographyStyle = useMemo(() => {
    const safe = String(bannerFont || 'Inter').replace(/['"]/g, '');
    return {
      fontFamily: `'${safe}', ui-sans-serif, system-ui, sans-serif`,
      fontWeight: Number(weightLabelToNumeric(weight)),
    } as const;
  }, [bannerFont, weight]);

  const layoutPos =
    initialLayout?.position ?? bannerLayout?.position ?? "box";
  const layoutAlign =
    initialLayout?.alignment ?? bannerLayout?.alignment ?? "bottom-left";
  const bannerRadiusRem = useMemo(() => {
    const raw =
      initialLayout?.borderRadius ??
      (bannerLayout as { borderRadius?: string } | null)?.borderRadius ??
      "12";
    return pxBorderRadiusToRem(String(raw));
  }, [bannerLayout, initialLayout?.borderRadius]);

  type ModalView = "main" | "gdpr-preferences" | "ccpa-optout";
  const [modalView, setModalView] = useState<ModalView>("main");

  /** GDPR preference panel: which accordion row is expanded (+ / −) */
  const [prefExpanded, setPrefExpanded] = useState<string | null>(null);
  const [prefMarketing, setPrefMarketing] = useState(true);
  const [prefAnalytics, setPrefAnalytics] = useState(false);
  const [prefUserCategory, setPrefUserCategory] = useState(false);

  useEffect(() => {
    // When the banner selection changes, reset to main preview.
    setModalView("main");
  }, [selectedBannerType]);

  useEffect(() => {
    if (modalView !== 'gdpr-preferences') setPrefExpanded(null);
  }, [modalView]);

  const toggleSwitch = (on: boolean, onToggle: () => void) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative h-[22px] w-10 shrink-0 rounded-full transition-colors ${
        on ? 'bg-[#22c55e]' : 'bg-[#d1d5db]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${
          on ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </button>
  );

  const openPreferences = () => {
    setModalView(
      selectedBannerType === "gdpr" ? "gdpr-preferences" : "ccpa-optout",
    );
  };

  const getDeviceFrameClasses = () => {
    switch (device) {
      case "tablet":
        return "w-[768px] max-w-full h-[500px]";
      case "mobile":
        return "w-[390px] max-w-full h-[680px]";
      default:
        return 'w-full h-[444px]';
    }
  };

  useEffect(() => {
    if (!publishSuccess) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismissPublishSuccess?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [publishSuccess, onDismissPublishSuccess]);

  return (
    <>
    <div className="w-full px-4.5">
      {/* Tabs */}
      <div className="flex items-center justify-between mb-4 mt-4.5">
        {/* Free user: show ONLY selected tab based on dropdown selection. */}
        {isFreeForced ? (
          <div className="flex items-center gap-4">
            <div
              className={`h-[30px] rounded-t-md px-3 flex items-center bg-[#edeefc] border-b-2 border-[#007aff]`}
              aria-label={
                selectedBannerType === "gdpr" ? "GDPR tab" : "CCPA tab"
              }
            >
              <p className="font-medium text-base text-[#007aff]">
                {selectedBannerType === "gdpr" ? "GDPR" : "CCPA"}
              </p>
            </div>
          </div>
        ) : consentType === "both" ? (
          // Non-free: allow switching between GDPR and CCPA inside preview.
          <div className="flex items-center gap-4">
            <button
              type="button"
              className={`h-[30px] rounded-t-md px-3 flex items-center ${
                selectedBannerType === "gdpr"
                  ? "bg-[#edeefc] border-b-2 border-[#007aff]"
                  : "text-[#007aff]"
              }`}
              aria-label="GDPR tab"
              onClick={() => {
                if (consentType === 'both') {
                  onBothModeBannerTypeChange?.('gdpr');
                  if (!onBothModeBannerTypeChange) setActiveBothType('gdpr');
                }
                setModalView('main');
              }}
            >
              <p className="font-medium text-base text-[#007aff]">GDPR</p>
            </button>
            <button
              type="button"
              className={`h-[30px] rounded-t-md px-3 flex items-center ${
                selectedBannerType === "ccpa"
                  ? "bg-[#edeefc] border-b-2 border-[#007aff]"
                  : "text-[#111827]"
              }`}
              aria-label="CCPA tab"
              onClick={() => {
                if (consentType === 'both') {
                  onBothModeBannerTypeChange?.('ccpa');
                  if (!onBothModeBannerTypeChange) setActiveBothType('ccpa');
                }
                setModalView('main');
              }}
            >
              <p className="font-medium text-base text-[#007aff]">CCPA</p>
            </button>
          </div>
        ) : (
          // Non-free with single regulation: show one tab.
          <div className="flex items-center gap-4">
            <div
              className={`h-[30px] rounded-t-md px-3 flex items-center bg-[#edeefc] border-b-2 border-[#007aff]`}
              aria-label={
                selectedBannerType === "gdpr" ? "GDPR tab" : "CCPA tab"
              }
            >
              <p className="font-medium text-base text-[#007aff]">
                {selectedBannerType === "gdpr" ? "GDPR" : "CCPA"}
              </p>
            </div>
          </div>
        )}

        {/* Right Side Buttons */}
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 flex items-center justify-center border border-[#e5e5e5] rounded-lg bg-[#f9f9fa] hover:bg-gray-100 transition-colors">
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="0.5"
                y="0.5"
                width="35"
                height="35"
                rx="7.5"
                fill="#F9F9FA"
              />
              <rect
                x="0.5"
                y="0.5"
                width="35"
                height="35"
                rx="7.5"
                stroke="#E5E5E5"
              />
              <path
                d="M12.75 24.75H23.25C23.6478 24.75 24.0294 24.592 24.3107 24.3107C24.592 24.0294 24.75 23.6478 24.75 23.25V15C24.7506 14.9013 24.7317 14.8035 24.6943 14.7121C24.657 14.6207 24.602 14.5376 24.5325 14.4675L21.5325 11.4675C21.4624 11.398 21.3793 11.343 21.2879 11.3057C21.1966 11.2684 21.0987 11.2494 21 11.25H12.75C12.3522 11.25 11.9706 11.408 11.6893 11.6894C11.408 11.9707 11.25 12.3522 11.25 12.75V23.25C11.25 23.6478 11.408 24.0294 11.6893 24.3107C11.9706 24.592 12.3522 24.75 12.75 24.75ZM20.25 23.25H15.75V19.5H20.25V23.25ZM18.75 14.25H17.25V12.75H18.75V14.25ZM12.75 12.75H14.25V15.75H20.25V12.75H20.6925L23.25 15.3075V23.25H21.75V19.5C21.75 19.1022 21.592 18.7207 21.3107 18.4394C21.0294 18.158 20.6478 18 20.25 18H15.75C15.3522 18 14.9706 18.158 14.6893 18.4394C14.408 18.7207 14.25 19.1022 14.25 19.5V23.25H12.75V12.75Z"
                fill="#4B5563"
              />
            </svg>
          </button>

          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              disabled={!canPublish || isPublishing}
              onClick={() => {
                void onPublishChanges?.();
              }}
              className="px-4 h-9 bg-[#2ec04f] text-white text-sm rounded-lg hover:bg-[#26a342] transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {isPublishing ? 'Publishing…' : 'Publish Changes'}
            </button>
            {publishError ? (
              <p className="text-xs text-red-600 max-w-[220px] text-right" role="alert">
                {publishError}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onNext}
            className="px-4 h-9 bg-[#007aff] text-white text-sm rounded-lg hover:bg-[#0066d6] transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Browser Preview */}
      <div
        className={`${getDeviceFrameClasses()} rounded-md overflow-hidden shadow-lg flex flex-col mx-auto`}
      >
        {/* Browser Header */}
        <div className="h-[24px] bg-[#d9d9d9] opacity-50 flex items-center px-2 gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>

        {/* Preview Area — initial banner layout matches embed (box / full-width banner / centered popup) */}
        <div
          className={`relative bg-gray-100 flex-1 flex flex-col min-h-0 overflow-y-auto p-6 pb-5 ${
            modalView === 'main'
              ? layoutPos === 'popup'
                ? 'justify-center items-stretch'
                : 'justify-end'
              : 'justify-center'
          }`}
          style={bannerTypographyStyle}
        >
          {!iabEnabled && <>{  modalView === 'main' ? (
            <div
            style={{borderRadius: `${initialLayout?.borderRadius}px` || "12px"}}
              className={
                layoutPos === 'banner'
                  ? 'w-full shrink-0 self-stretch'
                  : layoutPos === 'popup'
                    ? 'w-full max-w-[360px] shrink-0 self-center'
                    : `w-full max-w-[360px] shrink-0 ${layoutAlign === 'bottom-right' ? 'self-end' : 'self-start'}`
              }
            >
            <div
              className={`shadow-lg w-full p-4 relative ${
                layoutPos === 'banner'
                  ? 'rounded-t-lg rounded-b-none border border-b-0 border-[#e2e8f0]'
                  : 'rounded-md border border-[#e2e8f0]'
              }`}
              style={{ backgroundColor: colors.bannerBg,borderRadius: `${initialLayout?.borderRadius}px` || "12px" }}
            >
              {content?.closeButton ? (
                <button
                  type="button"
                  className="absolute top-2 right-2 text-black opacity-60 hover:opacity-100"
                  aria-label="Close banner preview"
                >
                  ×
                </button>
              ) : null}
              <p
                style={headingStyle}
                className="text-[13px] tracking-tight mb-2"
              >
                {content?.title || t('title')}
              </p>

              <p
                style={bodyTextStyle}
                className="text-[11px] tracking-tight mb-2"
              >
                {(content?.message != null && content.message !== ''
                  ? content.message
                  : null) ??
                  (selectedBannerType === "ccpa"
                  ? t("ccpaDescription")
                  : t("description"))}
                {content?.cookiePolicyLink && content?.privacyPolicyUrl ? (
                  <>
                    {' '}
                    <a
                      href={normalizePrivacyPolicyUrl(content.privacyPolicyUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#007aff] underline"
                    >
                      {t('privacyPolicy')}
                    </a>
                  </>
                ) : null}
              </p>

              {selectedBannerType === 'ccpa' && content?.rejectButton !== false ? (
                <p className="mb-3">
                  <button
                    type="button"
                    className="p-0 border-0 bg-transparent text-[11px] text-[#007aff] underline cursor-pointer text-left"
                    onClick={() => setModalView('ccpa-optout')}
                  >
                    {content?.doNotSellLabel || t('doNotSell')}
                  </button>
                </p>
              ) : null}

              {selectedBannerType !== 'ccpa' ? (
                <div className="flex gap-2" style={{justifyContent:`${alignment==="right"?"flex-end":alignment==="center"?"center":"flex-start"}`, borderRadius: initialLayout?.borderRadius || 12}}>
                  {content?.customizeButton !== false ? (
                    <button
                      className="px-3 py-[2px] border text-[10px] rounded"
                      onClick={openPreferences}
                      type="button"
                      style={preferenceStyle}
                    >
                      {content?.preferencesLabel || t("preferences")}
                    </button>
                  ) : null}

                  {content?.rejectButton !== false ? (
                    <button
                      className="px-3 py-[2px] border text-[10px] rounded"
                      type="button"
                      style={acceptRejectStyle}
                    >
                      {content?.rejectAll || t('rejectAll')}
                    </button>
                  ) : null}

                  <button
                    className="px-3 py-[2px] border text-[10px] rounded"
                    type="button"
                    style={acceptRejectStyle}
                  >
                    {content?.acceptAll || t('acceptAll') || 'Ok, Got it'}
                  </button>
                </div>
              ) : null}
            </div>
            </div>
          ) : (
            <div className="flex w-full shrink-0 justify-center px-1">
            <div className="w-full max-w-[360px]">
          {modalView === "gdpr-preferences" ? (
            <div
              className="rounded-md shadow-lg w-full p-5 border border-[#e2e8f0]"
              style={{ backgroundColor: colors.bannerBg, borderRadius: `${initialLayout?.borderRadius}px` || "12px" }}
            >
              <div className="flex items-center justify-between mb-3">
                <p style={headingStyle} className="text-[14px] tracking-tight">
                  {content?.preferenceTitle || t("cookiePreferences")}
                </p>
                {content?.closeButton ? (
                  <button
                    className="text-black opacity-70"
                    type="button"
                    onClick={() => setModalView("main")}
                    aria-label="Close preferences"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              <p style={bodyTextStyle} className="text-[11px] leading-relaxed mb-4">
                {stripTrailingMoreInfo(content?.preferenceMessage || t('managePreferences'))}
                {content?.cookiePolicyLink && content?.privacyPolicyUrl ? (
                  <>
                    {' '}
                    <a
                      href={normalizePrivacyPolicyUrl(content.privacyPolicyUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#007aff] underline"
                    >
                      {t('privacyPolicy')}
                    </a>
                    .
                  </>
                ) : null}
              </p>

              <div
                className="rounded-lg border border-[#e5e7eb] overflow-hidden mb-1 divide-y divide-[#e5e7eb]"
                style={{ backgroundColor: colors.bannerBg, borderRadius: bannerRadiusRem }}
              >
                {/* Strictly Necessary — Always active */}
                <div>
                  <div className="flex items-center gap-3.5 px-4 py-3 min-h-[48px]">
                    <button
                      type="button"
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded border border-[#e5e7eb] bg-[#f3f4f6] text-sm font-medium text-[#111827] leading-none"
                      aria-expanded={prefExpanded === 'necessary'}
                      onClick={() =>
                        setPrefExpanded((v) => (v === 'necessary' ? null : 'necessary'))
                      }
                    >
                      {prefExpanded === 'necessary' ? '−' : '+'}
                    </button>
                    <span
                      style={{ color: colors.headingColor }}
                      className="flex-1 text-[11px]"
                    >
                      {t('strictlyNecessary')}
                    </span>
                    <span
                      style={{ color: colors.textColor }}
                      className="shrink-0 text-[11px] opacity-90"
                    >
                      {t('alwaysActive')}
                    </span>
                  </div>
                  {prefExpanded === 'necessary' ? (
                    <p
                      style={{ color: colors.textColor }}
                      className="px-3 pb-3 pl-11 text-[10px] leading-relaxed opacity-90"
                    >
                      {t('essentialDescription')}
                    </p>
                  ) : null}
                </div>

                {/* Marketing */}
                <div>
                  <div className="flex items-center gap-3.5 px-4 py-3 min-h-[48px]">
                    <button
                      type="button"
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded border border-[#e5e7eb] bg-[#f3f4f6] text-sm font-medium text-[#111827] leading-none"
                      aria-expanded={prefExpanded === 'marketing'}
                      onClick={() =>
                        setPrefExpanded((v) => (v === 'marketing' ? null : 'marketing'))
                      }
                    >
                      {prefExpanded === 'marketing' ? '−' : '+'}
                    </button>
                    <span
                      style={{ color: colors.headingColor }}
                      className="flex-1 text-[11px]"
                    >
                      {t('marketing')}
                    </span>
                    {toggleSwitch(prefMarketing, () => setPrefMarketing((v) => !v))}
                  </div>
                  {prefExpanded === 'marketing' ? (
                    <p
                      style={{ color: colors.textColor }}
                      className="px-3 pb-3 pl-11 text-[10px] leading-relaxed opacity-90"
                    >
                      {t('marketingDescription')}
                    </p>
                  ) : null}
                </div>

                {/* Analytics */}
                <div>
                  <div className="flex items-center gap-3.5 px-4 py-3 min-h-[48px]">
                    <button
                      type="button"
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded border border-[#e5e7eb] bg-[#f3f4f6] text-sm font-medium text-[#111827] leading-none"
                      aria-expanded={prefExpanded === 'analytics'}
                      onClick={() =>
                        setPrefExpanded((v) => (v === 'analytics' ? null : 'analytics'))
                      }
                    >
                      {prefExpanded === 'analytics' ? '−' : '+'}
                    </button>
                    <span
                      style={{ color: colors.headingColor }}
                      className="flex-1 text-[11px]"
                    >
                      {t('analytics')}
                    </span>
                    {toggleSwitch(prefAnalytics, () => setPrefAnalytics((v) => !v))}
                  </div>
                  {prefExpanded === 'analytics' ? (
                    <p
                      style={{ color: colors.textColor }}
                      className="px-3 pb-3 pl-11 text-[10px] leading-relaxed opacity-90"
                    >
                      {t('analyticsDescription')}
                    </p>
                  ) : null}
                </div>

                {/* Preferences (functional) */}
                <div>
                  <div className="flex items-center gap-3.5 px-4 py-3 min-h-[48px]">
                    <button
                      type="button"
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded border border-[#e5e7eb] bg-[#f3f4f6] text-sm font-medium text-[#111827] leading-none"
                      aria-expanded={prefExpanded === 'preferences'}
                      onClick={() =>
                        setPrefExpanded((v) => (v === 'preferences' ? null : 'preferences'))
                      }
                    >
                      {prefExpanded === 'preferences' ? '−' : '+'}
                    </button>
                    <span
                      style={{ color: colors.headingColor }}
                      className="flex-1 text-[11px]"
                    >
                      {t('preferences')}
                    </span>
                    {toggleSwitch(prefUserCategory, () => setPrefUserCategory((v) => !v))}
                  </div>
                  {prefExpanded === 'preferences' ? (
                    <p
                      style={{ color: colors.textColor }}
                      className="px-3 pb-3 pl-11 text-[10px] leading-relaxed opacity-90"
                    >
                      {t('preferencesDescription')}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 flex-wrap">
                <button
                  style={acceptRejectStyle}
                  className="px-5 py-2 min-w-[88px] border text-[11px] rounded-md hover:opacity-95"
                  type="button"
                  onClick={() => setModalView("main")}
                >
                  {content?.rejectAll || t("rejectAll")}
                </button>
                <button
                  style={preferenceStyle}
                  className="px-5 py-2 min-w-[88px] border text-[11px] rounded-md hover:opacity-95"
                  type="button"
                  onClick={() => setModalView("main")}
                >
                  {t("save")}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="rounded-md shadow-lg w-full p-4 border border-[#e2e8f0]"
              style={{ backgroundColor: colors.bannerBg, borderRadius: `${initialLayout?.borderRadius}px` || "12px" }}
            >
              <div className="flex items-center justify-between mb-3">
                <p style={headingStyle} className="text-[13px] tracking-tight">
                  {content?.ccpaOptOutTitle || t("optOutPreference")}
                </p>
                {content?.closeButton ? (
                  <button
                    className="text-black opacity-70"
                    type="button"
                    onClick={() => setModalView("main")}
                    aria-label="Close opt-out"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              <p style={bodyTextStyle} className="text-[11px] tracking-tight mb-3 leading-relaxed">
                {stripTrailingMoreInfo(
                  content?.ccpaOptOutMessage || t('ccpaOptOutPreferenceIntro')
                )}
                {content?.cookiePolicyLink && content?.privacyPolicyUrl ? (
                  <>
                    {' '}
                    <a
                      href={normalizePrivacyPolicyUrl(content.privacyPolicyUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#007aff] underline"
                    >
                      {t('privacyPolicy')}
                    </a>
                    .
                  </>
                ) : null}
              </p>

              <label className="flex items-start gap-3 text-[11px] mb-4 cursor-pointer">
                <input type="checkbox" className="shrink-0 mt-0.5" />
                <span style={{ color: colors.textColor }} className="leading-snug flex-1">
                  {content?.doNotSellLabel || t('doNotSell')}
                </span>
              </label>

              <div className="flex gap-2">
                <button
                  style={acceptRejectStyle}
                  className="flex-1 px-3 py-[6px] border text-[11px] rounded"
                  type="button"
                  onClick={() => setModalView("main")}
                >
                  {t("cancel")}
                </button>
                <button
                  style={preferenceStyle}
                  className="flex-1 px-3 py-[6px] border text-[11px] rounded"
                  type="button"
                  onClick={() => setModalView("main")}
                >
                  {content?.saveMyPreferencesLabel || t("saveMyPreferences")}
                </button>
              </div>
            </div>
          )}
            </div>
            </div>
          )}</>}
{iabEnabled && <CookieConsentBanner alignment={initialLayout?.alignment} device={device} config={{
  bannerBg:colors.bannerBg || "#FFFFFF",
  textColor:colors.textColor || "#000000",
  headingColor: colors.headingColor || "#000000",
  buttonColor:colors.buttonColor || "#FFFFFF",
  buttonTextColor:colors.buttonTextColor || "#007AFF",
  SecButtonColor:colors.SecButtonColor || "#007AFF",
  SecButtonTextColor: colors.SecButtonTextColor || "#FFFFFF",
  textAlign: alignment || "left",
  fontWeight: "400",
  borderRadius: initialLayout?.borderRadius || "12",
  bannerType: initialLayout?.position || "banner", // "box" | "banner" | "popup"
}} />}
          {/* Corner of the browser mock (default bottom-left; right when Position = bottom right) */}
          {floatingButton.enabled ? (
            <button
              type="button"
              className={`absolute bottom-4 z-20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#007aff]/50 focus:ring-offset-2 focus:ring-offset-gray-100 ${
                floatingButton.position === 'right' ? 'right-4' : 'left-4'
              }`}
              onClick={openPreferences}
              aria-label={
                content?.preferencesLabel ||
                (selectedBannerType === 'ccpa'
                  ? content?.doNotSellLabel || t('doNotSell')
                  : t('preferences'))
              }
            >
              <Image
                src={floatingBtnLogo}
                alt=""
                width={floatingBtnLogo.width}
                height={floatingBtnLogo.height}
                draggable={false}
                className="pointer-events-none h-auto w-auto max-h-[1.65rem] max-w-[1.65rem] object-contain object-center select-none drop-shadow-md"
                sizes="28px"
              />
            </button>
          ) : null}
        </div>
      </div>

      {/* Device Selector */}
      <div className="flex gap-6 mt-6 items-center">
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => setDevice("mobile")}
        >
          <div
            className="w-[10px] h-[17px] border-2 rounded-sm"
            style={{
              borderColor: device === "mobile" ? "#007aff" : "#4B5563",
            }}
          />
          <p
            className="text-base"
            style={{ color: device === "mobile" ? "#007aff" : "#6B7280" }}
          >
            Phone
          </p>
        </button>
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => setDevice("tablet")}
        >
          <div
            className="w-[16px] h-[17px] border-2 rounded-sm"
            style={{
              borderColor: device === "tablet" ? "#007aff" : "#4B5563",
            }}
          />
          <p
            className="text-base"
            style={{ color: device === "tablet" ? "#007aff" : "#6B7280" }}
          >
            Tab
          </p>
        </button>
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => setDevice("desktop")}
        >
          <div
            className="w-[24px] h-[17px] border-2 rounded-sm"
            style={{
              borderColor: device === "desktop" ? "#007aff" : "#4B5563",
            }}
          />
          <p
            className="text-base"
            style={{ color: device === "desktop" ? "#007aff" : "#6B7280" }}
          >
            Desktop
          </p>
        </button>
      </div>
    </div>

    {publishSuccess ? (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
        role="presentation"
        onClick={() => onDismissPublishSuccess?.()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-success-title"
          aria-describedby="publish-success-desc"
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#dcfce7]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M20 6L9 17l-5-5"
                stroke="#15803d"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2
            id="publish-success-title"
            className="mt-3 font-['DM_Sans'] text-lg font-semibold text-[#15803d]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Banner updated successfully
          </h2>
          <p
            id="publish-success-desc"
            className="mt-2 font-['DM_Sans'] text-sm leading-relaxed text-[#374151]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Your preview reflects saved content.
            <span className="mt-2 block text-[#6b7280]">
              On live sites, allow up to ~2 minutes for the embed script cache to refresh, or hard-refresh the page.
            </span>
          </p>
          <button
            type="button"
            className="mt-6 w-full rounded-lg bg-[#2ec04f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#26a342] transition-colors"
            onClick={() => onDismissPublishSuccess?.()}
          >
            OK
          </button>
        </div>
      </div>
    ) : null}
    </>
  );
}
