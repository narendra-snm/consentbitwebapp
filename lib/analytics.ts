"use client";

import posthog from "posthog-js";

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

  userLoggedIn(email: string) {
    posthog.capture("user_logged_in", {
      email,
      platform: "webapp",
      source: typeof window !== "undefined" ? (sessionStorage.getItem("entry_source") || "direct") : "direct",
    });
  },

  accountCreated(email: string, name: string) {
    posthog.capture("account_created", {
      email,
      name,
      platform: "webapp",
    });
  },

  // Step 4 — user saved/submitted their website URL.
  domainSubmitted(domainUrl: string, siteId: string | null, plan: string) {
    posthog.capture("domain_submitted", {
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
  },

  bannerCustomized(siteId: string, domain?: string, bannerType?: string) {
    posthog.capture("banner_customized", {
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
  },

  // Fires when a user clicks any upgrade / "get pro" CTA — intent signal that sits
  // between banner_published and paid_plan_activated. `source` identifies which button.
  upgradeCtaClicked(source: string, siteId?: string, currentPlan?: string) {
    posthog.capture("upgrade_cta_clicked", {
      source,
      site_id: siteId,
      current_plan: currentPlan,
      platform: "webapp",
    });
  },

  // A plan card was selected on a pricing / upgrade surface. `cycle` is normalized
  // to "monthly" | "annual"; `price` is the displayed monthly amount in dollars.
  planSelected(planId: string, cycle: string, price: number, siteId?: string) {
    posthog.capture("plan_selected", {
      plan_tier: planId,
      billing_cycle: cycle,
      price,
      site_id: siteId,
      platform: "webapp",
    });
  },

  // Fires immediately before a Stripe Checkout / subscription session is created.
  checkoutInitiated(planId: string, siteId?: string, cycle?: string) {
    posthog.capture("checkout_initiated", {
      plan_tier: planId,
      site_id: siteId,
      billing_cycle: cycle,
      platform: "webapp",
    });
  },

  // "Copy install code" button click in the setup wizard.
  installCodeCopied(domain: string, siteId?: string) {
    posthog.capture("install_code_copied", {
      domain,
      site_id: siteId,
      platform: "webapp",
    });
  },

  // A new domain/site was added to the account.
  domainAdded(domain: string, siteId: string | null, plan: string) {
    posthog.capture("domain_added", {
      domain,
      site_id: siteId,
      plan_tier: plan,
      platform: "webapp",
    });
  },

  // Post-checkout thank-you / confirmation page view.
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
  },
};
