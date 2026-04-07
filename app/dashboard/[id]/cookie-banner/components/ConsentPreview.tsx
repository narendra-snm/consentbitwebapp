"use client";

import React, { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from 'next/image';
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

// Keep parity with editor + CDN/embed so preview never "breaks" with long strings.
const LIMITS = {
  title: 30,
  message: 320,
  button: 20,
  policyLabel: 30,
} as const;

function clampLen(value: string | undefined, max: number): string {
  const s = value ?? "";
  return s.length > max ? s.slice(0, max) : s;
}

// Default fallbacks for button/title fields — used when stored value looks corrupted (too long).
const FIELD_DEFAULTS: Record<string, string> = {
  title: 'We value your privacy',
  acceptAll: 'Accept',
  rejectAll: 'Reject',
  preferencesLabel: 'Preference',
  saveMyPreferencesLabel: 'Save Preference',
  doNotSellLabel: 'Do Not Share My Personal Information',
};

/** Returns stored value if it looks reasonable; otherwise falls back to a safe default. */
function safeField(key: string, value: string | undefined, max: number): string {
  const s = value ?? '';
  // If the stored value is suspiciously long for this field type, use the default
  if (s.length > max) return FIELD_DEFAULTS[key] ?? s.slice(0, max);
  return s;
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group inline-flex items-center">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-normal text-[#374151] shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal">
        {text}
      </span>
    </span>
  );
}

export default function ConsentPreview({
  iabEnabled,
  previewBannerType,
  siteDomain,
  consentType,
  content,
  floatingButton = { enabled: true, position: 'left' as const },
  onSaveChanges,
  saveDisabled = true,
  saveBusy = false,
  saveSuccess = false,
  onDismissSaveSuccess,
  onPublishChanges,
  publishBusy = false,
  publishDisabled = false,
  publishError = null,
  publishSuccess = false,
  onDismissPublishSuccess,
  onNext,
  bothModeBannerType,
  onBothModeBannerTypeChange,
  forceModalView,
  /** Initial cookie banner layout (matches published embed: box / banner / popup). */
  initialLayout,
}: {
  iabEnabled: boolean;
  previewBannerType?: "gdpr" | "ccpa" |'iab';
  siteDomain?: string | null;
  consentType?: 'gdpr' | 'ccpa' | 'both';
  /** When template is GDPR+CCPA, sync preview tabs with Content editor (controlled). */
  bothModeBannerType?: 'gdpr' | 'ccpa';
  onBothModeBannerTypeChange?: (next: 'gdpr' | 'ccpa') => void;
  /** Floating reopen / preferences control in the browser mock */
  floatingButton?: { enabled: boolean; position: 'left' | 'right' };
  /** When set, forces the preview to show this view (e.g. "gdpr-preferences" when preference accordion is open). */
  forceModalView?: 'main' | 'gdpr-preferences' | 'ccpa-optout';
  /** Persist recent editor changes to the server (draft save; use when you have unpublished edits). */
  onSaveChanges?: () => void | Promise<void>;
  /** When true, Save is not clickable (no pending edits or request in flight). */
  saveDisabled?: boolean;
  saveSuccess?: boolean;
  onDismissSaveSuccess?: () => void;
  /** Push live to the embed (same API as save; shows success dialog). Available even when nothing changed (re-publish). */
  onPublishChanges?: () => void | Promise<void>;
  saveBusy?: boolean;
  publishBusy?: boolean;
  /** When true, Publish is not clickable (e.g. no site or save/publish request in flight). */
  publishDisabled?: boolean;
  publishError?: string | null;
  publishSuccess?: boolean;
  /** Called when user closes the publish-success popup (backdrop or OK). */
  onDismissPublishSuccess?: () => void;
  /** Optional action for top-right Next button. */
  onNext?: () => void;
  initialLayout?: Pick<BannerLayoutValue, 'position' | 'alignment' | 'borderRadius' | 'animation'>;
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
    cookiePolicyLabel?: string;
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

  const selectedBannerType: "gdpr" | "ccpa" | "iab" = useMemo(() => {
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

  const bannerAnimation = initialLayout?.animation ?? (bannerLayout as BannerLayoutValue | null)?.animation ?? 'fade-in';

  const previewAnimStyle = useMemo((): CSSProperties => {
    if (bannerAnimation === 'slide-up') return { animation: 'cbPreviewSlideUp 0.4s ease-out both' };
    if (bannerAnimation === 'slide-down') return { animation: 'cbPreviewSlideDown 0.4s ease-out both' };
    if (bannerAnimation === 'zoom-in') return { animation: 'cbPreviewZoomIn 0.3s ease-out both' };
    return { animation: 'cbPreviewFadeIn 0.3s ease-out both' };
  }, [bannerAnimation]);

  type ModalView = "main" | "gdpr-preferences" | "ccpa-optout";
  const [modalView, setModalView] = useState<ModalView>("main");
  useEffect(() => {
    if (forceModalView) setModalView(forceModalView);
  }, [forceModalView]);
  const previewAreaRef = useRef<HTMLDivElement | null>(null);
  const initialBannerRef = useRef<HTMLDivElement | null>(null);
  /** How many px we need to lift the floating button to clear the banner. */
  /** GDPR preference panel: which accordion row is expanded (+ / −) */
  const [prefExpanded, setPrefExpanded] = useState<string | null>(null);
  const [prefMarketing, setPrefMarketing] = useState(false);
  const [prefAnalytics, setPrefAnalytics] = useState(false);
  const [prefUserCategory, setPrefUserCategory] = useState(false);

  const safeContent = useMemo(() => {
    const c = content || {};
    return {
      ...c,
      title: safeField('title', c.title, LIMITS.title),
      message: clampLen(c.message, LIMITS.message),
      preferenceTitle: clampLen(c.preferenceTitle, LIMITS.title),
      preferenceMessage: clampLen(c.preferenceMessage, LIMITS.message),
      acceptAll: safeField('acceptAll', c.acceptAll, LIMITS.button),
      rejectAll: safeField('rejectAll', c.rejectAll, LIMITS.button),
      preferencesLabel: safeField('preferencesLabel', c.preferencesLabel, LIMITS.button),
      doNotSellLabel: c.doNotSellLabel ? clampLen(c.doNotSellLabel, 60) : c.doNotSellLabel,
      cookiePolicyLabel: clampLen(c.cookiePolicyLabel, LIMITS.policyLabel),
      saveMyPreferencesLabel: safeField('saveMyPreferencesLabel', c.saveMyPreferencesLabel, LIMITS.button),
      ccpaOptOutTitle: clampLen(c.ccpaOptOutTitle, LIMITS.title),
      ccpaOptOutMessage: clampLen(c.ccpaOptOutMessage, LIMITS.message),
    };
  }, [content]);

  useEffect(() => {
    // When the banner selection changes, reset to main preview.
    setModalView("main");
  }, [selectedBannerType]);

  useEffect(() => {
    // Preference/opt-out panels should be fully visible; avoid being "stuck" at the bottom scroll
    // from the initial banner view.
    if (!previewAreaRef.current) return;
    if (modalView === 'gdpr-preferences' || modalView === 'ccpa-optout') {
      previewAreaRef.current.scrollTop = 1;
    }
  }, [modalView]);

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
        return "w-[820px] max-w-full h-[500px]";
      case "mobile":
        return "w-[390px] max-w-full h-[680px]";
      default:
        return 'w-[1139px] max-w-full h-[444px]';
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
    <div className="w-full px-3.75">
      {/* Tabs */}
      <div className="flex items-center justify-between mb-4 mt-4.5">
        {/* Free user: show ONLY selected tab based on dropdown selection. */}
        {isFreeForced ? (
          <div className="flex items-center gap-4">
            <div
              className={`h-[30px] rounded-md px-3 flex items-center bg-[#edeefc] border-b-2 border-[#007aff]`}
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
              className={`h-[30px] rounded-md px-3 flex items-center ${
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
              className={`h-[30px] rounded-md px-3 flex items-center ${
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
              className={`h-[30px] rounded-md px-3 flex items-center bg-[#edeefc] border-b-2 border-[#007aff]`}
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
          <button
            type="button"
            disabled={saveDisabled || saveBusy}
            onClick={() => void onSaveChanges?.()}
            aria-label={saveBusy ? 'Saving…' : 'Save changes'}
            title={saveDisabled ? 'No changes to save' : saveBusy ? 'Saving…' : 'Save changes'}
            className="relative group w-9 h-9 flex items-center justify-center border border-[#e5e5e5] rounded-lg bg-[#f9f9fa] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#f9f9fa]"
          >
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {saveBusy ? 'Saving…' : 'Save changes'}
            </span>
            {saveBusy ? (
              <svg className="h-5 w-5 animate-spin text-[#007aff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
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
            )}
          </button>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={publishDisabled}
                onClick={() => {
                  void onPublishChanges?.();
                }}
                className="relative group px-4 h-9 bg-[#2ec04f] border-2 border-white outline-1 outline-[#2ec04f] text-white text-sm rounded-lg hover:bg-[#26a342] transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">Push changes live to your website</span>
                {publishBusy ? 'Publishing…' : 'Publish Changes'}
              </button>
            </div>
            {saveSuccess ? (
              <p className="text-xs text-[#15803d] max-w-[260px] text-right" role="status">
                Changes saved.
                {onDismissSaveSuccess ? (
                  <button
                    type="button"
                    className="ml-2 underline text-[#166534]"
                    onClick={() => onDismissSaveSuccess()}
                  >
                    Dismiss
                  </button>
                ) : null}
              </p>
            ) : null}
            {publishError ? (
              <div
                role="alert"
                className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 max-w-[260px]"
              >
                <svg className="mt-[1px] h-3.5 w-3.5 shrink-0 text-red-500" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5zm-.75 6a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75z" />
                </svg>
                <p className="text-xs text-red-700 leading-snug">{publishError}</p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onNext}
            className="relative group px-4 h-9 bg-[#007aff] text-white text-sm rounded-lg hover:bg-[#0066d6] transition-colors"
          >
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">Go to next step</span>
            Next
          </button>
        </div>
      </div>

      {/* Browser Preview */}
      <div
        className={`${getDeviceFrameClasses()} relative rounded-md overflow-hidden shadow-lg flex flex-col mx-auto`}
      >
        {/* Browser Header */}
        <div className="h-[24px] bg-[#d9d9d9] opacity-50 flex items-center px-2 gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>

        {/* Preview Area — initial banner layout matches embed (box / full-width banner / centered popup) */}
        <style>{`
          @keyframes cbPreviewSlideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes cbPreviewSlideDown { from { transform: translateY(-16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes cbPreviewZoomIn { from { transform: scale(0.88); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes cbPreviewFadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
        <div
          ref={previewAreaRef}
          className={`relative bg-gray-100 flex-1 flex flex-col min-h-0 ${
            modalView === 'main' ? 'overflow-hidden' : 'overflow-y-auto justify-start p-6 pb-5'
          }`}
          style={bannerTypographyStyle}
        >
          {!iabEnabled && <>{  modalView === 'main' ? (() => {
            // Banner card — shared across all layouts
            // Offset banner from floating trigger on the same side — mirrors CDN applyInitialBannerFloatingGutter.
            const isMobile = device === 'mobile';
            const floatLeft = floatingButton.enabled && floatingButton.position === 'left';
            const floatRight = floatingButton.enabled && floatingButton.position === 'right';
            const bannerOnLeft = layoutPos !== 'banner' && (layoutPos === 'bottom-center' || layoutAlign === 'bottom-left');
            const bannerOnRight = layoutPos !== 'banner' && layoutAlign === 'bottom-right';
            const mobileFullWidth = isMobile || device === 'tablet';
            // On mobile/tablet: full-width, buttons stack per row
            const initialBannerShell =
              mobileFullWidth
                ? 'flex w-full min-w-0 flex-col overflow-hidden max-h-[min(80vh,420px)]'
                : layoutPos === 'banner'
                ? 'flex w-full min-w-0 flex-col overflow-hidden max-h-[min(80vh,420px)]'
                : 'flex flex-col self-end overflow-hidden max-h-[min(80vh,420px)]';
            const bannerCard = (
              <div
                ref={initialBannerRef}
                className={`shadow-lg box-border relative rounded-md border border-[#e2e8f0] p-4 ${initialBannerShell}`}
                style={{
                  backgroundColor: colors.bannerBg,
                  borderRadius: isMobile ? 0 : `${initialLayout?.borderRadius ?? 12}px`,
                  // Width is controlled by the wrapper div; bannerCard just fills it.
                  width: '100%',
                  minWidth: (isMobile || layoutPos === 'banner') ? undefined : '280px',
                  maxWidth: '100%',
                  ...previewAnimStyle,
                }}
              >
                {content?.closeButton ? (
                  <button type="button" className="absolute top-2 right-2 text-black opacity-60 hover:opacity-100" aria-label="Close banner preview">×</button>
                ) : null}
                <div className="cb-banner-body-preview min-w-0 shrink-0 overflow-y-auto overflow-x-hidden mb-3">
                  <p style={{ ...headingStyle, overflowWrap: 'anywhere', wordBreak: 'break-word', paddingRight: content?.closeButton ? '32px' : undefined }} className="text-[15px] font-bold tracking-tight mb-2">
                    {safeContent.title || t('title')}
                  </p>
                  <p style={{ ...bodyTextStyle, overflowWrap: 'anywhere', wordBreak: 'break-word' }} className="text-[11px] tracking-tight mb-0">
                    {(safeContent.message != null && safeContent.message !== '' ? safeContent.message : null) ??
                      (selectedBannerType === 'ccpa' ? t('ccpaDescription') : t('description'))}
                    {safeContent.cookiePolicyLink && safeContent.privacyPolicyUrl ? (
                      <> {' '}<a href={normalizePrivacyPolicyUrl(safeContent.privacyPolicyUrl)} target="_blank" rel="noreferrer" className="text-[#007aff] underline">{safeContent.cookiePolicyLabel || t('privacyPolicy')}</a></>
                    ) : null}
                  </p>
                  {selectedBannerType === 'ccpa' ? (
                    <div className="mt-2">
                      {safeContent.rejectButton !== false ? (
                        <button type="button" className="p-0 border-0 bg-transparent text-[11px] text-[#007aff] underline cursor-pointer text-left" onClick={() => setModalView('ccpa-optout')}>
                          {safeContent.doNotSellLabel || t('doNotSell')}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {selectedBannerType === 'gdpr' ? (
                  <div className={`flex shrink-0 gap-2 mt-1 ${isMobile ? 'flex-col w-full' : 'flex-nowrap justify-end'}`}>
                    {safeContent.customizeButton !== false ? (
                      <button className={`px-3 py-1 border text-[11px] rounded ${isMobile ? 'w-full' : 'whitespace-nowrap shrink-0'}`} onClick={openPreferences} type="button" style={preferenceStyle}>
                        {safeContent.preferencesLabel || t('preferences')}
                      </button>
                    ) : null}
                    {safeContent.rejectButton !== false ? (
                      <button className={`px-3 py-1 border text-[11px] rounded ${isMobile ? 'w-full' : 'whitespace-nowrap shrink-0'}`} type="button" style={acceptRejectStyle}>
                        {safeContent.rejectAll || t('rejectAll')}
                      </button>
                    ) : null}
                    <button className={`px-3 py-1 border text-[11px] rounded ${isMobile ? 'w-full' : 'whitespace-nowrap shrink-0'}`} type="button" style={acceptRejectStyle}>
                      {safeContent.acceptAll || t('acceptAll') || 'Ok, Got it'}
                    </button>
                  </div>
                ) : null}
              </div>
            );

            // Full-width banner: banner renders at the bottom edge; pad the side the floating logo is on.
            if (layoutPos === 'banner') {
              const bannerPad = floatingButton.enabled
                ? floatingButton.position === 'right' ? 'pr-14' : 'pl-14'
                : '';
              return (
                <div key={bannerAnimation} className={`absolute bottom-0 left-0 right-0 ${bannerPad}`}>
                  <div className="relative z-10">
                    {bannerCard}
                  </div>
                </div>
              );
            }

            // All box/bottom-center layouts: absolute positioning to match CDN fixed behavior.
            // Float gutter offset in px (matches ml-14 / mr-14 = 56px)
            const floatGutter = 56;
            const bannerPosStyle: React.CSSProperties = (() => {
              if (mobileFullWidth) {
                return { position: 'absolute', bottom: 0, left: 0, right: 0 };
              }
              if (layoutPos === 'bottom-center') {
                return { position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)' };
              }
              if (layoutAlign === 'bottom-right') {
                const base = 32;
                const offset = (floatRight && bannerOnRight) ? floatGutter : 0;
                return { position: 'absolute', bottom: 32, right: base + offset };
              }
              // bottom-left
              const base = 32;
              const offset = (floatLeft && bannerOnLeft) ? floatGutter : 0;
              return { position: 'absolute', bottom: 32, left: base + offset };
            })();

            // Compute explicit wrapper width so absolute positioning anchors correctly.
            const bannerWidth = (() => {
              if (mobileFullWidth) return '100%';
              const isBoldHeavy = weight === 'Black' || weight === 'Extra Bold';
              const maxBtnLen = Math.max(
                (safeContent.acceptAll?.length ?? 0),
                (safeContent.rejectAll?.length ?? 0),
                (safeContent.preferencesLabel?.length ?? 0),
              );
              const isLongContent = (safeContent.message?.length ?? 0) > 200 || maxBtnLen > 12;
              const base = (isBoldHeavy && isLongContent) ? 580 : isLongContent ? 500 : 380;
              return `min(${base}px, calc(100% - 64px))`;
            })();

            return (
              <div
                key={bannerAnimation}
                style={{ ...bannerPosStyle, width: bannerWidth }}
              >
                {bannerCard}
              </div>
            );
          })() : (
            <div className="flex w-full min-w-0 shrink-0 justify-center px-1">
            {/* Reserve space so pinned floating logo never overlaps footer */}
            <div className="w-full max-w-[480px] min-h-0 pb-16">
          {modalView === "gdpr-preferences" ? (
            <div
              key={`gdpr-prefs-${bannerAnimation}`}
              className="rounded-md shadow-lg w-full min-w-0 border border-[#e2e8f0] overflow-hidden flex flex-col"
              style={{ backgroundColor: colors.bannerBg, borderRadius: `${initialLayout?.borderRadius ?? 12}px`, maxHeight: '72vh', ...previewAnimStyle }}
            >
              {/* Sticky header */}
              <div className="flex items-start justify-between gap-2 px-5 pt-5 pb-3 shrink-0">
                <p style={{ ...headingStyle, overflowWrap: 'anywhere', wordBreak: 'break-word' }} className="flex-1 min-w-0 text-[14px] tracking-tight">
                  {safeContent.preferenceTitle || t("cookiePreferences")}
                </p>
                {content?.closeButton ? (
                  <button
                    className="shrink-0 text-black opacity-70 leading-none"
                    type="button"
                    onClick={() => setModalView("main")}
                    aria-label="Close preferences"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-5 pb-2">
              <p style={{ ...bodyTextStyle, overflowWrap: 'anywhere', wordBreak: 'break-word' }} className="text-[11px] leading-relaxed mb-4">
                {stripTrailingMoreInfo(safeContent.preferenceMessage || t('managePreferences'))}
                {safeContent.cookiePolicyLink && safeContent.privacyPolicyUrl ? (
                  <>
                    {' '}
                    <a
                      href={normalizePrivacyPolicyUrl(safeContent.privacyPolicyUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#007aff] underline"
                    >
                      {safeContent.cookiePolicyLabel || t('privacyPolicy')}
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
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded border border-[#e5e7eb] bg-[#f3f4f6] text-sm font-medium text-[#111827] leading-none "
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
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded border border-[#e5e7eb] bg-[#f3f4f6] text-sm font-medium text-[#111827] leading-none cursor-pointer"
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
              </div>{/* end scrollable body */}

              {/* Sticky footer buttons */}
              <div className="flex justify-end gap-3 px-5 py-4 shrink-0 flex-wrap border-t border-[#f0f0f0]">
                {content?.rejectButton !== false ? (
                  <button
                    style={acceptRejectStyle}
                    className="px-5 py-2 min-w-[88px] border text-[11px] rounded-md hover:opacity-95 cursor-pointer max-w-[220px] truncate whitespace-nowrap"
                    type="button"
                    onClick={() => setModalView("main")}
                  >
                    {safeContent.rejectAll || t("rejectAll")}
                  </button>
                ) : null}
                <button
                  style={preferenceStyle}
                  className="px-5 py-2 min-w-[88px] border text-[11px] rounded-md hover:opacity-95 cursor-pointer max-w-[220px] truncate whitespace-nowrap"
                  type="button"
                  onClick={() => setModalView("main")}
                >
                  {safeContent.saveMyPreferencesLabel || t("save")}
                </button>
              </div>
            </div>
          ) : (
            <div
              key={`ccpa-optout-${bannerAnimation}`}
              className="rounded-md shadow-lg w-full min-w-0 p-4 border border-[#e2e8f0]"
              style={{ backgroundColor: colors.bannerBg, borderRadius: `${initialLayout?.borderRadius ?? 12}px`, ...previewAnimStyle }}
            >
              <div className="flex items-center justify-between mb-3">
                <p style={headingStyle} className="flex-1 text-[13px] tracking-tight">
                  {content?.ccpaOptOutTitle || t("optOutPreference")}
                </p>
                {content?.closeButton ? (
                  <button
                    className="text-black opacity-70 cursor-pointer"
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
                      {content?.cookiePolicyLabel || t('privacyPolicy')}
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
                  className="flex-1 px-3 py-[6px] border text-[11px] rounded cursor-pointer "
                  type="button"
                  onClick={() => setModalView("main")}
                >
                  {t("cancel")}
                </button>
                <button
                  style={preferenceStyle}
                  className="flex-1 px-3 py-[6px] border text-[11px] rounded cursor-pointer break-words"
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
        </div>
      {/* Floating logo pinned to the preview frame corner — mirrors CDN position:fixed; bottom:16px; left/right:16px */}
      {floatingButton.enabled ? (
        <div
          className={`absolute bottom-4 z-20 pointer-events-none ${
            floatingButton.position === 'right' ? 'right-4' : 'left-4'
          }`}
        >
          <button
            type="button"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#e2e8f0] bg-white p-0 cursor-pointer shadow-md hover:opacity-90 focus:outline-none"
            onClick={openPreferences}
            aria-label={safeContent.preferencesLabel || t('preferences')}
          >
            <Image
              src={floatingBtnLogo}
              alt=""
              width={28}
              height={28}
              draggable={false}
              className="pointer-events-none h-auto w-auto max-h-[1.65rem] max-w-[1.65rem] object-contain object-center select-none drop-shadow-md"
              sizes="28px"
            />
          </button>
        </div>
      ) : null}
      </div>

      {/* Device Selector */}
      <div className="flex gap-6 mt-6 mb-4 items-center">
        <Tooltip text="Preview the banner on a phone screen.">
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setDevice("mobile")}
          >
            <div
              className="w-[10px] h-[17px] border-2 rounded-sm"
              style={{ borderColor: device === "mobile" ? "#007aff" : "#4B5563" }}
            />
            <p className="text-base" style={{ color: device === "mobile" ? "#007aff" : "#6B7280" }}>
              Phone
            </p>
          </button>
        </Tooltip>
        <Tooltip text="Preview the banner on a tablet screen.">
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setDevice("tablet")}
          >
            <div
              className="w-[16px] h-[17px] border-2 rounded-sm"
              style={{ borderColor: device === "tablet" ? "#007aff" : "#4B5563" }}
            />
            <p className="text-base cursor-pointer" style={{ color: device === "tablet" ? "#007aff" : "#6B7280" }}>
              Tablet
            </p>
          </button>
        </Tooltip>
        <Tooltip text="Preview the banner on a desktop screen.">
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setDevice("desktop")}
          >
            <div
              className="w-[24px] h-[17px] border-2 rounded-sm"
              style={{ borderColor: device === "desktop" ? "#007aff" : "#4B5563" }}
            />
            <p className="text-base" style={{ color: device === "desktop" ? "#007aff" : "#6B7280" }}>
              Desktop
            </p>
          </button>
        </Tooltip>
      </div>
    </div>

    {publishSuccess ? (
      <div
        className="fixed inset-0 z-[999999999999999999999] flex items-center justify-center bg-black/40 p-4"
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
            
            
          </p>
          <button
            type="button"
            className="mt-6 w-full rounded-lg bg-[#2ec04f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#26a342] transition-colors cursor-pointer"
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
