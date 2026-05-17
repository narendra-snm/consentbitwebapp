"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init("phc_pACPAPjdZRJRopr5EkE4AEHMwS9qqYdQC4pvEVMYdLzJ", {
      api_host: "https://us.i.posthog.com",
      defaults: "2026-01-30",
      persistence: "localStorage",
      capture_pageview: true,
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
