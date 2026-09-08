"use client";

// Purposes & Features data for the IAB preview, in the selected language.
//
// This half of the banner's text is NOT ours to translate: IAB owns the purpose,
// special-purpose, feature and special-feature declarations, and publishes them
// per language in the Global Vendor List. The runtime banner gets them through
// GVL.changeLanguage(); the preview reads the same worker endpoint so the two
// show identical wording.
//
// Copy we author ourselves (section headings, toggle labels, the vendor-count
// line) lives in iabTranslations.ts instead.

import { useEffect, useMemo, useState } from "react";
import { GVL_EN_FALLBACK, type GvlDeclarations, type GvlEntry } from "./iabGvlFallback";
import { iabT, resolveIabLang } from "./iabTranslations";

/** Same GVL host the runtime TCF manager uses (see iabrefrence/Tcfmanager.js). */
export const GVL_BASE_URL = "https://weathered-surf-ae57.narendra-3c5.workers.dev/gvl";

/**
 * Which legal bases each purpose may be declared under.
 *
 * At runtime this is derived from the vendor list — a purpose offers a
 * legitimate-interest toggle when at least one vendor declares it that way. The
 * preview does not load the ~5 MB vendor list, so the TCF v2.2 policy split is
 * hardcoded: purposes 1 and 3-6 are consent-only, the rest also permit
 * legitimate interest. Special purposes carry no toggle at all, and special
 * features are consent-only.
 */
const LEGITIMATE_INTEREST_PURPOSE_IDS = new Set([2, 7, 8, 9, 10, 11]);

/**
 * Illustrative vendor counts, carried over from the runtime banner's static
 * table. The real numbers come from the vendor list, which the preview does not
 * fetch; these are stable enough to show the shape of the line and never change
 * with language.
 */
const VENDOR_COUNTS: Record<string, Record<number, number>> = {
  purposes: { 1: 777, 2: 734, 3: 594, 4: 596, 5: 267, 6: 238, 7: 847, 8: 404, 9: 548, 10: 633, 11: 174 },
  specialPurposes: { 1: 595, 2: 594, 3: 445 },
  features: { 1: 436, 2: 369, 3: 558 },
  specialFeatures: { 1: 280, 2: 157 },
};

export type PurposeItem = {
  id: string;
  title: string;
  description: string;
  vendorCount: number;
  hasConsent: boolean;
  hasLegitimate: boolean;
};

export type PurposeSection = {
  id: string;
  title: string;
  hasToggle: boolean;
  items: PurposeItem[];
};

type SectionSpec = {
  kind: keyof GvlDeclarations;
  /** Section id, matching the runtime accordion ids. */
  id: string;
  /** Prefix for item ids, matching the runtime accordion ids. */
  itemPrefix: string;
  /** Heading key in the IAB string table. */
  labelKey: string;
  hasToggle: boolean;
};

const SECTION_SPECS: SectionSpec[] = [
  { kind: "purposes", id: "purposes", itemPrefix: "purpose", labelKey: "section.purposes", hasToggle: true },
  { kind: "specialPurposes", id: "special_purposes", itemPrefix: "specialPurpose", labelKey: "section.specialPurposes", hasToggle: false },
  { kind: "features", id: "features", itemPrefix: "feature", labelKey: "section.features", hasToggle: false },
  { kind: "specialFeatures", id: "special-features", itemPrefix: "special-feature", labelKey: "section.specialFeatures", hasToggle: true },
];

function sortedIds(map: Record<number, GvlEntry>): number[] {
  return Object.keys(map || {})
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);
}

/** Build the accordion sections the preview renders from a set of GVL declarations. */
export function buildPurposeSections(
  declarations: GvlDeclarations,
  lang: string,
): PurposeSection[] {
  return SECTION_SPECS.map((spec) => {
    const map = declarations[spec.kind] || {};
    const ids = sortedIds(map);
    const items: PurposeItem[] = ids.map((id) => {
      const entry = map[id];
      return {
        id: `${spec.itemPrefix}${id}`,
        title: entry?.name || "",
        description: entry?.description || "",
        vendorCount: VENDOR_COUNTS[spec.kind]?.[id] ?? 0,
        // Special purposes are disclosure-only — no legal basis for the user to set.
        hasConsent: spec.kind === "purposes" || spec.kind === "specialFeatures",
        hasLegitimate: spec.kind === "purposes" && LEGITIMATE_INTEREST_PURPOSE_IDS.has(id),
      };
    });
    return {
      id: spec.id,
      title: `${iabT(lang, spec.labelKey)} (${items.length})`,
      hasToggle: spec.hasToggle,
      items,
    };
  });
}

/**
 * Cache keyed by language, shared across mounts. The preview remounts on every
 * colour/layout tweak, and re-fetching the GVL each time would make switching
 * language feel slower the longer the session runs.
 */
const declarationCache = new Map<string, GvlDeclarations>([["en", GVL_EN_FALLBACK]]);

/** Narrow one `{ "1": { name, description }, ... }` block of the GVL response. */
function coerceEntries(raw: unknown): Record<number, GvlEntry> {
  const out: Record<number, GvlEntry> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = Number(key);
    if (!Number.isInteger(id) || id <= 0) continue;
    if (!value || typeof value !== "object") continue;
    const entry = value as { name?: unknown; description?: unknown };
    out[id] = {
      name: typeof entry.name === "string" ? entry.name : "",
      description: typeof entry.description === "string" ? entry.description : "",
    };
  }
  return out;
}

/**
 * In-flight requests, so the two callers of the hook — the banner notice needs
 * the purpose names, the modal needs the whole list — share one request per
 * language instead of racing each other on the first switch.
 */
const inFlight = new Map<string, Promise<GvlDeclarations>>();

async function fetchDeclarations(lang: string): Promise<GvlDeclarations> {
  const response = await fetch(`${GVL_BASE_URL}/purposes-${lang}.json`);
  if (!response.ok) throw new Error(`GVL ${lang}: HTTP ${response.status}`);
  const data = (await response.json()) as Record<string, unknown>;
  const declarations: GvlDeclarations = {
    purposes: coerceEntries(data?.purposes),
    specialPurposes: coerceEntries(data?.specialPurposes),
    features: coerceEntries(data?.features),
    specialFeatures: coerceEntries(data?.specialFeatures),
  };
  // A response missing the purposes block is not usable — treat it as a failure
  // so the caller falls back to English rather than rendering an empty tab.
  if (Object.keys(declarations.purposes).length === 0) {
    throw new Error(`GVL ${lang}: no purposes in response`);
  }
  return declarations;
}

/**
 * Purposes & Features for the active language.
 *
 * English is bundled, so it renders on the first frame with no request. Other
 * languages show English until the GVL arrives, then swap — the alternative,
 * an empty tab while loading, reads as a broken preview. A failed fetch keeps
 * English rather than surfacing an error: this is a preview, and degraded copy
 * beats no copy.
 */
export function useIabPurposeSections(lang: string): PurposeSection[] {
  const resolved = resolveIabLang(lang);
  const [declarations, setDeclarations] = useState<GvlDeclarations>(
    () => declarationCache.get(resolved) || GVL_EN_FALLBACK,
  );

  useEffect(() => {
    const cached = declarationCache.get(resolved);
    if (cached) {
      setDeclarations(cached);
      return;
    }
    // Show English while the translated set is in flight.
    setDeclarations(GVL_EN_FALLBACK);

    let request = inFlight.get(resolved);
    if (!request) {
      request = fetchDeclarations(resolved);
      inFlight.set(resolved, request);
      // Clear the slot either way: a failure should be retryable, a success is
      // served from declarationCache from here on.
      request
        .then((next) => declarationCache.set(resolved, next))
        .catch(() => undefined)
        .finally(() => inFlight.delete(resolved));
    }

    let cancelled = false;
    request
      .then((next) => {
        if (!cancelled) setDeclarations(next);
      })
      .catch((error) => {
        // Keep English. Nothing is cached, so switching away and back retries.
        console.error(`[ConsentBit][preview] GVL translation for "${resolved}" failed:`, error);
      });

    return () => {
      cancelled = true;
    };
  }, [resolved]);

  return useMemo(
    () => buildPurposeSections(declarations, resolved),
    [declarations, resolved],
  );
}
