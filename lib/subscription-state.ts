/**
 * Account state for a site: ACTIVE / LAPSED / FREE.
 *
 * The codebase historically recognised only "paid" and "free", inferred from `planId`
 * alone. That misses a third state: **LAPSED** — the site exists and still carries its
 * old `planId`, but the subscription behind it is terminal (Stripe cancelled it after
 * exhausting dunning retries).
 *
 * Why it matters: a terminal Stripe subscription can never be updated or resumed —
 * "A canceled subscription can only update its cancellation_details and metadata."
 * Treating a lapsed account as paid routes the customer into the in-place tier-change
 * flow, which calls Stripe against a dead subscription and fails. They can never reach
 * the checkout path that would actually create a new subscription.
 *
 * See consent-manager/docs/SUBSCRIPTION_SYNC_WORKFLOW.md §3b.
 */

/** Stripe statuses from which a subscription can never recover. */
export const TERMINAL_STATUSES = new Set([
  "canceled",
  "cancelled",
  "deleted",
  "unpaid",
  "incomplete_expired",
]);

/**
 * Statuses that still entitle the customer to their plan.
 * `past_due` counts as entitled on purpose — they are inside dunning, not lapsed yet,
 * and Stripe can still recover the payment.
 */
export const ENTITLED_STATUSES = new Set(["active", "trialing", "past_due"]);

export type AccountState = "active" | "lapsed" | "free";

/** Reads the per-site subscription status sent by dashboard-init (snake and camel). */
export function readSubscriptionStatus(site: unknown): string | null {
  if (!site || typeof site !== "object") return null;
  const s = site as Record<string, unknown>;
  const raw = s.subscriptionStatus ?? s.subscription_status ?? s.status;
  if (raw == null) return null;
  const v = String(raw).trim().toLowerCase();
  return v || null;
}

/**
 * True when the subscription behind this site is terminal.
 *
 * Returns false when the status is unknown. Older worker builds do not send
 * `subscriptionStatus` on site rows, and in that case the safe reading is "not lapsed"
 * — it preserves the previous behaviour rather than locking a paying customer out of
 * their upgrade options on missing data.
 */
export function isLapsed(site: unknown): boolean {
  const status = readSubscriptionStatus(site);
  if (!status) return false;
  return TERMINAL_STATUSES.has(status);
}

/** True when a raw status string is one Stripe can never recover from. */
export function isTerminalStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return TERMINAL_STATUSES.has(String(status).trim().toLowerCase());
}

/**
 * True when this site should be treated as lapsed, accounting for the org-level fallback.
 *
 * `resolvePlanTierForSiteContext` falls back to the org's `effectivePlanId` whenever the
 * site row itself looks free and no other site in the org is paid. But
 * `getEffectivePlanForOrganization` returns *any* subscription when none is active, so a
 * lapsed org still reports a paid `effectivePlanId` from its cancelled subscription —
 * which makes a dead account look paid and routes it into the in-place tier change.
 *
 * This is derived from `sites` rather than a separate org field because dashboard-init
 * already includes a row per subscription — including "unassigned" rows for subscriptions
 * with no site — and each now carries its status. So `sites` is a complete view of the
 * org's subscriptions without any extra plumbing.
 *
 * The org is only consulted when the site has no subscription of its own, so a site with a
 * live subscription is never dragged down by an unrelated cancelled one.
 */
export function isLapsedInContext(site: unknown, sites: unknown[]): boolean {
  if (isLapsed(site)) return true;

  // The site has its own subscription — it decides, and it is not terminal.
  if (readSubscriptionStatus(site)) return false;

  const statuses = (sites ?? [])
    .map(readSubscriptionStatus)
    .filter((s): s is string => Boolean(s));

  // Any entitled subscription anywhere in the org means the org is not lapsed.
  if (statuses.some((s) => ENTITLED_STATUSES.has(s))) return false;

  return statuses.some((s) => TERMINAL_STATUSES.has(s));
}

/**
 * Resolve the account state for a site.
 *
 * `paidTier` is the tier already resolved from `planId` (via resolvePlanTierForSiteContext).
 * A lapsed subscription outranks it: the stale `planId` is what makes a dead account look
 * paid in the first place.
 */
export function resolveAccountState(site: unknown, paidTier: string): AccountState {
  if (isLapsed(site)) return "lapsed";
  return paidTier && paidTier !== "free" ? "active" : "free";
}

/**
 * Tier to use for *routing* decisions (checkout vs in-place change).
 *
 * A lapsed account must behave like `free` so the upgrade page sends it to checkout,
 * which creates a new subscription. Display code can still show the old tier — use
 * `resolveAccountState` for that, so the UI can say "your Basic plan ended" rather than
 * pretending the customer was never a customer.
 */
export function routingTierFor(site: unknown, paidTier: string): string {
  return isLapsed(site) ? "free" : paidTier;
}
