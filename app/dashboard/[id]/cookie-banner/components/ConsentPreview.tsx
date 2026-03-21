'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { getBannerLanguage, getTranslation } from './translations';
import floatingBtnLogo from '@/public/asset/logo.webp';

/** Strip legacy "More info." suffix from saved preference copy */
function stripTrailingMoreInfo(text: string): string {
  return (text || '').replace(/\s*More info\.?\s*$/i, '').trim();
}

export default function ConsentPreview({
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
  bothModeBannerType,
  onBothModeBannerTypeChange,
}: {
  previewBannerType?: 'gdpr' | 'ccpa';
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

  const isFreeForced = Boolean(previewBannerType);

  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // For free-plan selection, dropdown already forces previewBannerType.
  // For "both" (non-free), allow switching using the preview tabs.
  const [activeBothType, setActiveBothType] = useState<'gdpr' | 'ccpa'>('gdpr');

  const selectedBannerType: 'gdpr' | 'ccpa' = useMemo(() => {
    if (previewBannerType) return previewBannerType;
    if (consentType === 'ccpa') return 'ccpa';
    if (consentType === 'both') {
      if (bothModeBannerType != null) return bothModeBannerType;
      return activeBothType;
    }
    return 'gdpr';
  }, [previewBannerType, consentType, bothModeBannerType, activeBothType]);

  const lang = useMemo(() => getBannerLanguage({ autoDetectLanguage: true }), []);
  const t = useMemo(() => (key: string) => getTranslation(lang, key), [lang]);

  type ModalView = 'main' | 'gdpr-preferences' | 'ccpa-optout';
  const [modalView, setModalView] = useState<ModalView>('main');

  /** GDPR preference panel: which accordion row is expanded (+ / −) */
  const [prefExpanded, setPrefExpanded] = useState<string | null>(null);
  const [prefMarketing, setPrefMarketing] = useState(true);
  const [prefAnalytics, setPrefAnalytics] = useState(false);
  const [prefUserCategory, setPrefUserCategory] = useState(false);

  useEffect(() => {
    // When the banner selection changes, reset to main preview.
    setModalView('main');
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
    setModalView(selectedBannerType === 'gdpr' ? 'gdpr-preferences' : 'ccpa-optout');
  };

  const getDeviceFrameClasses = () => {
    switch (device) {
      case 'tablet':
        return 'w-[768px] max-w-full h-[500px]';
      case 'mobile':
        return 'w-[390px] max-w-full h-[680px]';
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
              aria-label={selectedBannerType === 'gdpr' ? 'GDPR tab' : 'CCPA tab'}
            >
              <p className="font-medium text-base text-[#007aff]">
                {selectedBannerType === 'gdpr' ? 'GDPR' : 'CCPA'}
              </p>
            </div>
          </div>
        ) : consentType === 'both' ? (
          // Non-free: allow switching between GDPR and CCPA inside preview.
          <div className="flex items-center gap-4">
            <button
              type="button"
              className={`h-[30px] rounded-t-md px-3 flex items-center ${
                selectedBannerType === 'gdpr'
                  ? 'bg-[#edeefc] border-b-2 border-[#007aff]'
                  : 'text-[#007aff]'
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
                selectedBannerType === 'ccpa'
                  ? 'bg-[#edeefc] border-b-2 border-[#007aff]'
                  : 'text-[#111827]'
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
              aria-label={selectedBannerType === 'gdpr' ? 'GDPR tab' : 'CCPA tab'}
            >
              <p className="font-medium text-base text-[#007aff]">
                {selectedBannerType === 'gdpr' ? 'GDPR' : 'CCPA'}
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

          <button className="px-4 h-9 bg-[#007aff] text-white text-sm rounded-lg hover:bg-[#0066d6] transition-colors">
            Next
          </button>
        </div>
      </div>

      {/* Browser Preview */}
      <div className={`${getDeviceFrameClasses()} rounded-md overflow-hidden shadow-lg flex flex-col mx-auto`}>
        {/* Browser Header */}
        <div className="h-[24px] bg-[#d9d9d9] opacity-50 flex items-center px-2 gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>

        {/* Preview Area — initial banner bottom-left; preference / opt-out panels centered */}
        <div
          className={`relative bg-gray-100 flex-1 flex flex-col min-h-0 overflow-y-auto p-6 pb-5 ${
            modalView === 'main' ? 'justify-end' : 'justify-center'
          }`}
        >
          {modalView === 'main' ? (
            <div className="w-full max-w-[360px] shrink-0 self-start">
            <div className="bg-white rounded-md shadow-lg w-full p-4 relative">
              {content?.closeButton ? (
                <button
                  type="button"
                  className="absolute top-2 right-2 text-black opacity-60 hover:opacity-100"
                  aria-label="Close banner preview"
                >
                  ×
                </button>
              ) : null}
              <p className="font-semibold text-[13px] text-black opacity-80 tracking-tight mb-2">
                {content?.title || t('title')}
              </p>

              <p className="text-[11px] text-black opacity-80 tracking-tight mb-2">
                {(content?.message != null && content.message !== ''
                  ? content.message
                  : null) ??
                  (selectedBannerType === 'ccpa' ? t('ccpaDescription') : t('description'))}
                {content?.cookiePolicyLink && content?.privacyPolicyUrl ? (
                  <>
                    {' '}
                    <a
                      href={content.privacyPolicyUrl}
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
                <div className="flex gap-2">
                  {content?.customizeButton !== false ? (
                    <button
                      className="px-3 py-[2px] border border-[#007aff] text-[10px] text-[#007aff]"
                      onClick={openPreferences}
                      type="button"
                    >
                      {content?.preferencesLabel || t('preferences')}
                    </button>
                  ) : null}

                  {content?.rejectButton !== false ? (
                    <button className="px-3 py-[2px] bg-[#007aff] text-[10px] text-white" type="button">
                      {content?.rejectAll || t('rejectAll')}
                    </button>
                  ) : null}

                  <button className="px-3 py-[2px] bg-[#007aff] text-[10px] text-white" type="button">
                    {content?.acceptAll || t('acceptAll') || 'Ok, Got it'}
                  </button>
                </div>
              ) : null}
            </div>
            </div>
          ) : (
            <div className="flex w-full shrink-0 justify-center px-1">
            <div className="w-full max-w-[360px]">
          {modalView === 'gdpr-preferences' ? (
            <div className="bg-white rounded-md shadow-lg w-full p-5 border border-[#e2e8f0]">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-[14px] text-[#0f172a] tracking-tight">
                  {content?.preferenceTitle || t('cookiePreferences')}
                </p>
                {content?.closeButton ? (
                  <button
                    className="text-black opacity-70"
                    type="button"
                    onClick={() => setModalView('main')}
                    aria-label="Close preferences"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              <p className="text-[11px] text-[#334155] leading-relaxed mb-4">
                {stripTrailingMoreInfo(content?.preferenceMessage || t('managePreferences'))}
                {content?.cookiePolicyLink && content?.privacyPolicyUrl ? (
                  <>
                    {' '}
                    <a
                      href={content.privacyPolicyUrl}
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

              <div className="rounded-lg border border-[#e5e7eb] overflow-hidden mb-1 divide-y divide-[#e5e7eb] bg-white">
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
                    <span className="flex-1 text-[11px] font-semibold text-[#0f172a]">
                      {t('strictlyNecessary')}
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-[#374151]">
                      {t('alwaysActive')}
                    </span>
                  </div>
                  {prefExpanded === 'necessary' ? (
                    <p className="px-3 pb-3 pl-11 text-[10px] leading-relaxed text-[#64748b]">
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
                    <span className="flex-1 text-[11px] font-semibold text-[#0f172a]">
                      {t('marketing')}
                    </span>
                    {toggleSwitch(prefMarketing, () => setPrefMarketing((v) => !v))}
                  </div>
                  {prefExpanded === 'marketing' ? (
                    <p className="px-3 pb-3 pl-11 text-[10px] leading-relaxed text-[#64748b]">
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
                    <span className="flex-1 text-[11px] font-semibold text-[#0f172a]">
                      {t('analytics')}
                    </span>
                    {toggleSwitch(prefAnalytics, () => setPrefAnalytics((v) => !v))}
                  </div>
                  {prefExpanded === 'analytics' ? (
                    <p className="px-3 pb-3 pl-11 text-[10px] leading-relaxed text-[#64748b]">
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
                    <span className="flex-1 text-[11px] font-semibold text-[#0f172a]">
                      {t('preferences')}
                    </span>
                    {toggleSwitch(prefUserCategory, () => setPrefUserCategory((v) => !v))}
                  </div>
                  {prefExpanded === 'preferences' ? (
                    <p className="px-3 pb-3 pl-11 text-[10px] leading-relaxed text-[#64748b]">
                      {t('preferencesDescription')}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 flex-wrap">
                <button
                  className="px-5 py-2 min-w-[88px] border border-[#e2e8f0] bg-white text-[11px] font-semibold text-[#334155] rounded-md hover:bg-gray-50"
                  type="button"
                  onClick={() => setModalView('main')}
                >
                  {content?.rejectAll || t('rejectAll')}
                </button>
                <button
                  className="px-5 py-2 min-w-[88px] bg-[#007aff] text-[11px] font-semibold text-white rounded-md border border-[#007aff] hover:opacity-95"
                  type="button"
                  onClick={() => setModalView('main')}
                >
                  {t('save')}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-md shadow-lg w-full p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-[13px] text-black opacity-80 tracking-tight">
                  {content?.ccpaOptOutTitle || t('optOutPreference')}
                </p>
                {content?.closeButton ? (
                  <button
                    className="text-black opacity-70"
                    type="button"
                    onClick={() => setModalView('main')}
                    aria-label="Close opt-out"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              <p className="text-[11px] text-black opacity-80 tracking-tight mb-3 leading-relaxed">
                {stripTrailingMoreInfo(
                  content?.ccpaOptOutMessage || t('ccpaOptOutPreferenceIntro')
                )}
                {content?.cookiePolicyLink && content?.privacyPolicyUrl ? (
                  <>
                    {' '}
                    <a
                      href={content.privacyPolicyUrl}
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
                <span className="text-black opacity-90 leading-snug flex-1">
                  {content?.doNotSellLabel || t('doNotSell')}
                </span>
              </label>

              <div className="flex gap-2">
                <button
                  className="flex-1 px-3 py-[6px] border border-[#e5e5e5] text-[11px] text-[#111827] rounded"
                  type="button"
                  onClick={() => setModalView('main')}
                >
                  {t('cancel')}
                </button>
                <button
                  className="flex-1 px-3 py-[6px] bg-[#007aff] text-[11px] text-white rounded"
                  type="button"
                  onClick={() => setModalView('main')}
                >
                  {content?.saveMyPreferencesLabel || t('saveMyPreferences')}
                </button>
              </div>
            </div>
          )}
            </div>
            </div>
          )}

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
          onClick={() => setDevice('mobile')}
        >
          <div
            className="w-[10px] h-[17px] border-2 rounded-sm"
            style={{
              borderColor: device === 'mobile' ? '#007aff' : '#4B5563',
            }}
          />
          <p
            className="text-base"
            style={{ color: device === 'mobile' ? '#007aff' : '#6B7280' }}
          >
            Phone
          </p>
        </button>
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => setDevice('tablet')}
        >
          <div
            className="w-[16px] h-[17px] border-2 rounded-sm"
            style={{
              borderColor: device === 'tablet' ? '#007aff' : '#4B5563',
            }}
          />
          <p
            className="text-base"
            style={{ color: device === 'tablet' ? '#007aff' : '#6B7280' }}
          >
            Tab
          </p>
        </button>
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => setDevice('desktop')}
        >
          <div
            className="w-[24px] h-[17px] border-2 rounded-sm"
            style={{
              borderColor: device === 'desktop' ? '#007aff' : '#4B5563',
            }}
          />
          <p
            className="text-base"
            style={{ color: device === 'desktop' ? '#007aff' : '#6B7280' }}
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