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

/**
 * For a cancelled subscription still inside its paid period, the date it stops.
 * Otherwise null.
 *
 * Mirrors the rule used by both the dashboard (`getSubscriptionsBySiteIds`, which keeps a
 * cancelled subscription's plan until `currentPeriodEnd`) and the banner gate (cdnM.js,
 * which serves until the same date). `deleted` never qualifies — it is blocked outright.
 *
 * This affects the *message* only. Routing still goes to checkout, because Stripe will not
 * let a cancelled subscription be changed in place even while its period runs.
 */
export function activeUntil(site: unknown): Date | null {
  if (!site || typeof site !== "object") return null;
  const status = readSubscriptionStatus(site);
  if (status !== "canceled" && status !== "cancelled") return null;
  const s = site as Record<string, unknown>;
  const raw = s.subscriptionCurrentPeriodEnd ?? s.subscription_current_period_end ?? s.currentPeriodEnd;
  if (raw == null) return null;
  // Rows mix ISO strings and SQLite datetimes ("2026-09-25 21:12:39") — normalise first.
  const ms = Date.parse(String(raw).replace(" ", "T"));
  return Number.isFinite(ms) && ms > Date.now() ? new Date(ms) : null;
}

/** True when a raw status string is one Stripe can never recover from. */
export function isTerminalStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return TERMINAL_STATUSES.has(String(status).trim().toLowerCase());
}

/**
 * True when the paid period has actually LAPSED — the plan is over, not merely on its way out.
 *
 * `cancelAtPeriodEnd` alone cannot answer this. The worker forces it true whenever the
 * status is 'canceled' (see handlers/webflowBilling.js's idempotent-cancel reconcile), so
 * it can't tell "ends on <date>" from "ended on <date>"; and it is never set for the
 * 'deleted' status that syncEvent.js writes. Hence: terminal status OR a scheduled
 * cancellation, AND a period end already in the past.
 *
 * Both halves matter — an active subscription whose period date has just passed is
 * mid-renewal, not ended, and a cancelled one still inside its paid period keeps its plan
 * until the date. An unparseable/missing date reads as "not ended", which preserves the
 * previous behaviour on missing data.
 *
 * Must stay in step with subscriptionHasEnded in the Designer app
 * (Consentbit-Webflow-App-New -Design/src/lib/subscriptionState.js) and with
 * TERMINAL_SUBSCRIPTION_STATUSES in consent-manager/src/utils/subscriptionStatus.js.
 */
export function subscriptionHasEnded(input: {
  status?: string | null;
  cancelAtPeriodEnd?: boolean | number | null;
  currentPeriodEnd?: string | Date | null;
} | null | undefined): boolean {
  if (!input) return false;
  const raw = input.currentPeriodEnd;
  if (raw == null) return false;
  // Rows mix ISO strings and SQLite datetimes ("2026-09-25 21:12:39") — normalise first.
  const ms = raw instanceof Date ? raw.getTime() : Date.parse(String(raw).replace(" ", "T"));
  if (!Number.isFinite(ms)) return false;
  const scheduled = Boolean(input.cancelAtPeriodEnd) || Number(input.cancelAtPeriodEnd) === 1;
  return (isTerminalStatus(input.status) || scheduled) && ms <= Date.now();
}

/**
 * `subscriptionHasEnded` for a dashboard-init site row.
 *
 * Those rows carry the subscription under their own field names
 * (`subscriptionStatus` / `subscriptionCurrentPeriodEnd` / `subscriptionCancelAtPeriodEnd`,
 * see authDashboardInit.js), so callers don't have to remember the mapping — and can't
 * drift apart by each remembering it differently.
 *
 * A site that never had a subscription reads false: no status and no end date means
 * nothing has ended, so a genuinely Free site is not mistaken for a lapsed one.
 */
export function siteSubscriptionHasEnded(site: unknown): boolean {
  if (!site || typeof site !== "object") return false;
  const s = site as Record<string, unknown>;
  return subscriptionHasEnded({
    status: readSubscriptionStatus(site),
    cancelAtPeriodEnd: (s.subscriptionCancelAtPeriodEnd ??
      s.subscription_cancel_at_period_end ??
      s.cancelAtPeriodEnd ??
      s.cancel_at_period_end ??
      null) as boolean | number | null,
    currentPeriodEnd: (s.subscriptionCurrentPeriodEnd ??
      s.subscription_current_period_end ??
      s.currentPeriodEnd ??
      null) as string | null,
  });
}

/**
 * True when this site should be treated as lapsed.
 *
 * Checked **per site**. Subscriptions are per-site licences, so a customer can have one
 * site cancelled and another active; neither may affect the other.
 *
 *  1. The site has its own subscription → its own status decides, full stop. An active
 *     subscription on another site can never rescue a cancelled one, and a cancelled site
 *     can never drag down an active one.
 *
 *  2. The site has no subscription of its own → only relevant if its tier was *inherited*.
 *     `resolvePlanTierForSiteContext` falls back to the org's `effectivePlanId` in that case,
 *     and `getEffectivePlanForOrganization` returns ANY subscription when none is active —
 *     so a site can inherit "basic" from a cancelled subscription. That happens notably when
 *     the subscription's `siteId` points at a deleted site: it appears in no row of `sites`,
 *     yet still drives `effectivePlanId`. So ask about the subscription behind the
 *     inheritance directly, via `effectivePlanStatus`.
 *
 *  3. The site has no subscription and inherited nothing (`previousTier` is free) → not
 *     lapsed. It never had a plan, so it must not be told one "has ended".
 *
 * An earlier version derived case 2 from the statuses in `sites`. That was wrong twice:
 * it flagged never-subscribed sites as lapsed whenever another site in the org was
 * cancelled, and it could not see subscriptions with a dangling `siteId` at all.
 *
 * Unknown status anywhere reads as "not lapsed", preserving prior behaviour on missing data.
 */
export function isLapsedInContext(
  site: unknown,
  previousTier: string,
  effectivePlanStatus: string | null | undefined,
): boolean {
  // 1. Own subscription decides.
  if (isLapsed(site)) return true;
  if (readSubscriptionStatus(site)) return false;

  // 3. Nothing inherited — never had a plan, nothing to have lapsed.
  if (!previousTier || previousTier === "free") return false;

  // 2. Tier inherited from the org: lapsed only if the subscription behind it is dead.
  return isTerminalStatus(effectivePlanStatus);
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
