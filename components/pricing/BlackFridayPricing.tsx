"use client";

import { useEffect, useState } from "react";
import styles from "./BlackFridayPricing.module.css";
import { OFFER_ENDS_AT, isBlackFridayActive } from "@/lib/blackFridayOffer";

/**
 * Black Friday pricing pieces shared by the dashboard upgrade page and the first-time
 * plan step (PricingTable). Ported from the Claude Design file "Pricing Black Friday.html"
 * (Black Friday pricing animation project). Remove with the offer.
 */

export { styles as bfStyles };

export function fmtPrice(v: number): string {
  return "$" + (Number.isInteger(v) ? String(v) : v.toFixed(2));
}

export function discountedPrice(base: number, percentOff: number): number {
  return +(base * (1 - percentOff / 100)).toFixed(2);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Dark pill: "Black Friday Up to 30% off" + live "Ends in" countdown. Gone after the offer. */
export function BlackFridayPromoPill() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((OFFER_ENDS_AT - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!isBlackFridayActive()) return null;

  let countdown = "--";
  if (secondsLeft != null) {
    const d = Math.floor(secondsLeft / 86400);
    const h = Math.floor((secondsLeft % 86400) / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    const s = secondsLeft % 60;
    countdown = `${pad(d)}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  }

  return (
    <div className={styles.promo} role="status" aria-label={`Black Friday, up to 30% off. Ends in ${countdown}`}>
      <div className={styles.promoT}>
        Black Friday <strong>Up to 30% off</strong>
      </div>
      <div className={styles.cd}>
        <small>Ends in</small>
        <span>{countdown}</span>
      </div>
    </div>
  );
}

export type BillingPeriod = "monthly" | "yearly";

/** MONTHLY / YEARLY pill toggle with the sliding dark knob. */
export function BillingToggle({
  value,
  onChange,
  yearlyLabel = "YEARLY",
}: {
  value: BillingPeriod;
  onChange: (next: BillingPeriod) => void;
  yearlyLabel?: string;
}) {
  return (
    <div className={styles.tog}>
      <div className={`${styles.knob} ${value === "yearly" ? styles.knobY : ""}`} aria-hidden="true" />
      <button
        type="button"
        className={value === "monthly" ? styles.on : undefined}
        aria-pressed={value === "monthly"}
        onClick={() => onChange("monthly")}
      >
        MONTHLY
      </button>
      <button
        type="button"
        className={value === "yearly" ? styles.on : undefined}
        aria-pressed={value === "yearly"}
        onClick={() => onChange("yearly")}
      >
        {yearlyLabel}
      </button>
    </div>
  );
}

export function TrialPill({ children = "For all plans 14 days trial is available" }: { children?: React.ReactNode }) {
  return <div className={styles.trial}>{children}</div>;
}

/**
 * Old price struck through, new price counting down from the old one, "% OFF" stamp.
 * `percentOff` 0 renders the plain price (blank old-price row keeps columns aligned).
 * The animation replays whenever `animKey` changes (pass the billing period).
 * `index` staggers the columns (0 = first plan).
 */
export function PlanPrice({
  base,
  percentOff,
  index,
  animKey,
}: {
  base: number;
  percentOff: number;
  index: number;
  animKey: string;
}) {
  const target = percentOff > 0 ? discountedPrice(base, percentOff) : base;
  const [shown, setShown] = useState(target);
  const [hit, setHit] = useState(false);
  const delaySeconds = 0.35 + index * 0.25;

  useEffect(() => {
    if (percentOff <= 0 || target === base) {
      setShown(target);
      setHit(false);
      return;
    }
    const reduced =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(target);
      setHit(false);
      return;
    }
    setShown(base);
    setHit(false);
    let raf = 0;
    let settle: ReturnType<typeof setTimeout> | null = null;
    const start = setTimeout(() => {
      setHit(true);
      const t0 = performance.now();
      const dur = 900;
      const frame = (t: number) => {
        const k = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        setShown(k < 1 ? Math.round(base + (target - base) * e) : target);
        if (k < 1) raf = requestAnimationFrame(frame);
        else settle = setTimeout(() => setHit(false), 500);
      };
      raf = requestAnimationFrame(frame);
    }, (delaySeconds + 0.4) * 1000);
    return () => {
      clearTimeout(start);
      cancelAnimationFrame(raf);
      if (settle) clearTimeout(settle);
    };
  }, [base, target, percentOff, delaySeconds, animKey]);

  return (
    <div key={animKey} className={styles.run} style={{ "--d": `${delaySeconds}s` } as React.CSSProperties}>
      <div className={styles.oldrow}>
        <div className={`${styles.old} ${percentOff > 0 ? "" : styles.nos}`}>
          {percentOff > 0 ? fmtPrice(base) : " "}
        </div>
        {percentOff > 0 && (
          <div className={styles.stamp} aria-label={`${percentOff} percent off`}>
            {percentOff}%<span>OFF</span>
          </div>
        )}
      </div>
      <div className={styles.price}>
        <span className={`${styles.n} ${hit ? styles.hit : ""}`}>{fmtPrice(shown)}</span>
        <small>/month</small>
      </div>
    </div>
  );
}
