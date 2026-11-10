/**
 * Editor-only banner checks (warnings, never blocking). Accept and Reject share one
 * style in the banner, and categories are never pre-ticked, so those cannot fail here;
 * what the customer can get wrong is colour contrast and the privacy policy link.
 */
import type { ColorSettings } from "./bannerAppearance";

/** WCAG 2.x AA minimum contrast for normal-size text. */
export const MIN_TEXT_CONTRAST = 4.5;
/**
 * Button labels: WCAG AA for bold/large text and UI components. Our own default
 * buttons sit at ~4.0:1, so 4.5 here would warn on every untouched banner.
 */
export const MIN_BUTTON_CONTRAST = 3;

function parseHex(color: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((color || "").trim());
  if (!m) return null;
  const hex = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio (1–21), or null when either colour isn't a plain hex value. */
export function contrastRatio(fg: string, bg: string): number | null {
  const a = parseHex(fg);
  const b = parseHex(bg);
  if (!a || !b) return null;
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastWarning = { group: "general" | "buttons"; message: string };

/** Pairs the visitor actually reads, checked against WCAG AA. */
export function contrastWarnings(colors: ColorSettings): ContrastWarning[] {
  const pairs: { group: ContrastWarning["group"]; label: string; fg: string; bg: string; min: number }[] = [
    { group: "general", label: "Text", fg: colors.textColor, bg: colors.bannerBg, min: MIN_TEXT_CONTRAST },
    { group: "general", label: "Heading", fg: colors.headingColor, bg: colors.bannerBg, min: MIN_TEXT_CONTRAST },
    { group: "buttons", label: "Accept/Reject button text", fg: colors.buttonTextColor, bg: colors.buttonColor, min: MIN_BUTTON_CONTRAST },
    { group: "buttons", label: "Preferences button text", fg: colors.preferencesButtonText, bg: colors.preferencesButtonBg, min: MIN_BUTTON_CONTRAST },
  ];
  const out: ContrastWarning[] = [];
  for (const p of pairs) {
    const ratio = contrastRatio(p.fg, p.bg);
    if (ratio !== null && ratio < p.min) {
      out.push({
        group: p.group,
        message: `${p.label} is hard to read (contrast ${ratio.toFixed(1)}:1, minimum ${p.min}:1). Visitors must be able to read the banner for their consent to count.`,
      });
    }
  }
  return out;
}

/** True when the value looks like a usable http(s) link. */
export function isHttpUrl(url: string | undefined): boolean {
  try {
    const u = new URL((url || "").trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
