/** Shared draft state for Layout / Colors / Type — published in one `saveBannerCustomization` call. */

export type BannerLayoutValue = {
  /** Visual style in the editor (not all are used by the live embed yet). */
  position: 'box' | 'banner' | 'bottom-center';
  /** Maps to DB `position` (bottom-left | bottom-right | bottom-center). */
  alignment: 'bottom-left' | 'bottom-right' | 'bottom-center';
  /** Border radius in px (stored as rem in DB). */
  borderRadius: string;
  /** Button border radius in px (stored as rem in DB). */
  buttonBorderRadius: string;
  /** Saved under translations.en.bannerEntranceAnimation for future use. */
  animation: string;
};

export type ColorSettings = {
  bannerBg: string;
  textColor: string;
  headingColor: string;
  /** Accept all — maps to API `acceptButtonBg` / `acceptButtonText`. */
  buttonColor: string;
  buttonTextColor: string;
  /** “Preferences” / customise — maps to `customiseButtonBg` / `customiseButtonText`. */
  preferencesButtonBg: string;
  preferencesButtonText: string;
  /** Kept in sync with preferences for publish; same visual group as “Save” in the panel. */
  savePreferencesButtonBg: string;
  savePreferencesButtonText: string;
};

export type TypeSettings = {
  font: string;
  weight: string;
  alignment: 'left' | 'center' | 'right';
};

export type AppearanceState = {
  layout: BannerLayoutValue;
  colors: ColorSettings;
  type: TypeSettings;
};

export const DEFAULT_APPEARANCE: AppearanceState = {
  layout: {
    position: 'box',
    alignment: 'bottom-left',
    borderRadius: '12',
    buttonBorderRadius: '8',
    animation: 'fade-in',
  },
  colors: {
    bannerBg: '#ffffff',
    textColor: '#334155',
    headingColor: '#0f172a',
    buttonColor: '#007aff',
    buttonTextColor: '#ffffff',
    preferencesButtonBg: '#ffffff',
    preferencesButtonText: '#0284c7',
    savePreferencesButtonBg: '#ffffff',
    savePreferencesButtonText: '#0284c7',
  },
  type: {
    font: 'Inter',
    weight: 'Bold',
    alignment: 'left',
  },
};

export function pxBorderRadiusToRem(px: string): string {
  const parsed = Number.parseFloat(px);
  const n = Math.max(0, isNaN(parsed) ? 12 : parsed);
  return `${(n / 16).toFixed(3)}rem`;
}

const MAX_BORDER_RADIUS = 25;

export function bannerRadiusToPxString(r: string | undefined | null): string {
  if (r == null || r === '') return DEFAULT_APPEARANCE.layout.borderRadius;
  const s = String(r).trim();
  if (s.endsWith('px')) return String(Math.min(MAX_BORDER_RADIUS, Math.max(0, Math.round(Number.parseFloat(s) || 12))));
  if (s.endsWith('rem')) return String(Math.min(MAX_BORDER_RADIUS, Math.max(0, Math.round((Number.parseFloat(s) || 0.75) * 16))));
  const n = Number.parseFloat(s);
  if (!Number.isNaN(n) && n < 4) return String(Math.min(MAX_BORDER_RADIUS, Math.max(0, Math.round(n * 16))));
  return String(Math.min(MAX_BORDER_RADIUS, Math.max(0, Math.round(n || 12))));
}

export function normalizeBannerPosition(
  raw: string | undefined | null,
): 'bottom-left' | 'bottom-right' | 'bottom-center' {
  const v = String(raw || '').toLowerCase();
  if (v === 'bottom-right' || v === 'right') return 'bottom-right';
  if (v === 'bottom-center' || v === 'center') return 'bottom-center';
  return 'bottom-left';
}

const WEIGHT_LABEL_TO_NUM: Record<string, string> = {
  Thin: '100',
  Light: '300',
  Regular: '400',
  Medium: '500',
  'Semi Bold': '600',
  Bold: '700',
  'Extra Bold': '800',
  Black: '900',
};

const NUM_TO_WEIGHT_LABEL: Record<string, string> = {
  '100': 'Thin',
  '300': 'Light',
  '400': 'Regular',
  '500': 'Medium',
  '600': 'Semi Bold',
  '700': 'Bold',
  '800': 'Extra Bold',
  '900': 'Black',
};

export function weightLabelToNumeric(label: string): string {
  return WEIGHT_LABEL_TO_NUM[label] || '700';
}

export function numericWeightToLabel(weight: string | undefined | null): string {
  const n = String(weight || '700').trim();
  return NUM_TO_WEIGHT_LABEL[n] || 'Bold';
}

export function normalizeTextAlign(
  raw: string | undefined | null,
): 'left' | 'center' | 'right' {
  const v = String(raw || 'left').toLowerCase();
  if (v === 'center' || v === 'right') return v;
  return 'left';
}

const LAYOUT_VISUAL = ['box', 'banner', 'bottom-center', 'popup'] as const;

export function appearanceFromCustomization(
  customization: Record<string, unknown> | null | undefined,
): AppearanceState {
  if (!customization) {
    return {
      layout: { ...DEFAULT_APPEARANCE.layout },
      colors: { ...DEFAULT_APPEARANCE.colors },
      type: { ...DEFAULT_APPEARANCE.type },
    };
  }

  const translations = (customization as { translations?: { en?: Record<string, string>; config?: Record<string, string> } }).translations || {};
  const en = translations.en || {};
  const cfg = translations.config || {};

  // Prefer config (written by both webapp and Webflow app) then fall back to en.
  const _cfgOrEn = (c: string | undefined, e: string | undefined) => (c != null && c !== '' ? c : e);

  const visualRaw = String(_cfgOrEn(cfg.bannerLayoutVisual, en.bannerLayoutVisual) || 'box').toLowerCase();
  // Coerce legacy 'popup' saved value to the new 'bottom-center' option.
  const visualNorm = visualRaw === 'popup' ? 'bottom-center' : visualRaw;
  const position = LAYOUT_VISUAL.includes(visualNorm as (typeof LAYOUT_VISUAL)[number])
    ? (visualNorm as AppearanceState['layout']['position'])
    : 'box';

  const rawAlignment = normalizeBannerPosition(
    (customization as { position?: string }).position,
  );
  const animationRaw = _cfgOrEn(cfg.bannerEntranceAnimation, en.bannerEntranceAnimation);
  const layout: BannerLayoutValue = {
    position,
    alignment: position === 'box' && rawAlignment === 'bottom-center' ? 'bottom-left' : rawAlignment,
    borderRadius: bannerRadiusToPxString(
      (customization as { bannerBorderRadius?: string }).bannerBorderRadius,
    ),
    buttonBorderRadius: bannerRadiusToPxString(
      (customization as { buttonBorderRadius?: string }).buttonBorderRadius ?? '8',
    ),
    animation:
      typeof animationRaw === 'string' && animationRaw.length > 0
        ? animationRaw
        : DEFAULT_APPEARANCE.layout.animation,
  };

  const c = customization as {
    backgroundColor?: string;
    textColor?: string;
    headingColor?: string;
    acceptButtonBg?: string;
    acceptButtonText?: string;
    customiseButtonBg?: string;
    customiseButtonText?: string;
    saveButtonBg?: string;
    saveButtonText?: string;
  };

  const colors: ColorSettings = {
    bannerBg: c.backgroundColor || DEFAULT_APPEARANCE.colors.bannerBg,
    textColor: c.textColor || DEFAULT_APPEARANCE.colors.textColor,
    headingColor: c.headingColor || DEFAULT_APPEARANCE.colors.headingColor,
    buttonColor: c.acceptButtonBg || DEFAULT_APPEARANCE.colors.buttonColor,
    buttonTextColor: c.acceptButtonText || DEFAULT_APPEARANCE.colors.buttonTextColor,
    preferencesButtonBg: c.customiseButtonBg || DEFAULT_APPEARANCE.colors.preferencesButtonBg,
    preferencesButtonText: c.customiseButtonText || DEFAULT_APPEARANCE.colors.preferencesButtonText,
    savePreferencesButtonBg: c.saveButtonBg || DEFAULT_APPEARANCE.colors.savePreferencesButtonBg,
    savePreferencesButtonText: c.saveButtonText || DEFAULT_APPEARANCE.colors.savePreferencesButtonText,
  };
  // Preference + save-in-panel use the same colors (preview + publish).
  colors.savePreferencesButtonBg = colors.preferencesButtonBg;
  colors.savePreferencesButtonText = colors.preferencesButtonText;

  const type: TypeSettings = {
    font: _cfgOrEn(cfg.bannerFontFamily, en.bannerFontFamily) || DEFAULT_APPEARANCE.type.font,
    weight: numericWeightToLabel(_cfgOrEn(cfg.bannerFontWeight, en.bannerFontWeight)),
    alignment: normalizeTextAlign(_cfgOrEn(cfg.bannerTextAlign, en.bannerTextAlign)),
  };

  return { layout, colors, type };
}
