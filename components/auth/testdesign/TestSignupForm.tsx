"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestVerificationCode, verifyVerificationCode } from "@/lib/client-api";
import { captureScanId, getScanId, clearScanId } from "@/lib/scan-handoff";
import { analytics } from "@/lib/analytics";
import AuthShell from "./AuthShell";
import AuthField from "./AuthField";
import AuthOtpInput from "./AuthOtpInput";
import { FONT_SANS, OPSZ } from "./fonts";
import {
  AuthError,
  AuthHelperText,
  AuthNotice,
  AuthSubmitButton,
  AuthTextButton,
} from "./AuthBits";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Verification code lifetime — keep in sync with the worker's OTP_TTL_MINUTES (default 10).
const CODE_TTL_SECONDS = 10 * 60;

// Survives a reload while a code is outstanding, so a refresh doesn't drop the user
// back to step 1 after the code has already been emailed.
const PENDING_KEY = "cb_signup_pending_otp";
const PENDING_MAX_AGE_MS = 15 * 60 * 1000;

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TestSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [verifyFailed, setVerifyFailed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [pendingOtp, setPendingOtp] = useState(false);
  const otpWrapRef = useRef<HTMLDivElement | null>(null);

  const urlWantsVerify = (searchParams.get("step") || "").toLowerCase() === "verify";

  useEffect(() => setHydrated(true), []);

  // Move any cookie-scan id handed off from the scanner page into sessionStorage.
  useEffect(() => {
    captureScanId();
  }, []);

  // Restore an outstanding code request after a reload.
  useEffect(() => {
    if (!hydrated) return;
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) {
        setPendingOtp(false);
        return;
      }
      const parsed = JSON.parse(raw) as { email?: string; name?: string; ts?: number };
      const ts = Number(parsed?.ts || 0);
      if (!ts || Date.now() - ts > PENDING_MAX_AGE_MS) {
        sessionStorage.removeItem(PENDING_KEY);
        setPendingOtp(false);
        return;
      }
      // Restore the countdown from when the code was actually sent.
      const elapsed = Math.floor((Date.now() - ts) / 1000);
      setSecondsLeft(Math.max(0, CODE_TTL_SECONDS - elapsed));
      setPendingOtp(true);
      if (parsed?.email) setEmail((cur) => cur || String(parsed.email));
      if (parsed?.name) setName((cur) => cur || String(parsed.name));
    } catch {
      setPendingOtp(false);
    }
  }, [hydrated]);

  const effectiveStep: 1 | 2 = urlWantsVerify || pendingOtp ? 2 : step;

  // Allow deep-link / refresh into the OTP step: /signup?step=verify&email=…
  useEffect(() => {
    if (!urlWantsVerify) return;
    const qpEmail = (searchParams.get("email") || "").trim();
    const qpName = (searchParams.get("name") || "").trim();
    if (qpEmail) setEmail((cur) => cur || qpEmail);
    if (qpName) setName((cur) => cur || qpName);
    setStep(2);
  }, [urlWantsVerify, searchParams]);

  // Tick the countdown down to zero once a code has been sent.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  // Make sure the code entry is visible on short viewports.
  useEffect(() => {
    if (effectiveStep !== 2) return;
    const id = window.setTimeout(() => {
      otpWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return () => window.clearTimeout(id);
  }, [effectiveStep]);

  function persistPending() {
    try {
      sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          ts: Date.now(),
        }),
      );
      setPendingOtp(true);
    } catch {}
  }

  async function handleResend() {
    if (loading || resending || (secondsLeft > 0 && !verifyFailed)) return;
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      await requestVerificationCode({ name, email, purpose: "signup" });
      persistPending();
      setSecondsLeft(CODE_TTL_SECONDS);
      setVerifyFailed(false);
      setCode("");
      setNotice(`A new verification code has been sent to ${email}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  function handleChangeDetails() {
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch {}
    setPendingOtp(false);
    setStep(1);
    setCode("");
    setError(null);
    setNotice(null);
    setVerifyFailed(false);
    setSecondsLeft(0);
    // Drop ?step=verify so effectiveStep can fall back to step 1.
    if (urlWantsVerify) router.replace("/signup");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation — no API call is made for invalid/empty input.
    if (effectiveStep === 1) {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }
      if (!email.trim()) {
        setError("Please enter your email address.");
        return;
      }
      if (!EMAIL_REGEX.test(email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }
      // Mirrors validatePasswordPolicy() in the worker, which is the authority — this
      // only spares the user a round-trip for the obvious cases.
      if (!password) {
        setError("Please choose a password.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        setError("Password must contain at least one letter and one number.");
        return;
      }
    } else if (code.replace(/\s/g, "").length < 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setError(null);
    setNotice(null);
    setLoading(true);
    // router.push()/replace() are fire-and-forget: they start the transition and
    // return immediately. Clearing `loading` afterwards would drop the button out
    // of its pending state while /dashboard (a force-dynamic route) is still
    // loading, leaving the UI looking idle for ~1s before the page swaps.
    // Only set for the step-2 branch — the step-1 replace() is a same-route URL
    // update, after which the form stays mounted and must become interactive again.
    let navigating = false;
    try {
      if (effectiveStep === 1) {
        await requestVerificationCode({
          name,
          email,
          purpose: "signup",
          password,
        });
        setSecondsLeft(CODE_TTL_SECONDS);
        setVerifyFailed(false);
        setStep(2);
        persistPending();
        // Drop the plaintext from component state now that the worker holds the hash.
        // A resend re-uses that pending hash server-side, so nothing needs it again.
        setPassword("");
        // Persist the step in the URL so the code screen survives a reload.
        router.replace(
          `/signup?step=verify&email=${encodeURIComponent(
            email.trim().toLowerCase(),
          )}&name=${encodeURIComponent(name.trim())}`,
        );
      } else {
        await verifyVerificationCode({
          email,
          purpose: "signup",
          code,
          scanId: getScanId(),
        });
        clearScanId();
        try {
          sessionStorage.removeItem(PENDING_KEY);
        } catch {}
        setPendingOtp(false);
        // Funnel order: auth_email_submitted (step 2) precedes user_account_created (step 3).
        analytics.authEmailSubmitted(email.trim().toLowerCase());
        analytics.userAccountCreated(email.trim().toLowerCase(), name.trim());
        analytics.identify(email.trim().toLowerCase(), name.trim());
        navigating = true;
        // replace, not push — a signed-up user pressing Back should not land
        // back on the signup screen.
        router.replace("/dashboard");
      }
    } catch (err: unknown) {
      if (effectiveStep === 2) setVerifyFailed(true);
      const msg =
        err instanceof Error
          ? err.message
          : effectiveStep === 1
          ? "Failed to send code. Please try again."
          : "Signup failed. Please try again.";

      if (effectiveStep === 1 && /already exists|log in instead/i.test(msg)) {
        setError("An account with this email already exists. Please log in instead.");
        return;
      }
      setError(msg);
    } finally {
      // Stay in the loading state through the route transition; this component
      // unmounts when it commits.
      if (!navigating) setLoading(false);
    }
  }

  return (
    <AuthShell
      headerPrompt="Already have an account?"
      headerLinkLabel="Log in"
      headerLinkHref="/login"
      title={effectiveStep === 1 ? "Create your account" : "Verify your email"}
      subtitle={
        effectiveStep === 1
          ? "Enter your basic information to get started."
          : `We sent a 6-digit code to ${email}.`
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {effectiveStep === 1 ? (
          <>
            <AuthField
              label="Name"
              value={name}
              onChange={(v) => {
                setName(v);
                setError(null);
              }}
              placeholder="Alex Morgan"
              disabled={loading}
              autoComplete="name"
              autoFocus
            />
            <AuthField
              label="Email ID"
              type="email"
              value={email}
              onChange={(v) => {
                setEmail(v);
                setError(null);
              }}
              placeholder="you@company.com"
              disabled={loading}
              autoComplete="email"
            />
            <AuthField
              label="Password"
              type="password"
              value={password}
              onChange={(v) => {
                setPassword(v);
                setError(null);
              }}
              disabled={loading}
              autoComplete="new-password"
              hint="At least 8 characters, including a letter and a number."
            />
          </>
        ) : (
          <div className="mb-[10px]" ref={otpWrapRef}>
            <span
              className="block text-[#202022] text-[16px] font-medium leading-7 mb-2"
              style={{ fontFamily: FONT_SANS, fontVariationSettings: OPSZ }}
            >
              Verification code
            </span>
            <AuthOtpInput
              value={code}
              onChange={(v) => {
                setCode(v);
                setError(null);
              }}
              disabled={loading}
              invalid={verifyFailed && !!error}
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {secondsLeft > 0 && !verifyFailed ? (
                <span
                  className="text-[#5f6a8f] text-[14px] leading-6"
                  style={{ fontFamily: FONT_SANS, fontVariationSettings: OPSZ }}
                >
                  Code expires in {formatTime(secondsLeft)}
                </span>
              ) : (
                <AuthTextButton onClick={handleResend} disabled={loading || resending}>
                  {resending
                    ? "Resending code…"
                    : verifyFailed
                    ? "Verification failed? Resend code"
                    : "Code expired? Resend code"}
                </AuthTextButton>
              )}
              <AuthTextButton onClick={handleChangeDetails} disabled={loading}>
                Change details
              </AuthTextButton>
            </div>
            <div className="mt-2">
              <AuthNotice message={notice} />
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="mb-9 lg:mb-[clamp(16px,4vh,36px)]">
          {/* Only mount the error row when there is one — an always-rendered
              wrapper reserved 12px of dead height on every screen. */}
          {error && (
            <div className="mb-3">
              <AuthError message={error} />
            </div>
          )}
          <AuthSubmitButton disabled={loading}>
            {loading
              ? effectiveStep === 1
                ? "Sending code…"
                : "Verifying…"
              : effectiveStep === 1
              ? "Send code"
              : "Verify & sign up"}
          </AuthSubmitButton>
        </div>

        <AuthHelperText>
          {effectiveStep === 1 ? (
            <>
              Create your account to get started with cookie<br className="hidden lg:inline" />
              {" "}consent management.
            </>
          ) : (
            <>
              Check your inbox — and your spam folder if it&apos;s<br className="hidden lg:inline" />
              {" "}not there.
            </>
          )}
        </AuthHelperText>
      </form>
    </AuthShell>
  );
}
