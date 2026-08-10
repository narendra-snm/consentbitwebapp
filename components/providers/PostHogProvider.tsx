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
      // Session replay is stated explicitly rather than inherited from `defaults`,
      // so recording behaviour does not change when that preset is bumped.
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "[data-ph-mask]",
      },
    });

    // The module-scoped instance is otherwise unreachable from DevTools, which
    // makes replay/capture issues impossible to diagnose in a deployed build.
    (window as unknown as { posthog: typeof posthog }).posthog = posthog;
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
