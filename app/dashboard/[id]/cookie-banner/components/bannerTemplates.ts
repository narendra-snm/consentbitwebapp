// Saved banner templates — client half.
//
// A template is a named snapshot of a banner's COLORS + LAYOUT + TEXT CONTENT, reusable
// across sites so a new site doesn't have to be built by hand. The privacy-policy URL and
// the banner/regulation type stay per-site and are never carried across.
//
// The field lists below mirror handlers/bannerTemplates.js in the worker. The worker is
// the enforcing copy — it re-filters on write and on read, so a drift here can only ever
// send too much, never store too much. Keep them in step anyway.
import type { AppearanceState } from "./bannerAppearance";
import { parseApiResponse } from "@/lib/client-api";
import { pxBorderRadiusToRem } from "./bannerAppearance";

export const MAX_TEMPLATES = 2;

export type BannerTemplate = {
  id: string;
  name: string;
  payload: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

// Colors tab — every paint surface on the banner and the preference panel.
const TEMPLATE_COLOR_FIELDS = [
  "backgroundColor",
  "textColor",
  "headingColor",
  "acceptButtonBg",
  "acceptButtonText",
  "rejectButtonBg",
  "rejectButtonText",
  "customiseButtonBg",
  "customiseButtonText",
  "saveButtonBg",
  "saveButtonText",
  "backButtonBg",
  "backButtonText",
  "doNotSellButtonBg",
  "doNotSellButtonText",
] as const;

// Layout tab — shape, placement and motion. Nothing that reads as content.
const TEMPLATE_LAYOUT_FIELDS = [
  "position",
  "bannerBorderRadius",
  "buttonBorderRadius",
  "preferencePosition",
  "centerAnimationDirection",
  "animationEnabled",
  "stopScroll",
] as const;

// Layout values that live in the translations blob rather than a column. `config` is the
// block cdnM.js reads first, so it is the copy that actually takes effect.
const TEMPLATE_CONFIG_KEYS = ["bannerLayoutVisual", "bannerEntranceAnimation"] as const;

/**
 * Content tab — the banner's copy, carried inside translations.en.
 *
 * `languageSelected` is in this list on purpose. The strings below *are* a language, and
 * the runtime picks its built-in section labels from languageSelected; copying French copy
 * while leaving the site on 'en' would render a half-translated banner. So the language
 * travels with the text it belongs to.
 *
 * Still excluded from translations.en, and not by oversight:
 *   isIab / isGoogleAc      — per-site registration plus a paid entitlement.
 *   cookiePolicyLinkEnabled — turns on a link whose URL (privacyPolicyUrl) is per-site
 *                             and deliberately not copied, so it could enable a link
 *                             pointing at nothing.
 *   the bannerFont keys and bannerTextAlign — the Type tab, which is not in scope.
 */
const TEMPLATE_CONTENT_KEYS = [
  "languageSelected",
  "title",
  "description",
  "ccpaDescription",
  "acceptAll",
  "rejectAll",
  "customise",
  "doNotSell",
  "cookiePreferences",
  "managePreferences",
  "optOutPreference",
  "ccpaOptOutPreferenceIntro",
  "cancel",
  "saveMyPreferences",
  "ccpaSaveMyPreferences",
  "privacyPolicy",
  "closeButtonEnabled",
  "rejectButtonEnabled",
  "customizeButtonEnabled",
  "essential",
  "essentialDescription",
  "analytics",
  "analyticsDescription",
  "marketing",
  "marketingDescription",
  "preferences",
  "preferencesDescription",
  "alwaysActive",
] as const;

type Customization = Record<string, any>;

/** The subset of the editor's content state a template captures. */
export type TemplateContent = {
  title: string;
  acceptAll: string;
  preferencesLabel: string;
  preferenceTitle: string;
  preferenceMessage: string;
  closeButton: boolean;
  rejectButton: boolean;
  customizeButton: boolean;
  cookiePolicyLabel: string;
  gdpr: { message: string; rejectAll: string; saveMyPreferencesLabel: string };
  ccpa: {
    message: string;
    doNotSellLabel: string;
    optOutTitle: string;
    optOutMessage: string;
    saveMyPreferencesLabel: string;
    cancelLabel: string;
  };
  categories: {
    necessary?: { name?: string; description?: string };
    analytics?: { name?: string; description?: string };
    marketing?: { name?: string; description?: string };
    preferences?: { name?: string; description?: string };
    alwaysActiveLabel?: string;
  };
};

/**
 * Map the editor's live content state onto the translations.en keys the runtime reads.
 *
 * Mirrors the equivalent block in Container's persistBannerCustomization. It is built from
 * the live editor state rather than the loaded row on purpose: the loaded row only catches
 * up on publish, so reading it would silently snapshot the last *published* wording rather
 * than what the user is looking at.
 */
function contentToTranslationsEn(
  content: TemplateContent,
  langCode: string,
): Record<string, unknown> {
  return {
    languageSelected: langCode,
    title: content.title,
    acceptAll: content.acceptAll,
    description: content.gdpr.message,
    ccpaDescription: content.ccpa.message,
    rejectAll: content.gdpr.rejectAll,
    customise: content.preferencesLabel,
    doNotSell: content.ccpa.doNotSellLabel,
    cookiePreferences: content.preferenceTitle,
    managePreferences: content.preferenceMessage,
    optOutPreference: content.ccpa.optOutTitle,
    ccpaOptOutPreferenceIntro: content.ccpa.optOutMessage,
    cancel: content.ccpa.cancelLabel,
    saveMyPreferences:
      content.gdpr.saveMyPreferencesLabel || content.ccpa.saveMyPreferencesLabel,
    ccpaSaveMyPreferences: content.ccpa.saveMyPreferencesLabel,
    privacyPolicy: content.cookiePolicyLabel || "Privacy Policy",
    closeButtonEnabled: content.closeButton ? "1" : "0",
    rejectButtonEnabled: content.rejectButton ? "1" : "0",
    customizeButtonEnabled: content.customizeButton ? "1" : "0",
    essential: content.categories.necessary?.name,
    essentialDescription: content.categories.necessary?.description,
    analytics: content.categories.analytics?.name,
    analyticsDescription: content.categories.analytics?.description,
    marketing: content.categories.marketing?.name,
    marketingDescription: content.categories.marketing?.description,
    preferences: content.categories.preferences?.name,
    preferencesDescription: content.categories.preferences?.description,
    alwaysActive: content.categories.alwaysActiveLabel,
  };
}

/**
 * Snapshot the current editor state as a template payload.
 *
 * Reads from `appearance` for anything the Colors/Layout tabs edit and falls back to the
 * loaded row for the surfaces those tabs don't expose (back / do-not-sell buttons,
 * preference position, stopScroll), so a template captures the banner as it actually
 * renders rather than only the controls that happen to have UI.
 */
export function buildTemplatePayload(
  appearance: AppearanceState,
  base: Customization | null | undefined,
  content?: TemplateContent,
  langCode = "en",
): Customization {
  const b = base || {};

  return {
    // Colors
    backgroundColor: appearance.colors.bannerBg,
    textColor: appearance.colors.textColor,
    headingColor: appearance.colors.headingColor,
    acceptButtonBg: appearance.colors.buttonColor,
    acceptButtonText: appearance.colors.buttonTextColor,
    rejectButtonBg: b.rejectButtonBg || appearance.colors.buttonColor,
    rejectButtonText: b.rejectButtonText || appearance.colors.buttonTextColor,
    customiseButtonBg: appearance.colors.preferencesButtonBg,
    customiseButtonText: appearance.colors.preferencesButtonText,
    saveButtonBg: appearance.colors.savePreferencesButtonBg,
    saveButtonText: appearance.colors.savePreferencesButtonText,
    ...(b.backButtonBg ? { backButtonBg: b.backButtonBg } : {}),
    ...(b.backButtonText ? { backButtonText: b.backButtonText } : {}),
    ...(b.doNotSellButtonBg ? { doNotSellButtonBg: b.doNotSellButtonBg } : {}),
    ...(b.doNotSellButtonText ? { doNotSellButtonText: b.doNotSellButtonText } : {}),

    // Layout
    position: appearance.layout.alignment,
    bannerBorderRadius: pxBorderRadiusToRem(appearance.layout.borderRadius),
    buttonBorderRadius: pxBorderRadiusToRem(appearance.layout.buttonRadius),
    centerAnimationDirection: appearance.layout.animation,
    ...(b.preferencePosition ? { preferencePosition: b.preferencePosition } : {}),
    ...(b.animationEnabled !== undefined ? { animationEnabled: b.animationEnabled } : {}),
    ...(b.stopScroll !== undefined ? { stopScroll: b.stopScroll } : {}),

    translations: {
      config: {
        bannerLayoutVisual: appearance.layout.position,
        bannerEntranceAnimation: appearance.layout.animation,
      },
      // Content is optional so a caller that only has appearance to hand still produces a
      // valid (colors + layout) template rather than an empty en block that would blank
      // the target site's copy on apply.
      ...(content ? { en: contentToTranslationsEn(content, langCode) } : {}),
    },
  };
}

/**
 * Overlay a template onto an existing customization row.
 *
 * The site's own object is the base and only allow-listed keys are written over it, so
 * `translations.en` — every piece of banner text, plus languageSelected and the IAB
 * flags — survives untouched. That is what makes applying a template non-destructive to
 * content, and it is the reason this merges key-by-key instead of spreading the payload.
 */
export function mergeTemplateIntoCustomization(
  base: Customization | null | undefined,
  payload: Customization | null | undefined,
): Customization {
  const out: Customization = { ...(base || {}) };
  if (!payload) return out;

  for (const key of [...TEMPLATE_COLOR_FIELDS, ...TEMPLATE_LAYOUT_FIELDS]) {
    if (payload[key] !== undefined && payload[key] !== null) out[key] = payload[key];
  }

  const baseTranslations = (base as any)?.translations || {};
  const incomingConfig = payload?.translations?.config;
  const incomingEn = payload?.translations?.en;

  if (incomingConfig || incomingEn) {
    const nextTranslations: Record<string, unknown> = { ...baseTranslations };

    if (incomingConfig) {
      const config: Record<string, unknown> = { ...(baseTranslations.config || {}) };
      for (const key of TEMPLATE_CONFIG_KEYS) {
        if (incomingConfig[key] !== undefined && incomingConfig[key] !== null) {
          config[key] = incomingConfig[key];
        }
      }
      nextTranslations.config = config;
    }

    if (incomingEn) {
      // Still key-by-key, even though content is now copied. The en block also holds
      // isIab, isGoogleAc and cookiePolicyLinkEnabled, which are per-site and must
      // survive — spreading the incoming block wholesale would drop them.
      const en: Record<string, unknown> = { ...(baseTranslations.en || {}) };
      for (const key of TEMPLATE_CONTENT_KEYS) {
        if (incomingEn[key] !== undefined && incomingEn[key] !== null) {
          en[key] = incomingEn[key];
        }
      }
      nextTranslations.en = en;
    }

    out.translations = nextTranslations;
  }

  return out;
}

/**
 * Inverse of contentToTranslationsEn: fold a template's en block back into the editor's
 * content state so applying a template updates the Content tab and the preview, not just
 * colors and layout.
 *
 * `current` is the base, and only keys the template actually carries are overwritten — so
 * per-site values the editor holds but a template never stores (privacyPolicyUrl, the
 * cookie-policy-link toggle) are preserved rather than reset to defaults.
 */
export function applyTemplateContent<T extends TemplateContent>(
  en: Record<string, any> | null | undefined,
  current: T,
): T {
  if (!en) return current;
  const pick = (v: unknown, fallback: string): string =>
    typeof v === "string" && v.length > 0 ? v : fallback;
  // Flags round-trip as "1"/"0" strings through the runtime, but older rows may hold
  // real booleans — accept both rather than silently reading a boolean as truthy-string.
  const flag = (v: unknown, fallback: boolean): boolean =>
    v === undefined || v === null ? fallback : typeof v === "boolean" ? v : String(v) !== "0";

  return {
    ...current,
    title: pick(en.title, current.title),
    acceptAll: pick(en.acceptAll, current.acceptAll),
    preferencesLabel: pick(en.customise, current.preferencesLabel),
    preferenceTitle: pick(en.cookiePreferences, current.preferenceTitle),
    preferenceMessage: pick(en.managePreferences, current.preferenceMessage),
    cookiePolicyLabel: pick(en.privacyPolicy, current.cookiePolicyLabel),
    closeButton: flag(en.closeButtonEnabled, current.closeButton),
    rejectButton: flag(en.rejectButtonEnabled, current.rejectButton),
    customizeButton: flag(en.customizeButtonEnabled, current.customizeButton),
    gdpr: {
      ...current.gdpr,
      message: pick(en.description, current.gdpr.message),
      rejectAll: pick(en.rejectAll, current.gdpr.rejectAll),
      saveMyPreferencesLabel: pick(en.saveMyPreferences, current.gdpr.saveMyPreferencesLabel),
    },
    ccpa: {
      ...current.ccpa,
      message: pick(en.ccpaDescription, current.ccpa.message),
      doNotSellLabel: pick(en.doNotSell, current.ccpa.doNotSellLabel),
      optOutTitle: pick(en.optOutPreference, current.ccpa.optOutTitle),
      optOutMessage: pick(en.ccpaOptOutPreferenceIntro, current.ccpa.optOutMessage),
      cancelLabel: pick(en.cancel, current.ccpa.cancelLabel),
      saveMyPreferencesLabel: pick(
        en.ccpaSaveMyPreferences ?? en.saveMyPreferences,
        current.ccpa.saveMyPreferencesLabel,
      ),
    },
    categories: {
      ...current.categories,
      necessary: {
        name: pick(en.essential, current.categories.necessary?.name ?? ""),
        description: pick(
          en.essentialDescription,
          current.categories.necessary?.description ?? "",
        ),
      },
      analytics: {
        name: pick(en.analytics, current.categories.analytics?.name ?? ""),
        description: pick(
          en.analyticsDescription,
          current.categories.analytics?.description ?? "",
        ),
      },
      marketing: {
        name: pick(en.marketing, current.categories.marketing?.name ?? ""),
        description: pick(
          en.marketingDescription,
          current.categories.marketing?.description ?? "",
        ),
      },
      preferences: {
        name: pick(en.preferences, current.categories.preferences?.name ?? ""),
        description: pick(
          en.preferencesDescription,
          current.categories.preferences?.description ?? "",
        ),
      },
      alwaysActiveLabel: pick(
        en.alwaysActive,
        current.categories.alwaysActiveLabel ?? "",
      ),
    },
  } as T;
}

// ── API ────────────────────────────────────────────────────────────────────

export async function listTemplates(organizationId?: string | null): Promise<BannerTemplate[]> {
  const qs = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : "";
  const res = await fetch(`/api/banner-templates${qs}`, { credentials: "include" });
  const data = await parseApiResponse(res);
  if (!res.ok || !data?.success) return [];
  return (data.templates || []) as BannerTemplate[];
}

export async function saveTemplate(args: {
  organizationId?: string | null;
  name: string;
  payload: Customization;
  id?: string | null;
}): Promise<{ ok: boolean; error?: string; template?: BannerTemplate }> {
  const res = await fetch("/api/banner-templates", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organizationId: args.organizationId ?? undefined,
      name: args.name,
      payload: args.payload,
      ...(args.id ? { id: args.id } : {}),
    }),
  });
  const data = await parseApiResponse(res);
  if (!res.ok || !data?.success) {
    return { ok: false, error: data?.error || "Failed to save template" };
  }
  return { ok: true, template: { id: data.id, name: data.name, payload: data.payload } };
}

export type ApplyResult = { siteId: string; ok: boolean; error?: string };

/**
 * Apply a template to many sites at once.
 *
 * Deliberately a client-side fan-out over the existing /api/banner-customization
 * endpoint rather than a server-side batch writer. That endpoint does far more than write
 * the row — Webflow KV sync, version='v2' stamping, the plan gates, script injection,
 * PostHog — and a batch path that called saveBannerCustomization directly would skip all
 * of it and leave Webflow sites' KV stale. Slower, but it cannot silently diverge from a
 * normal save.
 *
 * `compliance` is intentionally omitted from each POST: the worker only rewrites
 * banner_type/region_mode when compliance is present, so leaving it out is what keeps the
 * regulation type per-site while the colors and layout are overwritten.
 *
 * Sites are processed one at a time. Concurrency here would multiply into D1 writes plus
 * a Webflow API call each, and the failure mode is a rate-limited half-applied batch.
 */
export async function applyTemplateToSites(
  payload: Customization,
  siteIds: string[],
  onProgress?: (done: number, total: number, current: string) => void,
): Promise<ApplyResult[]> {
  const results: ApplyResult[] = [];

  for (let i = 0; i < siteIds.length; i++) {
    const siteId = siteIds[i];
    onProgress?.(i, siteIds.length, siteId);

    try {
      // Read the site's current row first — the template is an overlay, not a
      // replacement, so the site's own text has to be the base we merge onto.
      const getRes = await fetch(
        `/api/banner-customization?siteId=${encodeURIComponent(siteId)}`,
        { credentials: "include" },
      );
      const getData = await parseApiResponse(getRes);
      if (!getRes.ok || !getData?.success) {
        results.push({ siteId, ok: false, error: "Could not read current banner settings" });
        continue;
      }

      const merged = mergeTemplateIntoCustomization(getData.customization, payload);

      const postRes = await fetch("/api/banner-customization", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, customization: merged }),
      });
      const postData = await parseApiResponse(postRes);

      if (!postRes.ok || !postData?.success) {
        results.push({ siteId, ok: false, error: postData?.error || "Save failed" });
      } else {
        results.push({ siteId, ok: true });
      }
    } catch (e) {
      results.push({ siteId, ok: false, error: e instanceof Error ? e.message : "Request failed" });
    }
  }

  onProgress?.(siteIds.length, siteIds.length, "");
  return results;
}

export async function deleteTemplate(
  id: string,
  organizationId?: string | null,
): Promise<boolean> {
  const qs =
    `?id=${encodeURIComponent(id)}` +
    (organizationId ? `&organizationId=${encodeURIComponent(organizationId)}` : "");
  const res = await fetch(`/api/banner-templates${qs}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await parseApiResponse(res);
  return Boolean(res.ok && data?.success);
}
