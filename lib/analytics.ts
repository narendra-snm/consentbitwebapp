"use client";

import posthog from "posthog-js";
import { gaEvent, gaSetUserId, hashEmail, type GaParams } from "./ga";

// Maps the stored entry source to the canonical signup_source enum used in the
// PostHog funnel. entry_source is set when a user arrives from a marketplace;
// anything else (or unset) is treated as an organic website signup.
function resolveSignupSource(): "organic_website" | "webflow_marketplace" | "framer_marketplace" {
  if (typeof window === "undefined") return "organic_website";
  const raw = (sessionStorage.getItem("entry_source") || "").toLowerCase();
  if (raw.includes("webflow")) return "webflow_marketplace";
  if (raw.includes("framer")) return "framer_marketplace";
  return "organic_website";
}

export const analytics = {
  identify(email: string, name: string, orgId?: string | null) {
    posthog.identify(email, { email, name, platform: "webapp" });
    if (orgId) posthog.alias(orgId);
    // GA4 never receives the email itself — only its hash, as user_id. The
    // consent-manager worker derives the same hash for Measurement Protocol
    // events, so server-side steps land on the same GA4 user.
    hashEmail(email).then((hash) => {
      if (hash) gaSetUserId(hash);
    });
  },

  setSubscriptionStatus(status: string, planTier?: string | null) {
    posthog.setPersonProperties({
      subscription_status: status,
      ...(planTier ? { plan_tier: planTier } : {}),
    });
  },

  reset() {
    posthog.reset();
  },

  // Step 2 — fires on the Magic Link / Sign In form submit success.
  authEmailSubmitted(email: string, signupSource?: string) {
    const signup_source = signupSource || resolveSignupSource();
    posthog.capture("auth_email_submitted", {
      email,
      signup_source,
      platform: "webapp",
    });
    // GA4: no `email` — that would be PII.
    gaEvent("auth_email_submitted", { signup_source, platform: "webapp" });
  },

  // Step 3 — a new account was created (first successful entry into the app).
  userAccountCreated(email: string, name: string) {
    posthog.capture("user_account_created", {
      email,
      name,
      platform: "webapp",
    });
    gaEvent("user_account_created", { platform: "webapp" });
  },

  // Step 4 — user saved/submitted their website URL.
  domainSubmitted(domainUrl: string, siteId: string | null, plan: string) {
    posthog.capture("domain_submitted", {
      domain_url: domainUrl,
      site_id: siteId,
      plan_tier: plan,
      platform: "webapp",
    });
    gaEvent("domain_submitted", {
      domain_url: domainUrl,
      site_id: siteId,
      plan_tier: plan,
      platform: "webapp",
    });
  },

  // Step 6 — "Copy Script" clipboard button click.
  scriptCopied(domain: string, siteId?: string) {
    posthog.capture("script_copied", {
      domain,
      site_id: siteId,
      platform: "webapp",
    });
    gaEvent("script_copied", { domain, site_id: siteId, platform: "webapp" });
  },

  // Step 7 — retained for the in-app "verify" action. The authoritative,
  // cron-detected installation_verified is emitted from the consent-manager worker.
  installationVerified(
    domain: string,
    siteId?: string,
    secondsFromCopy?: number
  ) {
    posthog.capture("installation_verified", {
      domain,
      site_id: siteId,
      platform: "webapp",
      source: "webapp_manual",
      ...(secondsFromCopy !== undefined && {
        time_from_copy_to_verify_seconds: secondsFromCopy,
      }),
    });
    gaEvent("installation_verified", {
      domain,
      site_id: siteId,
      platform: "webapp",
      source: "webapp_manual",
      time_from_copy_to_verify_seconds: secondsFromCopy,
    });
  },

  // Step 8 — a plan card was selected in the dashboard pricing menu. `cycle` is
  // normalized to "monthly" | "annual"; `price` is the displayed monthly amount.
  planSelected(planId: string, cycle: string, price: number, siteId?: string) {
    posthog.capture("plan_selected", {
      plan_tier: planId,
      billing_cycle: cycle,
      plan_price: String(price),
      site_id: siteId,
      platform: "webapp",
    });
    gaEvent("plan_selected", {
      plan_tier: planId,
      billing_cycle: cycle,
      plan_price: String(price),
      site_id: siteId,
      platform: "webapp",
    });
  },

  // Step 9 — final "Proceed to checkout" / "Start Trial" click before Stripe.
  checkoutInitiated(planId: string, siteId?: string, cycle?: string) {
    posthog.capture("checkout_initiated", {
      plan_tier: planId,
      site_id: siteId,
      billing_cycle: cycle,
      platform: "webapp",
    });
    gaEvent("checkout_initiated", {
      plan_tier: planId,
      site_id: siteId,
      billing_cycle: cycle,
      platform: "webapp",
    });
  },

  // Step 11 — success / confirmation page mount.
  thankYouPageViewed(props: {
    site_id?: string;
    plan_tier?: string;
    billing_cycle?: string;
    domain?: string;
  }) {
    posthog.capture("thank_you_page_viewed", {
      ...props,
      platform: "webapp",
    });
    gaEvent("thank_you_page_viewed", {
      ...(props as GaParams),
      platform: "webapp",
    });
  },

  // --- Retained events (not part of the numbered funnel spec) ---

  bannerCustomized(siteId: string, domain?: string, bannerType?: string) {
    posthog.capture("banner_customized", {
      site_id: siteId,
      domain,
      banner_type: bannerType,
      platform: "webapp",
    });
    gaEvent("banner_customized", {
      site_id: siteId,
      domain,
      banner_type: bannerType,
      platform: "webapp",
    });
  },

  bannerPublished(siteId: string, domain?: string, bannerType?: string) {
    posthog.capture("banner_published", {
      site_id: siteId,
      domain,
      banner_type: bannerType,
      platform: "webapp",
    });
    gaEvent("banner_published", {
      site_id: siteId,
      domain,
      banner_type: bannerType,
      platform: "webapp",
    });
  },

  // Fires when a user clicks any upgrade / "get pro" CTA — intent signal that sits
  // between banner_published and checkout_initiated. `source` identifies which button.
  upgradeCtaClicked(source: string, siteId?: string, currentPlan?: string) {
    posthog.capture("upgrade_cta_clicked", {
      source,
      site_id: siteId,
      current_plan: currentPlan,
      platform: "webapp",
    });
    gaEvent("upgrade_cta_clicked", {
      source,
      site_id: siteId,
      current_plan: currentPlan,
      platform: "webapp",
    });
  },
};
