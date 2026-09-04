"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDashboardSession } from "../DashboardSessionProvider";
import { getMe } from "@/lib/client-api";

/**
 * Nudges code-login users to set a password.
 *
 * Someone who signed up (or was migrated) without a password can only ever get back
 * in by waiting for an emailed code. This asks once per login, until they either set
 * one or explicitly say no.
 */

/** Bumping the version re-asks everyone, should the copy or offer change. */
const DISMISS_PREFIX = "cb_set_password_prompt_v1:";

function dismissKey(email: string) {
  return `${DISMISS_PREFIX}${email}`;
}

/** Post-checkout / post-setup lands with these and PostSetupOverlay owns the screen. */
function inPostSetupFlow(): boolean {
  if (typeof window === "undefined") return false;
  const p = new URLSearchParams(window.location.search);
  return p.get("postSetup") === "1" || p.get("upgraded") === "1";
}

export default function SetPasswordPrompt() {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated, user } = useDashboardSession();
  const [open, setOpen] = useState(false);

  const email = String(user?.email || "").trim().toLowerCase();
  // Read from window rather than useSearchParams: that hook forces the whole subtree
  // into a Suspense boundary, and this only needs a one-shot value.
  const onSettings = (pathname || "").startsWith("/dashboard/profile");

  useEffect(() => {
    if (!authenticated || !email) return;
    // Don't stack on the install/upgrade overlay, and don't cover the very page that
    // holds the password field.
    if (onSettings || inPostSetupFlow()) return;

    // Answered "not now" on this browser before — don't ask this account again.
    try {
      if (localStorage.getItem(dismissKey(email))) return;
    } catch {
      // localStorage unavailable (private mode) — fall through and ask.
    }

    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        // hasPassword is only on /api/auth/me — dashboard-init does not carry it, so
        // the session context cannot answer this and we have to ask directly.
        if (!cancelled && me?.user?.hasPassword === false) setOpen(true);
      } catch {
        // A session we cannot read is not a reason to nag. Stay quiet.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticated, email, onSettings]);

  /** "Not now" — remembered, so this account is never asked again on this browser. */
  const dismissForGood = useCallback(() => {
    try {
      localStorage.setItem(dismissKey(email), String(Date.now()));
    } catch {
      // ignore
    }
    setOpen(false);
  }, [email]);

  /**
   * Sends them to the password field in Settings. Deliberately NOT remembered: if they
   * navigate away without finishing, the next login should ask again — and once a
   * password exists, hasPassword turns true and the check stops firing on its own.
   */
  const goToSettings = useCallback(() => {
    setOpen(false);
    router.push("/dashboard/profile");
  }, [router]);

  // Escape closes it the same way the "Not now" button does.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissForGood();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissForGood]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={dismissForGood}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cb-set-password-title"
        className="relative w-full max-w-[460px] rounded-[10px] bg-white shadow-xl"
      >
        <div className="rounded-t-[10px] bg-[#E6F1FD] px-7 py-6">
          <h2 id="cb-set-password-title" className="text-base font-semibold text-[#111827]">
            Set a password for faster sign-in
          </h2>
        </div>

        <div className="px-7 py-6">
          <p className="text-sm leading-6 text-[#4B5563]">
            You&apos;re signed in with an email code. Add a password and you can log in
            straight away next time, without waiting for a code to arrive.
          </p>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            Email codes keep working either way.
          </p>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={dismissForGood}
              className="rounded-md border border-[#E5E7EB] px-5 py-2.5 text-sm font-medium text-[#4B5563] transition-colors hover:bg-black/5"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={goToSettings}
              className="rounded-md bg-[#0777e6] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0668c9]"
            >
              Set a password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
