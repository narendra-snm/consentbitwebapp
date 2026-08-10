// The auth design's three faces, loaded in app/layout.tsx via next/font/google.
//
// next/font generates obfuscated family names, so a literal `fontFamily: "DM Sans"`
// does NOT resolve to the loaded font — it falls through to the generic fallback.
// Always reference the CSS variables below instead.
export const FONT_SANS = "var(--font-dm-sans), sans-serif";
export const FONT_DISPLAY = "var(--font-funnel-display), sans-serif";
export const FONT_MANROPE = "var(--font-manrope), sans-serif";

// The design's optical-size axis setting, applied to every DM Sans run.
export const OPSZ = '"opsz" 14';
