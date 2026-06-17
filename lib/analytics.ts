"use client";

import posthog from "posthog-js";

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
      signup_source: "organic",
    });
  },

  domainAdded(domain: string, siteId: string | null, plan: string) {
    posthog.capture("domain_added", {
      domain,
      site_id: siteId,
      plan_tier: plan,
      platform: "webapp",
    });
  },

  installCodeCopied(domain: string, siteId?: string) {
    posthog.capture("installation_code_copied", {
      domain,
      site_id: siteId,
      platform: "webapp",
    });
  },

  installationVerified(
    domain: string,
    siteId?: string,
    secondsFromCopy?: number
  ) {
    posthog.capture("installation_verified", {
      domain,
      site_id: siteId,
      platform: "webapp",
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
};
