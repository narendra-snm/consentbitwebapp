"use client";

import { useEffect, useState } from "react";
import localFont from "next/font/local";
import styles from "./AuthBlackFridayBar.module.css";

/**
 * Black Friday banner shown above the login page.
 *
 * Ported from the Claude Design file "Login.html" (Black Friday pricing animation
 * project): a 60px lime strip with the headline set in Anton, each letter rolling up
 * into view and back out on a 4s loop, a light sweep across the strip, and a round
 * dismiss button on the right. Dismissing collapses the strip and remembers that for
 * the rest of the browser session.
 *
 * Self-hides once the offer ends. OFFER_ENDS_AT matches the Stripe promo expiry in
 * consent-manager src/services/blackFridayOffer.js (BF20OFF / BF30OFF). Remove this
 * file, its CSS module and assets/anton-latin-400-normal.woff2 with the offer, plus the
 * `banner` prop passed from TestLoginForm.
 */

// Anton — latin only (OFL, from @fontsource/anton 5.3.0). Self-hosted so the login page
// makes no third-party font request.
const anton = localFont({
  src: "./assets/anton-latin-400-normal.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
});

const OFFER_ENDS_AT = Date.UTC(2026, 10, 30, 18, 29, 0);
const WORDS = ["Black", "Friday", "Sale", "Upto", "30% Off"];
/** Bump the version to show the banner again to people who dismissed it. */
const DISMISSED_KEY = "cb_login_bf_bar_dismissed_v1";

type BarState = "shown" | "closing" | "hidden";

export default function AuthBlackFridayBar() {
  // Rendered on the server so the first paint already matches the design; the
  // dismissed check needs sessionStorage, so it runs after mount.
  const [state, setState] = useState<BarState>(() =>
    Date.now() >= OFFER_ENDS_AT ? "hidden" : "shown",
  );

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISSED_KEY)) setState("hidden");
    } catch {
      // sessionStorage unavailable — keep showing it.
    }
  }, []);

  if (state === "hidden") return null;

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setState("closing");
  }

  let i = 0;
  return (
    <div
      className={`${styles.bar} ${state === "closing" ? styles.gone : ""}`}
      role="region"
      aria-label="Black Friday sale"
      onTransitionEnd={() => {
        if (state === "closing") setState("hidden");
      }}
    >
      <p className={`${anton.className} ${styles.text}`} aria-label="Black Friday sale, up to 30% off">
        {WORDS.map((word) => (
          <span key={word} className={styles.word} aria-hidden="true">
            {[...word].map((ch, k) => (
              <span key={k} style={{ "--i": i++ } as React.CSSProperties}>
                {ch === " " ? " " : ch}
              </span>
            ))}
          </span>
        ))}
      </p>
      <button type="button" className={styles.close} aria-label="Dismiss" onClick={dismiss}>
        ×
      </button>
    </div>
  );
}
