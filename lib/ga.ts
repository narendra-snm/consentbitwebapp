"use client";

/**
 * Thin GA4 (gtag.js) wrapper. The gtag snippet itself is loaded once in
 * app/layout.tsx; this module only pushes events into it.
 *
 * IMPORTANT — Google forbids sending PII (email, name, raw user identifiers) to
 * GA4. Every helper here takes only non-PII parameters; the user is identified
 * by a SHA-256 hash of their email via `user_id`, never the address itself.
 */

// Must match the gtag('config', ...) id in app/layout.tsx.
export const GA_MEASUREMENT_ID = "G-GMTRK01CHJ";

type GaValue = string | number | boolean;
export type GaParams = Record<string, GaValue | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function push(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  // layout.tsx defines a global gtag(); fall back to a raw dataLayer push so an
  // event fired before that snippet executes is still queued rather than lost.
  if (typeof window.gtag === "function") window.gtag(...args);
  else window.dataLayer.push(args);
}

// GA4 drops params with null/undefined values and truncates strings at 100
// chars, so clean them here rather than relying on the collector.
function clean(params: GaParams): Record<string, GaValue> {
  const out: Record<string, GaValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    out[key] = typeof value === "string" ? value.slice(0, 100) : value;
  }
  return out;
}

/** Send a GA4 custom event. Name must be snake_case, <= 40 chars. */
export function gaEvent(name: string, params: GaParams = {}) {
  push("event", name, { ...clean(params), send_to: GA_MEASUREMENT_ID });
}

/**
 * Attach a stable, non-PII user identity to every subsequent hit. Enables GA4's
 * User-ID reporting identity and lets Measurement Protocol events sent from the
 * consent-manager worker resolve to the same person (the worker derives the
 * same hash from the same email).
 */
export function gaSetUserId(userIdHash: string) {
  push("config", GA_MEASUREMENT_ID, { user_id: userIdHash });
}

/** Non-PII user identifier: lowercase-trimmed email → SHA-256 hex. */
export async function hashEmail(email: string): Promise<string | null> {
  if (typeof window === "undefined" || !window.crypto?.subtle || !email) return null;
  try {
    const data = new TextEncoder().encode(email.trim().toLowerCase());
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

/**
 * The gtag client id from the `_ga` cookie (`GA1.1.<clientId>` →
 * `<random>.<timestamp>`). Pass it to the backend when you want a server-side
 * Measurement Protocol event to join this exact browser session.
 */
export function getGaClientId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
  if (!match) return null;
  const parts = decodeURIComponent(match[1]).split(".");
  return parts.length >= 4 ? `${parts[2]}.${parts[3]}` : null;
}
