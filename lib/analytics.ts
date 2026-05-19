"use client";

import posthog from "posthog-js";

export const analytics = {
  identify(email: string, name: string) {
    posthog.identify(email, { email, name, platform: "webapp" });
  },

  reset() {
    posthog.reset();
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
};
