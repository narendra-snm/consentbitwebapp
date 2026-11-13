"use client";

import Link from "next/link";
import localFont from "next/font/local";
import styles from "./BlackFridayBar.module.css";
import { isBlackFridayActive } from "@/lib/blackFridayOffer";
import { analytics } from "@/lib/analytics";

/**
 * Black Friday banner — a 60px lime strip with the headline set in Anton, each letter
 * rolling up into view and back out on a 4s loop, a light sweep, and a "Claim Offer"
 * button (same as the plugin top-bar design). Used above the login / signup screens
 * (→ marketing pricing page) and at the top of the dashboard (→ the site's upgrade page).
 *
 * Ported from the Claude Design file "Login.html" (Black Friday pricing animation
 * project). Self-hides once the offer ends (lib/blackFridayOffer.ts). Remove this folder
 * and the `banner` props / DashboardBlackFridayBar mount with the offer.
 */

// Anton — latin only (OFL, from @fontsource/anton 5.3.0). Self-hosted so the pages make
// no third-party font request.
const anton = localFont({
  src: "./anton-latin-400-normal.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
});

const WORDS = ["Black", "Friday", "Sale", "Upto", "30% Off"];

export default function BlackFridayBar({
  claimHref,
  claimLabel = "Claim Offer →",
  source,
  siteId,
  currentPlan,
}: {
  /** Absolute URL (rendered as a plain link) or an in-app path (rendered with next/link). */
  claimHref: string;
  claimLabel?: string;
  /**
   * PostHog `source` for the upgrade_cta_clicked event, e.g. "black_friday_login_bar".
   * One value per placement so the bars can be compared in the upgrade funnel.
   */
  source: string;
  /** Dashboard placement only — the active site and its plan, for the same event. */
  siteId?: string;
  currentPlan?: string;
}) {
  if (!isBlackFridayActive()) return null;

  const external = /^https?:\/\//i.test(claimHref);
  // Same upgrade_cta_clicked event the header / popup CTAs send. On login / signup the
  // visitor is still anonymous, so PostHog keys it on the device id and merges it into
  // the person once they identify.
  const trackClaim = () => analytics.upgradeCtaClicked(source, siteId, currentPlan);
  let i = 0;
  return (
    <div className={styles.bar} role="region" aria-label="Black Friday sale">
      <div className={styles.inner}>
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
        {external ? (
          // Marketing site opens in a new tab so the login / signup form stays put.
          <a href={claimHref} className={styles.cta} target="_blank" rel="noopener noreferrer" onClick={trackClaim}>
            {claimLabel}
          </a>
        ) : (
          <Link href={claimHref} className={styles.cta} onClick={trackClaim}>
            {claimLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
