// Default banner copy for a given language.
//
// Extracted from Container so the template builder can re-translate its draft without a
// second copy of these defaults. Two copies would drift the moment a default changed, and
// the drift would be invisible — a template would just quietly carry stale wording.
import { TRANSLATIONS } from "./translations";
import type { CookieCategoryContent } from "./CookieCategoriesAccordion";

export function makeDefaultCategories(langCode = "en"): CookieCategoryContent {
  const T = TRANSLATIONS[langCode] || TRANSLATIONS.en;
  return {
    necessary: { name: T.essential, description: T.essentialDescription },
    analytics: { name: T.analytics, description: T.analyticsDescription },
    marketing: { name: T.marketing, description: T.marketingDescription },
    preferences: { name: T.preferences, description: T.preferencesDescription },
    alwaysActiveLabel: T.alwaysActive,
  };
}

export function makeDefaultContentSettings(langCode = "en") {
  const T = TRANSLATIONS[langCode] || TRANSLATIONS.en;
  return {
    title: T.title,
    acceptAll: T.acceptAll,
    preferencesLabel: T.customise,
    preferenceTitle: T.cookiePreferences,
    preferenceMessage: T.managePreferences,
    closeButton: true,
    rejectButton: true,
    customizeButton: true,
    cookiePolicyLink: true,
    cookiePolicyLabel: T.privacyPolicy,
    privacyPolicyUrl: "",
    gdpr: {
      message: T.description,
      rejectAll: T.rejectAll,
      saveMyPreferencesLabel: T.saveMyPreferences,
    },
    ccpa: {
      message: T.ccpaDescription || T.description,
      doNotSellLabel: T.doNotSell,
      optOutTitle: T.optOutPreference,
      optOutMessage: T.ccpaOptOutPreferenceIntro,
      saveMyPreferencesLabel: T.saveMyPreferences,
      cancelLabel: T.cancel,
    },
    categories: makeDefaultCategories(langCode),
  };
}

export type ContentSettings = ReturnType<typeof makeDefaultContentSettings>;
