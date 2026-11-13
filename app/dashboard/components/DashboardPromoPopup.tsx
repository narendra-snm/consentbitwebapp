"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardSession } from "../DashboardSessionProvider";

/**
 * Black Friday promo popup — shown once per login on the dashboard.
 *
 * Ported from the Claude Design file "Dashboard Popup.html" (Black Friday pricing
 * animation project): dimmed overlay that fades in, a 720px card that slides and scales
 * up with a periodic shine sweep, a translucent round X, and two invisible hit areas laid
 * over the artwork — the coupon ticket copies BF30OFF and shows a "Code copied" toast,
 * "Claim your offer" goes to the active site's upgrade page. After closing, a small
 * "Black Friday offer" pill in the bottom-right corner reopens it.
 *
 * Artwork: /asset/dashboard popup.jpg (1280×905, same as the design's bf-popup.png — the
 * hit-area percentages below are relative to that frame). Seen-state is kept in
 * sessionStorage per account and cleared by the logout handler in
 * DashboardSessionProvider, so the next login in the same tab shows it again.
 * Remove with the offer (see lib/blackFridayCoupons.ts).
 */

/** Stripe promo codes expire at this instant; the popup hides itself from then on. */
const OFFER_ENDS_AT = Date.UTC(2026, 10, 17, 18, 30, 0);

/** Bump the version to re-show the popup to everyone. Logout clears keys with this prefix (DashboardSessionProvider). */
const PROMO_POPUP_SEEN_PREFIX = "cb_dashboard_promo_popup_v1:";

const IMAGE_SRC = "/asset/dashboard%20popup.jpg";
const PROMO_CODE = "BF30OFF";
/** Design opens the popup 600ms after the page settles. */
const OPEN_DELAY_MS = 600;
const TOAST_MS = 1400;

function seenKey(email: string) {
  return `${PROMO_POPUP_SEEN_PREFIX}${email}`;
}

/** Post-checkout / post-setup lands with these and PostSetupOverlay owns the screen. */
function inPostSetupFlow(): boolean {
  if (typeof window === "undefined") return false;
  const p = new URLSearchParams(window.location.search);
  return p.get("postSetup") === "1" || p.get("upgraded") === "1";
}

export default function DashboardPromoPopup() {
  const router = useRouter();
  const { authenticated, user, activeSiteId } = useDashboardSession();
  /** Eligible = logged in, offer still running, not in the post-setup flow. */
  const [eligible, setEligible] = useState(false);
  /** Mounted keeps the overlay in the DOM while `on` drives the CSS transitions. */
  const [mounted, setMounted] = useState(false);
  const [on, setOn] = useState(false);
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const email = String(user?.email || "").trim().toLowerCase();

  const openPopup = useCallback(() => {
    setMounted(true);
    // Next frame so the enter transition runs from the hidden state.
    requestAnimationFrame(() => setOn(true));
  }, []);

  const closePopup = useCallback(() => {
    setOn(false);
    setTimeout(() => setMounted(false), 300);
  }, []);

  useEffect(() => {
    if (!authenticated || !email) return;
    if (Date.now() >= OFFER_ENDS_AT) return;
    if (inPostSetupFlow()) return;
    setEligible(true);

    try {
      if (sessionStorage.getItem(seenKey(email))) return;
      // Mark as seen immediately: a route change before the user closes it must not
      // re-open it, and "once per login" means once, not once per page.
      sessionStorage.setItem(seenKey(email), String(Date.now()));
    } catch {
      // sessionStorage unavailable — show it anyway; worst case it repeats.
    }
    const t = setTimeout(openPopup, OPEN_DELAY_MS);
    return () => clearTimeout(t);
  }, [authenticated, email, openPopup]);

  const copyCode = useCallback(() => {
    try {
      navigator.clipboard?.writeText(PROMO_CODE).catch(() => {});
    } catch {
      // Clipboard blocked — the code is still readable on the artwork.
    }
    setToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), TOAST_MS);
  }, []);

  const claim = useCallback(() => {
    closePopup();
    router.push(activeSiteId ? `/dashboard/${activeSiteId}/upgrade` : "/dashboard");
  }, [router, activeSiteId, closePopup]);

  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopup();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on, closePopup]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  if (!eligible) return null;

  return (
    <>
      <style>{`
        .cbbf-ov{position:fixed;inset:0;z-index:9998;background:rgba(2,6,23,.55);display:grid;place-items:center;padding:24px;opacity:0;pointer-events:none;transition:opacity .25s cubic-bezier(.4,0,.2,1)}
        .cbbf-ov.on{opacity:1;pointer-events:auto}
        .cbbf-pop{position:relative;width:min(720px,100%);border-radius:20px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.5);transform:translateY(24px) scale(.94);opacity:0;transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .3s}
        .cbbf-ov.on .cbbf-pop{transform:none;opacity:1}
        .cbbf-pop img{display:block;width:100%;height:auto;user-select:none}
        .cbbf-pop:after{content:"";position:absolute;top:0;bottom:0;width:30%;left:-40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.12),transparent);animation:cbbf-sw 4s 1s cubic-bezier(.4,0,.2,1) infinite;pointer-events:none}
        @keyframes cbbf-sw{0%{left:-40%}40%,100%{left:120%}}
        .cbbf-x{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;font:400 22px/1 var(--font-dm-sans),"DM Sans",sans-serif;cursor:pointer;z-index:2;transition:background .12s;display:flex;align-items:center;justify-content:center;padding:0}
        .cbbf-x:hover{background:rgba(255,255,255,.25)}
        .cbbf-hit{position:absolute;border:0;background:none;cursor:pointer;border-radius:50px;z-index:2;padding:0}
        .cbbf-hit:focus-visible,.cbbf-x:focus-visible{outline:2px solid rgba(255,255,255,.8);outline-offset:2px}
        .cbbf-cta{left:35.5%;top:80.5%;width:29%;height:10%}
        .cbbf-code{left:56%;top:42.5%;width:39%;height:31%;border-radius:20px}
        .cbbf-toast{position:absolute;left:75.5%;top:78%;transform:translate(-50%,6px);background:#fff;color:#0B0B1A;font:600 13px/1 var(--font-dm-sans),"DM Sans",sans-serif;padding:8px 12px;border-radius:50px;opacity:0;transition:all .18s cubic-bezier(.4,0,.2,1);z-index:3;pointer-events:none;white-space:nowrap}
        .cbbf-toast.on{opacity:1;transform:translate(-50%,0)}
        .cbbf-reopen{position:fixed;right:24px;bottom:24px;z-index:9997;background:#0B0B1A;color:#fff;border:0;border-radius:50px;padding:12px 18px;font:600 14px var(--font-dm-sans),"DM Sans",sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.25)}
        .cbbf-reopen:hover{background:#1a1a2e}
        @media (prefers-reduced-motion:reduce){.cbbf-pop:after{animation:none}.cbbf-ov,.cbbf-pop,.cbbf-toast{transition:none}}
      `}</style>

      {mounted && (
        <div
          className={`cbbf-ov${on ? " on" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Black Friday offer"
          onClick={closePopup}
        >
          <div className="cbbf-pop" onClick={(e) => e.stopPropagation()}>
            {/* Plain <img>: static asset on the Cloudflare edge, where next/image optimisation is unavailable. */}
            <img
              src={IMAGE_SRC}
              alt="Up to 30% off – Black Friday 2026. Your code BF30OFF. Claim your offer"
              draggable={false}
            />
            <button type="button" className="cbbf-x" aria-label="Close" onClick={closePopup}>
              ×
            </button>
            <button
              type="button"
              className="cbbf-hit cbbf-code"
              aria-label={`Copy code ${PROMO_CODE}`}
              onClick={copyCode}
            />
            <button
              type="button"
              className="cbbf-hit cbbf-cta"
              aria-label="Claim your offer"
              onClick={claim}
            />
            <div className={`cbbf-toast${toast ? " on" : ""}`} aria-live="polite">
              Code copied
            </div>
          </div>
        </div>
      )}

      {!mounted && (
        <button type="button" className="cbbf-reopen" onClick={openPopup}>
          Black Friday offer
        </button>
      )}
    </>
  );
}
