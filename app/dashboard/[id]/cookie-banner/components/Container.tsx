"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./SideBar";
import ConsentPreview from "./ConsentPreview";
import BannerControl from "./BannerControl";
import ColorPickerPanel from "./ColorPickerPanel";
import FontPickerPanel from "./FontPickerPanel";
import { CookieNoticeAccordion2 } from "./CookieNoticeAccordion2";
import PreferenceBannerAccordion from "./PreferenceBannerAccordion";
import { useAppContext } from "@/app/context/AppProvider";

// import CookieListAccordion from "./CookieListAccordion";
import {
  FloatingButtonSettings,
  type FloatingButtonState,
} from "./FloatingButtonSettings";
import { RegulationSelector } from "./RegulationSelector";
import { BannerLinkSection } from "./BannerLinkSection";
import { getBannerCustomization, saveBannerCustomization, updateSiteBannerSettings } from "@/lib/client-api";
import {
  DEFAULT_APPEARANCE,
  type AppearanceState,
  appearanceFromCustomization,
  pxBorderRadiusToRem,
  weightLabelToNumeric,
} from "./bannerAppearance";
import { TRANSLATIONS } from "./translations";
import { useRouter } from "next/navigation";
import { useDashboardSession } from "../../../DashboardSessionProvider";
import InstallConsentModal from "../../../components/InstallConsentModal";
import { resolveInstallScriptUrl } from "@/lib/consentbit-script";

/** Snapshot of General-tab regulation dropdown (banner_type + region_mode) for Publish dirty state. */
type RegulationSnapshot = {
  bannerType: "gdpr" | "ccpa";
  regionMode: "gdpr" | "ccpa" | "both";
};

export default function page({ siteId }: { siteId: string }) {
  const [active, setActive] = useState("General");
  const router = useRouter();
  const [savingContent, setSavingContent] = useState(false);
  /** Which action triggered the in-flight persist (for button labels). */
  const [persistKind, setPersistKind] = useState<"save" | "publish" | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const dismissPublishSuccess = useCallback(() => setPublishSuccess(false), []);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const dismissSaveSuccess = useCallback(() => setSaveSuccess(false), []);

  /** Bump after successful publish so the preview remounts with latest `content` (avoids stale UI). */
  const [previewRevision, setPreviewRevision] = useState(0);
  const [openAccordionKey, setOpenAccordionKey] = useState<
    "cookieNotice" | "preferenceBanner" | null
  >("cookieNotice");
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [contentSettings, setContentSettings] = useState({
    title: "We value your privacy",
    acceptAll: "Accept",
    preferencesLabel: "Preference",
    preferenceTitle: "Cookie Preferences",
    preferenceMessage:
      "By clicking, you agree to store cookies on your device to enhance navigation, analyze usage, and support marketing.",
    closeButton: true,
    rejectButton: true,
    customizeButton: true,
    cookiePolicyLink: true,
    cookiePolicyLabel: "Privacy Policy",
    privacyPolicyUrl: "",
    gdpr: {
      message:
        "We use cookies to provide you with the best possible experience. They also allow us to analyze user behavior in order to constantly improve the website for you.",
      rejectAll: "Reject",
      saveMyPreferencesLabel: TRANSLATIONS.en.saveMyPreferences,
    },
    ccpa: {
      message:
        "We use cookies to provide you with the best possible experience. They also allow us to analyze user behavior in order to constantly improve the website for you.",
      doNotSellLabel: "Do Not Share My Personal Information",
      optOutTitle: TRANSLATIONS.en.optOutPreference,
      optOutMessage: TRANSLATIONS.en.ccpaOptOutPreferenceIntro,
      saveMyPreferencesLabel: TRANSLATIONS.en.saveMyPreferences,
    },
  });
  const [customizationBase, setCustomizationBase] = useState<any>(null);
  const [lastSavedContentSettings, setLastSavedContentSettings] = useState<any>(null);
  const [lastSavedFloatingButton, setLastSavedFloatingButton] =
    useState<FloatingButtonState | null>(null);
  /** Draft + baseline for Layout / Colors / Type — published with content in one action. */
  const [appearance, setAppearance] = useState<AppearanceState>(DEFAULT_APPEARANCE);
  const [lastSavedAppearance, setLastSavedAppearance] = useState<AppearanceState | null>(null);
  const {
    setColors: setPreviewColors,
    setFontFamily: setPreviewFontFamily,
    setWeight: setPreviewWeight,
    setAlignment: setPreviewAlignment,
    setBannerLayout: setPreviewBannerLayout,
  } = useAppContext();

  /** Single source of truth is `appearance`; mirror into preview context so ConsentPreview matches publish. */
  useEffect(() => {
    setPreviewColors({ ...appearance.colors });
    setPreviewFontFamily(appearance.type.font);
    setPreviewWeight(appearance.type.weight);
    setPreviewAlignment(appearance.type.alignment);
    setPreviewBannerLayout({
      position: appearance.layout.position,
      alignment: appearance.layout.alignment,
      borderRadius: appearance.layout.borderRadius,
    });
  }, [
    appearance,
    setPreviewColors,
    setPreviewFontFamily,
    setPreviewWeight,
    setPreviewAlignment,
    setPreviewBannerLayout,
  ]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { loading, authenticated, sites, effectivePlanId, activeOrganizationId, updateSiteInState, refresh } =
    useDashboardSession();
    console.log(effectivePlanId,"activeOrganizationId from container")
  const site = sites.find((s: any) => String(s?.id) === String(siteId)) || null;
  const currentScriptUrl = useMemo(() => {
    if (!site?.id) return "";
    return resolveInstallScriptUrl(site?.scriptUrl, site.id, site?.cdnScriptId);
  }, [site]);

  const siteRef = useRef(site);
  siteRef.current = site;

  const isFreePlan = useMemo(() => {
    const v = String(effectivePlanId ?? "").toLowerCase();
    return v === "free" || v.startsWith("free");
  }, [effectivePlanId]);

  const consentType = useMemo<'gdpr' | 'ccpa' | 'both'>(() => {
    const bannerType = site?.banner_type || 'gdpr';
    const regionMode = site?.region_mode || 'gdpr';
    if (regionMode === 'both') return 'both';
    if (bannerType === 'ccpa' || regionMode === 'ccpa') return 'ccpa';
    return 'gdpr';
  }, [site]);

  // Free-plan preview should follow the dropdown selection immediately.
  // (Sometimes site state updates lag, so relying only on `site` can make preview look stale.)
  const [freePreviewBannerType, setFreePreviewBannerType] = useState<'gdpr' | 'ccpa'>('gdpr');
  // Sync freePreviewBannerType from site data once it loads (avoids SSR/client hydration mismatch)
  useEffect(() => {
    if (site?.banner_type === 'ccpa' || site?.region_mode === 'ccpa') {
      setFreePreviewBannerType('ccpa');
    }
  }, [site?.banner_type, site?.region_mode]);

  // For the free plan we always force the preview to match the single selected banner.
  const previewBannerType = useMemo<'gdpr' | 'ccpa' | undefined>(() => {
    if (!isFreePlan) return undefined;
    return freePreviewBannerType;
  }, [isFreePlan, freePreviewBannerType]);

  /** When site is GDPR + CCPA, pick which framework's copy to edit in Content (General sets the template). */
  const [bothContentFocus, setBothContentFocus] = useState<'gdpr' | 'ccpa'>('gdpr');
  /** Last GDPR/CCPA focus that was included in a successful Publish (for "both" template). */
  const [lastPublishedBothFocus, setLastPublishedBothFocus] = useState<'gdpr' | 'ccpa'>('gdpr');
  /** Last regulation template (dropdown) included in a successful Publish / initial load baseline. */
  const [lastPublishedRegulation, setLastPublishedRegulation] =
    useState<RegulationSnapshot | null>(null);
  const bothContentFocusRef = useRef(bothContentFocus);
  bothContentFocusRef.current = bothContentFocus;

  // Which banner content should the editor show right now — always aligned with General / regulation:
  // - Free: same as regulation dropdown (GDPR or CCPA only).
  // - Paid, GDPR-only or CCPA-only: that framework only.
  // - Paid, GDPR + CCPA: user picks GDPR vs CCPA copy via bothContentFocus.
  const activeContentBannerType = useMemo<'gdpr' | 'ccpa'>(() => {
    if (isFreePlan && previewBannerType) return previewBannerType;
    if (consentType === 'both') return bothContentFocus;
    return consentType === 'ccpa' ? 'ccpa' : 'gdpr';
  }, [isFreePlan, previewBannerType, consentType, bothContentFocus]);

  /** Current General-tab regulation selection (free plan uses preview state so Publish activates before API catches up). */
  const currentRegulationSnapshot = useMemo((): RegulationSnapshot | null => {
    if (!site) return null;
    if (isFreePlan) {
      return {
        bannerType: freePreviewBannerType,
        regionMode: freePreviewBannerType === "ccpa" ? "ccpa" : "gdpr",
      };
    }
    return {
      bannerType: site.banner_type === "ccpa" ? "ccpa" : "gdpr",
      regionMode: (site.region_mode || "gdpr") as "gdpr" | "ccpa" | "both",
    };
  }, [site, isFreePlan, freePreviewBannerType]);

  const [floatingButton, setFloatingButton] = useState<FloatingButtonState>({
    enabled: true,
    position: 'left',
  });

  const contentForPreview = useMemo(() => {
    if (activeContentBannerType === 'ccpa') {
      return {
        title: contentSettings.title,
        message: contentSettings.ccpa.message,
        acceptAll: contentSettings.acceptAll,
        doNotSellLabel: contentSettings.ccpa.doNotSellLabel,
        preferencesLabel: contentSettings.preferencesLabel,
        preferenceTitle: contentSettings.preferenceTitle,
        preferenceMessage: contentSettings.preferenceMessage,
        ccpaOptOutTitle: contentSettings.ccpa.optOutTitle,
        ccpaOptOutMessage: contentSettings.ccpa.optOutMessage,
        saveMyPreferencesLabel: contentSettings.ccpa.saveMyPreferencesLabel,
        closeButton: contentSettings.closeButton,
        rejectButton: contentSettings.rejectButton,
        customizeButton: contentSettings.customizeButton,
        cookiePolicyLink: contentSettings.cookiePolicyLink,
        privacyPolicyUrl: contentSettings.privacyPolicyUrl,
      };
    }

    return {
      title: contentSettings.title,
      message: contentSettings.gdpr.message,
      acceptAll: contentSettings.acceptAll,
      rejectAll: contentSettings.gdpr.rejectAll,
      preferencesLabel: contentSettings.preferencesLabel,
      preferenceTitle: contentSettings.preferenceTitle,
      preferenceMessage: contentSettings.preferenceMessage,
      closeButton: contentSettings.closeButton,
      rejectButton: contentSettings.rejectButton,
      customizeButton: contentSettings.customizeButton,
      cookiePolicyLink: contentSettings.cookiePolicyLink,
      privacyPolicyUrl: contentSettings.privacyPolicyUrl,
    };
  }, [activeContentBannerType, contentSettings]);

  // IMPORTANT: do not continuously sync this from `site` after mount.
  // Otherwise, there are race/timing cases where `site` lags behind the dropdown selection
  // and the preview reverts back to the old banner.

  useEffect(() => {
    if (loading) return;
    if (!authenticated) router.replace("/login");
  }, [authenticated, loading, router]);

  const handleRegulationChange = async (next: {
    bannerType: 'gdpr' | 'ccpa';
    regionMode: 'gdpr' | 'ccpa' | 'both';
  }) => {
    if (!site) return;
    if (!activeOrganizationId) {
      console.error("[cookie-banner] activeOrganizationId missing; cannot update site banner settings");
      return;
    }

    // Update local state immediately — preview is driven by local state, not backend.
    setFreePreviewBannerType(next.bannerType);
    updateSiteInState({
      id: String(site.id),
      banner_type: next.bannerType,
      region_mode: next.regionMode,
    });

    iabEnabled && setIabEnabled(false);
    // Persist to backend in the background; UI doesn't wait or revert on failure.
    updateSiteBannerSettings({
      name: String(site.name || site.domain || ''),
      domain: String(site.domain || ''),
      organizationId: String(activeOrganizationId),
      bannerType: next.bannerType,
      regionMode: next.regionMode,
    }).catch((e) => {
      console.warn("[cookie-banner] regulation save failed (will retry on next save):", e);
    });
  };

  useEffect(() => {
    if (!site?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getBannerCustomization(String(site.id));
        const customization = res?.customization || null;
        if (cancelled) return;
        setCustomizationBase(customization);
        const en = customization?.translations?.en || {};
        const nextSettings = {
          title: en.title || "We value your privacy",
          acceptAll: en.acceptAll || "Accept",
          preferencesLabel: en.customise || "Preference",
          preferenceTitle: en.cookiePreferences || "Cookie Preferences",
          preferenceMessage:
            en.managePreferences ||
            "By clicking, you agree to store cookies on your device to enhance navigation, analyze usage, and support marketing.",
          closeButton:
            typeof en.closeButtonEnabled === "boolean"
              ? en.closeButtonEnabled
              : String(en.closeButtonEnabled ?? "1") !== "0",
          rejectButton:
            typeof en.rejectButtonEnabled === "boolean"
              ? en.rejectButtonEnabled
              : String(en.rejectButtonEnabled ?? "1") !== "0",
          customizeButton:
            typeof en.customizeButtonEnabled === "boolean"
              ? en.customizeButtonEnabled
              : String(en.customizeButtonEnabled ?? "1") !== "0",
          cookiePolicyLink:
            typeof en.cookiePolicyLinkEnabled === "boolean"
              ? en.cookiePolicyLinkEnabled
              : String(en.cookiePolicyLinkEnabled ?? "1") !== "0",
          cookiePolicyLabel: en.privacyPolicy || "Privacy Policy",
          privacyPolicyUrl: customization?.privacyPolicyUrl || "",
          gdpr: {
            message:
              en.description ||
              "We use cookies to provide you with the best possible experience. They also allow us to analyze user behavior in order to constantly improve the website for you.",
            rejectAll: en.rejectAll || "Reject",
            saveMyPreferencesLabel: en.saveMyPreferences || TRANSLATIONS.en.saveMyPreferences,
          },
          ccpa: {
            message:
              en.ccpaDescription ||
              en.description ||
              "We use cookies to provide you with the best possible experience. They also allow us to analyze user behavior in order to constantly improve the website for you.",
            doNotSellLabel:
              en.doNotSell || "Do Not Share My Personal Information",
            optOutTitle:
              en.optOutPreference || TRANSLATIONS.en.optOutPreference,
            optOutMessage:
              en.ccpaOptOutPreferenceIntro ||
              TRANSLATIONS.en.ccpaOptOutPreferenceIntro,
            saveMyPreferencesLabel:
              en.saveMyPreferences || TRANSLATIONS.en.saveMyPreferences,
          },
        };
        setContentSettings(nextSettings);
        setLastSavedContentSettings(nextSettings);
        setLastPublishedBothFocus(bothContentFocusRef.current);

        const fbEnabled =
          typeof en.floatingButtonEnabled === "boolean"
            ? en.floatingButtonEnabled
            : String(en.floatingButtonEnabled ?? "1") !== "0";
        const fbPos =
          en.floatingButtonPosition === "right" ? "right" : "left";
        const fbState: FloatingButtonState = {
          enabled: fbEnabled,
          position: fbPos,
        };
        setFloatingButton(fbState);
        setLastSavedFloatingButton(fbState);

        const app = appearanceFromCustomization(customization);
        setAppearance(app);
        setLastSavedAppearance(app);

        const s = siteRef.current;
        if (s) {
          setLastPublishedRegulation({
            bannerType: s.banner_type === "ccpa" ? "ccpa" : "gdpr",
            regionMode: (s.region_mode || "gdpr") as "gdpr" | "ccpa" | "both",
          });
        }
      } catch (e) {
        // Keep defaults if customization does not exist yet.
        const app = appearanceFromCustomization(null);
        setAppearance(app);
        setLastSavedAppearance(app);
        setLastSavedContentSettings({
          title: "We value your privacy",
          acceptAll: "Accept",
          preferencesLabel: "Preference",
          preferenceTitle: "Cookie Preferences",
          preferenceMessage:
            "By clicking, you agree to store cookies on your device to enhance navigation, analyze usage, and support marketing.",
          closeButton: true,
          rejectButton: true,
          customizeButton: true,
          cookiePolicyLink: true,
          cookiePolicyLabel: "Privacy Policy",
          privacyPolicyUrl: "",
          gdpr: {
            message:
              "We use cookies to provide you with the best possible experience. They also allow us to analyze user behavior in order to constantly improve the website for you.",
            rejectAll: "Reject",
            saveMyPreferencesLabel: TRANSLATIONS.en.saveMyPreferences,
          },
          ccpa: {
            message:
              "We use cookies to provide you with the best possible experience. They also allow us to analyze user behavior in order to constantly improve the website for you.",
            doNotSellLabel: "Do Not Share My Personal Information",
            optOutTitle: TRANSLATIONS.en.optOutPreference,
            optOutMessage: TRANSLATIONS.en.ccpaOptOutPreferenceIntro,
            saveMyPreferencesLabel: TRANSLATIONS.en.saveMyPreferences,
          },
        });
        const fbDefault: FloatingButtonState = {
          enabled: true,
          position: "left",
        };
        setFloatingButton(fbDefault);
        setLastSavedFloatingButton(fbDefault);
        setLastPublishedBothFocus(bothContentFocusRef.current);
        const s = siteRef.current;
        if (s) {
          setLastPublishedRegulation({
            bannerType: s.banner_type === "ccpa" ? "ccpa" : "gdpr",
            regionMode: (s.region_mode || "gdpr") as "gdpr" | "ccpa" | "both",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [site?.id]);

  useEffect(() => {
    if (!publishSuccess) return;
    const id = window.setTimeout(() => setPublishSuccess(false), 8000);
    return () => window.clearTimeout(id);
  }, [publishSuccess]);

  const contentDirty = useMemo(
    () => {
      if (!lastSavedContentSettings) return false;
      return JSON.stringify(contentSettings) !== JSON.stringify(lastSavedContentSettings);
    },
    [contentSettings, lastSavedContentSettings],
  );

  const floatingDirty = useMemo(() => {
    if (!lastSavedFloatingButton) return false;
    return JSON.stringify(floatingButton) !== JSON.stringify(lastSavedFloatingButton);
  }, [floatingButton, lastSavedFloatingButton]);

  const appearanceDirty = useMemo(() => {
    if (!lastSavedAppearance) return false;
    return JSON.stringify(appearance) !== JSON.stringify(lastSavedAppearance);
  }, [appearance, lastSavedAppearance]);

  /** GDPR+CCPA: switching preview/content tab should allow Publish (CDN gets full translations; user may publish to refresh). */
  const bothFocusDirty = useMemo(
    () =>
      consentType === "both" && bothContentFocus !== lastPublishedBothFocus,
    [consentType, bothContentFocus, lastPublishedBothFocus],
  );

  /** General tab: user picked a different banner template than what was last published. */
  const regulationDirty = useMemo(() => {
    if (!lastPublishedRegulation || !currentRegulationSnapshot) return false;
    return (
      currentRegulationSnapshot.bannerType !== lastPublishedRegulation.bannerType ||
      currentRegulationSnapshot.regionMode !== lastPublishedRegulation.regionMode
    );
  }, [currentRegulationSnapshot, lastPublishedRegulation]);

  useEffect(() => {
    if (
      publishSuccess &&
      (contentDirty || floatingDirty || appearanceDirty || bothFocusDirty || regulationDirty)
    ) {
      setPublishSuccess(false);
    }
  }, [
    contentDirty,
    floatingDirty,
    appearanceDirty,
    bothFocusDirty,
    regulationDirty,
    publishSuccess,
  ]);

  useEffect(() => {
    if (
      saveSuccess &&
      (contentDirty || floatingDirty || appearanceDirty || bothFocusDirty || regulationDirty)
    ) {
      setSaveSuccess(false);
    }
  }, [
    contentDirty,
    floatingDirty,
    appearanceDirty,
    bothFocusDirty,
    regulationDirty,
    saveSuccess,
  ]);

  const hasUnsavedChanges =
    contentDirty ||
    floatingDirty ||
    appearanceDirty ||
    bothFocusDirty ||
    regulationDirty;

  const applyPersistSuccessState = useCallback(() => {
    setLastSavedContentSettings(contentSettings);
    setLastSavedFloatingButton(floatingButton);
    setLastSavedAppearance(appearance);
    setLastPublishedBothFocus(bothContentFocus);
    if (currentRegulationSnapshot) {
      setLastPublishedRegulation(currentRegulationSnapshot);
    }
    setCustomizationBase((prev: any) => ({
      ...(prev || {}),
      position: appearance.layout.alignment,
      backgroundColor: appearance.colors.bannerBg,
      textColor: appearance.colors.textColor,
      headingColor: appearance.colors.headingColor,
      acceptButtonBg: appearance.colors.buttonColor,
      acceptButtonText: appearance.colors.buttonTextColor,
      customiseButtonBg: appearance.colors.preferencesButtonBg,
      customiseButtonText: appearance.colors.preferencesButtonText,
      saveButtonBg: appearance.colors.savePreferencesButtonBg,
      saveButtonText: appearance.colors.savePreferencesButtonText,
      bannerBorderRadius: pxBorderRadiusToRem(appearance.layout.borderRadius),
      privacyPolicyUrl: contentSettings.privacyPolicyUrl || "",
      translations: {
        ...((prev && prev.translations) || {}),
        en: {
          ...(((prev && prev.translations && prev.translations.en) || {})),
          title: contentSettings.title,
          acceptAll: contentSettings.acceptAll,
          description: contentSettings.gdpr.message,
          ccpaDescription: contentSettings.ccpa.message,
          rejectAll: contentSettings.gdpr.rejectAll,
          customise: contentSettings.preferencesLabel,
          doNotSell: contentSettings.ccpa.doNotSellLabel,
          cookiePreferences: contentSettings.preferenceTitle,
          managePreferences: contentSettings.preferenceMessage,
          optOutPreference: contentSettings.ccpa.optOutTitle,
          ccpaOptOutPreferenceIntro: contentSettings.ccpa.optOutMessage,
          saveMyPreferences: contentSettings.gdpr.saveMyPreferencesLabel || contentSettings.ccpa.saveMyPreferencesLabel,
          privacyPolicy: contentSettings.cookiePolicyLabel || "Privacy Policy",
          closeButtonEnabled: contentSettings.closeButton ? "1" : "0",
          rejectButtonEnabled: contentSettings.rejectButton ? "1" : "0",
          customizeButtonEnabled: contentSettings.customizeButton ? "1" : "0",
          cookiePolicyLinkEnabled: contentSettings.cookiePolicyLink ? "1" : "0",
          floatingButtonEnabled: floatingButton.enabled ? "1" : "0",
          floatingButtonPosition: floatingButton.position,
          bannerFontFamily: appearance.type.font,
          bannerFontWeight: weightLabelToNumeric(appearance.type.weight),
          bannerTextAlign: appearance.type.alignment,
          bannerLayoutVisual: appearance.layout.position,
          bannerEntranceAnimation: appearance.layout.animation,
        },
      },
    }));
    setPreviewRevision((r) => r + 1);
    void refresh({ showLoading: false });
  }, [
    appearance,
    bothContentFocus,
    contentSettings,
    currentRegulationSnapshot,
    floatingButton,
    refresh,
  ]);

  const persistBannerCustomization = async () => {
    if (!site?.id) return;
    await saveBannerCustomization({
      siteId: String(site.id),
      customization: {
        ...(customizationBase || {}),
        position: appearance.layout.alignment,
        backgroundColor: appearance.colors.bannerBg,
        textColor: appearance.colors.textColor,
        headingColor: appearance.colors.headingColor,
        acceptButtonBg: appearance.colors.buttonColor,
        acceptButtonText: appearance.colors.buttonTextColor,
        customiseButtonBg: appearance.colors.preferencesButtonBg,
        customiseButtonText: appearance.colors.preferencesButtonText,
        saveButtonBg: appearance.colors.savePreferencesButtonBg,
        saveButtonText: appearance.colors.savePreferencesButtonText,
        bannerBorderRadius: pxBorderRadiusToRem(appearance.layout.borderRadius),
        privacyPolicyUrl: contentSettings.privacyPolicyUrl || "",
        translations: {
          ...((customizationBase && customizationBase.translations) || {}),
          en: {
            ...(((customizationBase && customizationBase.translations && customizationBase.translations.en) || {})),
            title: contentSettings.title,
            acceptAll: contentSettings.acceptAll,
            description: contentSettings.gdpr.message,
            ccpaDescription: contentSettings.ccpa.message,
            rejectAll: contentSettings.gdpr.rejectAll,
            customise: contentSettings.preferencesLabel,
            doNotSell: contentSettings.ccpa.doNotSellLabel,
            cookiePreferences: contentSettings.preferenceTitle,
            managePreferences: contentSettings.preferenceMessage,
            optOutPreference: contentSettings.ccpa.optOutTitle,
            ccpaOptOutPreferenceIntro: contentSettings.ccpa.optOutMessage,
            saveMyPreferences: contentSettings.gdpr.saveMyPreferencesLabel || contentSettings.ccpa.saveMyPreferencesLabel,
            closeButtonEnabled: contentSettings.closeButton ? "1" : "0",
            rejectButtonEnabled: contentSettings.rejectButton ? "1" : "0",
            customizeButtonEnabled: contentSettings.customizeButton ? "1" : "0",
            cookiePolicyLinkEnabled: contentSettings.cookiePolicyLink ? "1" : "0",
            floatingButtonEnabled: floatingButton.enabled ? "1" : "0",
            floatingButtonPosition: floatingButton.position,
            bannerFontFamily: appearance.type.font,
            bannerFontWeight: weightLabelToNumeric(appearance.type.weight),
            bannerTextAlign: appearance.type.alignment,
            bannerLayoutVisual: appearance.layout.position,
            bannerEntranceAnimation: appearance.layout.animation,
          },
        },
      },
    });
    applyPersistSuccessState();
  };

  const handleSaveChanges = async () => {
    if (!site?.id || !hasUnsavedChanges) return;
    try {
      setPersistKind("save");
      setSavingContent(true);
      setPublishError(null);
      setSaveSuccess(false);
      setPublishSuccess(false);
      await persistBannerCustomization();
      setSaveSuccess(true);
    } catch (e) {
      console.error("[cookie-banner] failed to save banner customization", e);
      setPublishError(
        e instanceof Error ? e.message : "Could not save changes. Try again.",
      );
    } finally {
      setSavingContent(false);
      setPersistKind(null);
    }
  };

  const handlePublishChanges = async () => {
    if (!site?.id) return;
    try {
      setPersistKind("publish");
      setSavingContent(true);
      setPublishError(null);
      setPublishSuccess(false);
      setSaveSuccess(false);
      await persistBannerCustomization();
      setPublishSuccess(true);
    } catch (e) {
      console.error("[cookie-banner] failed to publish banner customization", e);
      setPublishError(
        e instanceof Error ? e.message : "Could not publish changes. Try again.",
      );
    } finally {
      setSavingContent(false);
      setPersistKind(null);
    }
  };

  useEffect(() => {
    if (!saveSuccess) return;
    const id = window.setTimeout(() => setSaveSuccess(false), 4000);
    return () => window.clearTimeout(id);
  }, [saveSuccess]);
const [iabEnabled, setIabEnabled] = useState(false);
const isToggleEnabled =
  effectivePlanId === "growth" || effectivePlanId === "essential";
  return (
    <div className="border-t border-[#00000010] mt-0.25 grid grid-cols-[172px_minmax(420px,454px)_minmax(0,1fr)]">
      <Sidebar active={active} setActive={setActive} iabEnabled={iabEnabled} />
      <div className="w-full h-screen overflow-y-auto px-5.5 py-10 space-y-5 border-r border-[#00000010]">
        {/* Consent Template Card */}
        {active === "General" && (
          <div>
            <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg p-4 mb-4.25">
              <p className="font-semibold text-base text-black mb-3">
                Consent template
              </p>

              <div className="relative mb-5">
                <RegulationSelector
                  site={site}
                  // Only disable dropdown while we're actively saving banner settings.
                  // Session-level loading can cause the whole dropdown to appear "stuck disabled".
                  loading={false}
                  effectivePlanId={effectivePlanId}
                  onChange={handleRegulationChange}
                />
              </div>

              <p className="text-[15px] leading-[22px] text-black tracking-tight">
                The selected template (opt-out banner) supports CCA/CPRA
                (California), VCDPA (Virginia), CPA (Colorado), CTDPA
                (Connecticut), & UCPA (Utah)
              </p>
            </div>

            {/* IAB Support Card */}
       

<div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg p-4">
  <p className="font-semibold text-base text-black mb-4">
    Support IAB TCF v2.3
  </p>

  <div className="flex items-center justify-between">
    <p className="text-xs text-black tracking-tight">
      Enable IAB TCF Support
    </p>

    {/* Toggle + Tooltip Wrapper */}
    <div className="relative group">
      
      {/* Toggle */}
      <div
        className={`relative ${
          !isToggleEnabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
        onClick={async () => {
          if (!isToggleEnabled) return;
          setIabEnabled((prev) =>{

             !prev && updateSiteBannerSettings({
      name: String(site.name || site.domain || ''),
      domain: String(site.domain || ''),
      organizationId: String(activeOrganizationId),
      bannerType: "iab",
      regionMode: "gdpr",
    }).catch((e) => {
      console.warn("[cookie-banner] regulation save failed (will retry on next save):", e);
    });

    prev && updateSiteBannerSettings({
      name: String(site.name || site.domain || ''),
      domain: String(site.domain || ''),
      organizationId: String(activeOrganizationId),
      bannerType: freePreviewBannerType,
      regionMode: freePreviewBannerType,
    }).catch((e) => {
      console.warn("[cookie-banner] regulation save failed (will retry on next save):", e);
    });
    
            
            return !prev
          });

          console.log("Updating site with IAB support enabled:", !iabEnabled);
         
        }}
      >
        <div
          className={`h-[22px] w-[42px] rounded-full transition ${
            iabEnabled ? "bg-[#007aff]" : "bg-[#d8d8d8]"
          }`}
        ></div>

        <div
          className={`absolute top-[2px] rounded-full w-[18px] h-[18px] bg-white transition ${
            iabEnabled ? "left-[21px]" : "left-[3px]"
          }`}
        ></div>
      </div>

      {/* Tooltip (only when disabled) */}
     {!isToggleEnabled && (
  <div className="absolute right-0 bottom-[120%] hidden group-hover:block z-50">
    
    <div className="w-[222px] bg-white rounded-xl shadow-xl border border-gray-200 p-2 pt-4">
      
      {/* Title */}
      <p className="font-semibold   mb-1">
        Upgrade to Pro
      </p>

      {/* Description */}
      <p className="text-sm text-[#1A5EA1] leading-relaxed mb-3">
        To enable this feature, please switch to the Essential or Growth plan.
      </p>

      {/* Button */}
      <button onClick={()=>router.push("/upgrade")} className="w-full h-[40px] flex items-center justify-center gap-3 bg-[#007AFF] hover:bg-blue-700 text-white text-[15px] font-semibold py-3.75 rounded-md transition">
        Get Pro Plan
        <span><svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.37879e-05 4.99166V3.88766H6.69609L3.34809 0.767663L4.10409 -0.000336647L8.40009 4.09166V4.75166L4.10409 8.85566L3.34809 8.08766L6.67209 4.99166H9.37879e-05Z" fill="white"/>
</svg>
</span>
      </button>
    </div>

  </div>
)}
    </div>
  </div>
</div>
          </div>
        )}
        {active === "Content" && (
          <>
            
            <CookieNoticeAccordion2
              key={activeContentBannerType}
              bannerType={activeContentBannerType}
              isOpen={openAccordionKey === "cookieNotice"}
              onToggle={(nextOpen) => setOpenAccordionKey(nextOpen ? "cookieNotice" : null)}
              value={{
                title: contentSettings.title,
                message:
                  activeContentBannerType === "ccpa"
                    ? contentSettings.ccpa.message
                    : contentSettings.gdpr.message,
                acceptAll: contentSettings.acceptAll,
                customizeLabel: contentSettings.preferencesLabel,
                closeButton: contentSettings.closeButton,
                rejectButton: contentSettings.rejectButton,
                customizeButton: contentSettings.customizeButton,
                cookiePolicyLink: contentSettings.cookiePolicyLink,
                cookiePolicyLabel: contentSettings.cookiePolicyLabel,
                url: contentSettings.privacyPolicyUrl,
                rejectAll:
                  activeContentBannerType === "gdpr"
                    ? contentSettings.gdpr.rejectAll
                    : undefined,
                doNotSellLabel:
                  activeContentBannerType === "ccpa"
                    ? contentSettings.ccpa.doNotSellLabel
                    : undefined,
              }}
              onChange={(next) =>
                setContentSettings((prev) => {
                  if (activeContentBannerType === "gdpr") {
                    return {
                      ...prev,
                      title: next.title,
                      acceptAll: next.acceptAll,
                      preferencesLabel: next.customizeLabel,
                      closeButton: next.closeButton,
                      rejectButton: next.rejectButton,
                      customizeButton: next.customizeButton,
                      cookiePolicyLink: next.cookiePolicyLink,
                      cookiePolicyLabel: next.cookiePolicyLabel,
                      privacyPolicyUrl: next.url,
                      gdpr: {
                        ...prev.gdpr,
                        message: next.message,
                        rejectAll: next.rejectAll || prev.gdpr.rejectAll,
                      },
                    };
                  }
                  return {
                    ...prev,
                    title: next.title,
                    acceptAll: next.acceptAll,
                    preferencesLabel: next.customizeLabel,
                    closeButton: next.closeButton,
                    rejectButton: next.rejectButton,
                    customizeButton: next.customizeButton,
                    cookiePolicyLink: next.cookiePolicyLink,
                    cookiePolicyLabel: next.cookiePolicyLabel,
                    privacyPolicyUrl: next.url,
                    ccpa: {
                      ...prev.ccpa,
                      message: next.message,
                      doNotSellLabel: next.doNotSellLabel || prev.ccpa.doNotSellLabel,
                    },
                  };
                })
              }
            />
            <PreferenceBannerAccordion
              variant={activeContentBannerType}
              isOpen={openAccordionKey === "preferenceBanner"}
              onToggle={(nextOpen) =>
                setOpenAccordionKey(nextOpen ? "preferenceBanner" : null)
              }
              value={
                activeContentBannerType === "gdpr"
                  ? {
                      title: contentSettings.preferenceTitle,
                      message: contentSettings.preferenceMessage,
                      saveButtonLabel: contentSettings.gdpr.saveMyPreferencesLabel,
                    }
                  : {
                      title: contentSettings.ccpa.optOutTitle,
                      message: contentSettings.ccpa.optOutMessage,
                      saveButtonLabel:
                        contentSettings.ccpa.saveMyPreferencesLabel,
                    }
              }
              onChange={(next) =>
                setContentSettings((prev) =>
                  activeContentBannerType === "gdpr"
                    ? {
                        ...prev,
                        preferenceTitle: next.title,
                        preferenceMessage: next.message,
                        gdpr: {
                          ...prev.gdpr,
                          saveMyPreferencesLabel:
                            next.saveButtonLabel ?? prev.gdpr.saveMyPreferencesLabel,
                        },
                      }
                    : {
                        ...prev,
                        ccpa: {
                          ...prev.ccpa,
                          optOutTitle: next.title,
                          optOutMessage: next.message,
                          saveMyPreferencesLabel:
                            next.saveButtonLabel ??
                            prev.ccpa.saveMyPreferencesLabel,
                        },
                      }
                )
              }
            />
            {/* Cookie List section hidden
            <CookieListAccordion
              isOpen={openAccordionKey === "cookieList"}
              onToggle={(nextOpen) =>
                setOpenAccordionKey(nextOpen ? "cookieList" : null)
              }
            />
            */}
            <FloatingButtonSettings
              value={floatingButton}
              onChange={setFloatingButton}
            />

            <BannerLinkSection
              effectivePlanId={effectivePlanId}
              consentType={consentType}
            />

          </>
        )}
        {active === "Layout" && (
          <BannerControl value={appearance.layout} onChange={(layout) => setAppearance((a) => ({ ...a, layout }))} />
        )}
        {active === "Colors" && (
          <ColorPickerPanel
            value={appearance.colors}
            onChange={(colors) => setAppearance((a) => ({ ...a, colors }))}
          />
        )}
        {active === "Type" && (
          <FontPickerPanel
            value={appearance.type}
            onChange={(type) => setAppearance((a) => ({ ...a, type }))}
          />
        )}
      </div>
      {/* Save persists draft edits only; Publish can be used anytime to push live (including re-publish). */}
      <ConsentPreview
      iabEnabled={iabEnabled}
        key={previewRevision}
        previewBannerType={previewBannerType}
        siteDomain={site?.domain ?? null}
        consentType={consentType}
        initialLayout={appearance.layout}
        content={contentForPreview}
        floatingButton={floatingButton}
        onSaveChanges={handleSaveChanges}
        saveDisabled={
          !site?.id || savingContent || !hasUnsavedChanges
        }
        saveBusy={savingContent && persistKind === "save"}
        saveSuccess={saveSuccess}
        onDismissSaveSuccess={dismissSaveSuccess}
        onPublishChanges={handlePublishChanges}
        publishBusy={savingContent && persistKind === "publish"}
        publishDisabled={!mounted || !site?.id || savingContent}
        publishError={publishError}
        publishSuccess={publishSuccess}
        onDismissPublishSuccess={dismissPublishSuccess}
        onNext={() => setShowInstallModal(true)}
        bothModeBannerType={
          consentType === "both" ? bothContentFocus : undefined
        }
        onBothModeBannerTypeChange={
          consentType === "both" ? setBothContentFocus : undefined
        }
        forceModalView={
          openAccordionKey === "preferenceBanner"
            ? (activeContentBannerType === "ccpa" ? "ccpa-optout" : "gdpr-preferences")
            : openAccordionKey === "cookieNotice" || openAccordionKey === "cookieList" || openAccordionKey === null
            ? "main"
            : undefined
        }
      />
      <InstallConsentModal
        open={showInstallModal}
        scriptUrl={currentScriptUrl}
        siteDomain={site?.domain}
        siteId={siteId}
        cdnScriptId={site?.cdnScriptId ? String(site.cdnScriptId) : undefined}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  );
}
