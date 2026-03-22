/** Shared draft state for Layout / Colors / Type — published in one `saveBannerCustomization` call. */

export type BannerLayoutValue = {
  /** Visual style in the editor (not all are used by the live embed yet). */
  position: 'box' | 'banner' | 'popup';
  /** Maps to DB `position` (bottom-left | bottom-right). */
  alignment: 'bottom-left' | 'bottom-right';
  /** Border radius in px (stored as rem in DB). */
  borderRadius: string;
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
  /** “Save my preferences” in the preference panel footer — `saveButtonBg` / `saveButtonText`. */
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
    animation: 'fade-in',
  },
  colors: {
    bannerBg: '#ffffff',
    textColor: '#334155',
    headingColor: '#0f172a',
    buttonColor: '#0284c7',
    buttonTextColor: '#ffffff',
    preferencesButtonBg: '#ffffff',
    preferencesButtonText: '#334155',
    savePreferencesButtonBg: '#ffffff',
    savePreferencesButtonText: '#334155',
  },
  type: {
    font: 'Inter',
    weight: 'Bold',
    alignment: 'left',
  },
};

export function pxBorderRadiusToRem(px: string): string {
  const n = Math.max(0, Number.parseFloat(px) || 12);
  return `${(n / 16).toFixed(3)}rem`;
}

export function bannerRadiusToPxString(r: string | undefined | null): string {
  if (r == null || r === '') return DEFAULT_APPEARANCE.layout.borderRadius;
  const s = String(r).trim();
  if (s.endsWith('px')) return String(Math.max(0, Math.round(Number.parseFloat(s) || 12)));
  if (s.endsWith('rem')) return String(Math.max(0, Math.round((Number.parseFloat(s) || 0.75) * 16)));
  const n = Number.parseFloat(s);
  if (!Number.isNaN(n) && n < 4) return String(Math.max(0, Math.round(n * 16)));
  return String(Math.max(0, Math.round(n || 12)));
}

export function normalizeBannerPosition(
  raw: string | undefined | null,
): 'bottom-left' | 'bottom-right' {
  const v = String(raw || '').toLowerCase();
  if (v === 'bottom-right' || v === 'right') return 'bottom-right';
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

const LAYOUT_VISUAL = ['box', 'banner', 'popup'] as const;

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

  const en = (customization as { translations?: { en?: Record<string, string> } }).translations?.en || {};

  const visualRaw = String(en.bannerLayoutVisual || 'box').toLowerCase();
  const position = LAYOUT_VISUAL.includes(visualRaw as (typeof LAYOUT_VISUAL)[number])
    ? (visualRaw as AppearanceState['layout']['position'])
    : 'box';

  const layout: BannerLayoutValue = {
    position,
    alignment: normalizeBannerPosition(
      (customization as { position?: string }).position,
    ),
    borderRadius: bannerRadiusToPxString(
      (customization as { bannerBorderRadius?: string }).bannerBorderRadius,
    ),
    animation:
      typeof en.bannerEntranceAnimation === 'string' && en.bannerEntranceAnimation.length > 0
        ? en.bannerEntranceAnimation
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

  const type: TypeSettings = {
    font: en.bannerFontFamily || DEFAULT_APPEARANCE.type.font,
    weight: numericWeightToLabel(en.bannerFontWeight),
    alignment: normalizeTextAlign(en.bannerTextAlign),
  };

  return { layout, colors, type };
}
