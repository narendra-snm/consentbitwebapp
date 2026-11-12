/**
 * Black Friday coupon ↔ plan rules, shared by every page with a coupon box.
 *
 * In Stripe each promotion code's coupon is restricted to one product set, so a code
 * applied to the wrong plan is rejected at checkout with Stripe's generic
 * "This coupon cannot be redeemed because it does not apply to anything in this order."
 * These helpers catch that before the request is sent, and turn Stripe's wording into a
 * message that says which code goes with which plan. Remove with the offer.
 */

export type PaidPlanId = 'basic' | 'essential' | 'growth';

const PLAN_LABEL: Record<PaidPlanId, string> = { basic: 'Basic', essential: 'Essential', growth: 'Growth' };

/** Customer-facing code → the plans its Stripe coupon is valid for. */
export const BLACK_FRIDAY_CODE_PLANS: Record<string, PaidPlanId[]> = {
  BF20OFF: ['basic', 'essential'],
  BF30OFF: ['growth'],
};

const CODE_GUIDE = 'BF20OFF is for Basic and Essential, BF30OFF is for Growth.';

function listPlans(plans: PaidPlanId[]): string {
  const names = plans.map(p => PLAN_LABEL[p]);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
}

/**
 * Message when a known Black Friday code is being used on a plan it does not cover;
 * null when the code is unknown (other promo) or fits the plan.
 */
export function couponPlanMismatch(code: string | null | undefined, planId: string | null | undefined): string | null {
  const key = String(code || '').trim().toUpperCase();
  const plans = BLACK_FRIDAY_CODE_PLANS[key];
  if (!plans || !planId || !(planId in PLAN_LABEL)) return null;
  if (plans.includes(planId as PaidPlanId)) return null;
  const otherCode = Object.keys(BLACK_FRIDAY_CODE_PLANS).find(c => BLACK_FRIDAY_CODE_PLANS[c].includes(planId as PaidPlanId));
  return `${key} applies to the ${listPlans(plans)} plan${plans.length > 1 ? 's' : ''} only.${otherCode ? ` Use ${otherCode} for ${PLAN_LABEL[planId as PaidPlanId]}.` : ''}`;
}

/** True for Stripe's "coupon does not apply to this order" rejection, in any of its wordings. */
export function isCouponScopeError(message: string | null | undefined): boolean {
  const m = String(message || '').toLowerCase();
  return m.includes('does not apply to anything in this order') || m.includes('cannot be redeemed');
}

/**
 * Turn a checkout error into the message to show. A plan-scope rejection becomes a
 * code→plan explanation; anything else is returned unchanged.
 */
export function friendlyCouponError(message: string, planId: string | null | undefined, code?: string | null): string {
  if (!isCouponScopeError(message)) return message;
  const specific = couponPlanMismatch(code, planId);
  if (specific) return specific;
  const plan = planId && planId in PLAN_LABEL ? PLAN_LABEL[planId as PaidPlanId] : 'this';
  return `This coupon does not apply to the ${plan} plan. ${CODE_GUIDE}`;
}
