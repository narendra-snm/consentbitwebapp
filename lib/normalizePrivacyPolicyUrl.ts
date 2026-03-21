/**
 * Normalize privacy policy URL for links.
 * Bare hostnames (e.g. www.consentbit.com) must become https://… so they are not
 * resolved as paths on the current page (embed host).
 *
 * Keep behavior aligned with `resolvePrivacyPolicyHref` in consent-manager/src/handlers/cdn.js
 */

function firstUrlSegment(u: string): string {
  let s = u;
  let cut = s.indexOf("#");
  if (cut >= 0) s = s.slice(0, cut);
  cut = s.indexOf("?");
  if (cut >= 0) s = s.slice(0, cut);
  cut = s.indexOf("/");
  if (cut >= 0) s = s.slice(0, cut);
  return s.trim();
}

function looksLikeStaticFileName(firstSeg: string): boolean {
  const dot = firstSeg.lastIndexOf(".");
  if (dot < 0) return false;
  const ext = firstSeg.slice(dot).toLowerCase();
  return (
    ext === ".js" ||
    ext === ".mjs" ||
    ext === ".css" ||
    ext === ".png" ||
    ext === ".jpg" ||
    ext === ".jpeg" ||
    ext === ".gif" ||
    ext === ".svg" ||
    ext === ".webp" ||
    ext === ".pdf" ||
    ext === ".json" ||
    ext === ".xml" ||
    ext === ".ico" ||
    ext === ".woff" ||
    ext === ".woff2"
  );
}

function trimLeadingSlashes(s: string): string {
  let out = s;
  while (out.startsWith("/")) out = out.slice(1);
  return out;
}

export function normalizePrivacyPolicyUrl(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "";
  const u = raw.trim();
  if (!u) return "";
  const lower = u.toLowerCase();
  if (lower.startsWith("mailto:") || lower.startsWith("tel:")) return u;
  if (lower.startsWith("http://") || lower.startsWith("https://")) return u;
  if (u.startsWith("//")) return "https:" + u;

  // True relative paths — resolve against current page when in browser
  if (u.startsWith("/") || u.startsWith("./") || u.startsWith("../")) {
    try {
      if (typeof window !== "undefined" && window.location) {
        return new URL(u, window.location.href).href;
      }
    } catch {
      /* fall through */
    }
    return u;
  }

  const firstSeg = firstUrlSegment(u);
  if (firstSeg.includes(".")) {
    if (!looksLikeStaticFileName(firstSeg)) {
      return "https://" + trimLeadingSlashes(u);
    }
  }

  try {
    if (typeof window !== "undefined" && window.location) {
      return new URL(u, window.location.href).href;
    }
  } catch {
    /* ignore */
  }
  return u;
}
