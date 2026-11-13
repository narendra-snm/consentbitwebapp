/**
 * Black Friday offer — shared dates and copy for the banner, the pricing pages and the
 * dashboard. Remove this file with the offer (see lib/blackFridayCoupons.ts).
 *
 * OFFER_ENDS_AT matches the Stripe promo expiry in consent-manager
 * src/services/blackFridayOffer.js (BF20OFF / BF30OFF, 2026-11-30 18:29 UTC).
 */
export const OFFER_ENDS_AT = Date.UTC(2026, 10, 30, 18, 29, 0);

/** Marketing pricing page — where the login / signup banner sends people. */
export const BLACK_FRIDAY_PRICING_URL = "https://www.consentbit.com/pricing";

/** Percent off per plan, as auto-applied at checkout (BF20OFF / BF30OFF). */
export const BLACK_FRIDAY_PERCENT_OFF: Record<"free" | "basic" | "essential" | "growth", number> = {
  free: 0,
  basic: 20,
  essential: 20,
  growth: 30,
};

export function isBlackFridayActive(now: number = Date.now()): boolean {
  return now < OFFER_ENDS_AT;
}
