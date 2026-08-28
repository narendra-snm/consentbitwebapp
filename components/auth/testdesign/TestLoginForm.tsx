"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  requestVerificationCode,
  verifyVerificationCode,
  login,
  PasswordNotSetError,
} from "@/lib/client-api";
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

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TestLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  // "otp" stays the default: every existing account can use it, whereas a password only
  // exists for accounts created since passwords were introduced or set from Settings.
  const [method, setMethod] = useState<"otp" | "password">("otp");
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  // Set when a code verification attempt fails — surfaces the resend option
  // even while the countdown is still running.
  const [verifyFailed, setVerifyFailed] = useState(false);

  // Move any cookie-scan id handed off from the scanner page into sessionStorage.
  useEffect(() => {
    captureScanId();
  }, []);

  // Prefill from ?email= (the signup screen redirects here when an account exists).
  useEffect(() => {
    const qpEmail = (searchParams.get("email") || "").trim();
    if (qpEmail) setEmail(qpEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick the countdown down to zero once a code has been sent.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  async function handleResend() {
    if (loading || resending || (secondsLeft > 0 && !verifyFailed)) return;
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      await requestVerificationCode({ email, purpose: "login" });
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

  function handleChangeEmail() {
    setStep(1);
    setCode("");
    setError(null);
    setNotice(null);
    setVerifyFailed(false);
    setSecondsLeft(0);
  }

  /** Switch between password and email-code sign-in, keeping the typed email. */
  function switchMethod(next: "otp" | "password", message?: string) {
    setMethod(next);
    setStep(1);
    setCode("");
    setPassword("");
    setError(null);
    setNotice(message ?? null);
    setVerifyFailed(false);
    setSecondsLeft(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation — no API call is made for invalid/empty input.
    // Email is required by both methods; the second factor differs.
    if (method === "password" || step === 1) {
      if (!email.trim()) {
        setError("Please enter your email address.");
        return;
      }
      if (!EMAIL_REGEX.test(email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }
    }
    if (method === "password") {
      if (!password) {
        setError("Please enter your password.");
        return;
      }
    } else if (step === 2 && code.replace(/\s/g, "").length < 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setError(null);
    setNotice(null);
    setLoading(true);
    // router.replace() is fire-and-forget: it starts the transition and returns
    // immediately. Clearing `loading` afterwards would drop the button out of its
    // pending state while /dashboard (a force-dynamic route) is still loading,
    // leaving the UI looking idle for ~1s before the page swaps.
    let navigating = false;
    try {
      if (method === "password") {
        await login(email, password);
        analytics.identify(email.trim().toLowerCase(), "");
        analytics.authEmailSubmitted(email.trim().toLowerCase());
        navigating = true;
        router.replace(nextPath);
      } else if (step === 1) {
        await requestVerificationCode({ email, purpose: "login" });
        setSecondsLeft(CODE_TTL_SECONDS);
        setVerifyFailed(false);
        setStep(2);
      } else {
        await verifyVerificationCode({
          email,
          purpose: "login",
          code,
          scanId: getScanId(),
        });
        clearScanId();
        analytics.identify(email.trim().toLowerCase(), "");
        analytics.authEmailSubmitted(email.trim().toLowerCase());
        navigating = true;
        // replace, not push — a logged-in user pressing Back should not land
        // back on the login screen.
        router.replace(nextPath);
      }
    } catch (err: unknown) {
      // The account exists but predates passwords (OTP signup, Webflow/Framer, a
      // migration). Drop the user into the code flow rather than leaving them stuck on a
      // password they never set.
      if (err instanceof PasswordNotSetError) {
        switchMethod("otp", err.message);
        setLoading(false);
        return;
      }
      if (method === "otp" && step === 2) setVerifyFailed(true);
      setError(
        err instanceof Error
          ? err.message
          : method === "password"
          ? "Could not log you in. Please check your details and try again."
          : step === 1
          ? "Failed to send code. Please try again."
          : "Invalid or expired code. Please try again.",
      );
    } finally {
      // Stay in the loading state through the route transition; this component
      // unmounts when it commits.
      if (!navigating) setLoading(false);
    }
  }

  return (
    <AuthShell
      headerPrompt="Don't have an account?"
      headerLinkLabel="Sign up"
      headerLinkHref="/signup"
      title={
        method === "password" || step === 1 ? "Log in to your account" : "Enter your code"
      }
      subtitle={
        method === "password"
          ? "Enter your email and password."
          : step === 1
          ? "Enter your email and we'll send you a verification code."
          : `We sent a 6-digit code to ${email}.`
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {method === "password" ? (
          <>
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
              autoFocus
              invalid={!!error}
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
              autoComplete="current-password"
              invalid={!!error}
            />
            {notice && (
              <div className="-mt-2 mb-4">
                <AuthNotice message={notice} />
              </div>
            )}
          </>
        ) : step === 1 ? (
          <>
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
              autoFocus
              invalid={!!error}
            />
            {/* Carries the "this account has no password yet" hand-off from the
                password form, which otherwise has nowhere to surface on step 1. */}
            {notice && (
              <div className="-mt-2 mb-4">
                <AuthNotice message={notice} />
              </div>
            )}
          </>
        ) : (
          <div className="mb-[10px]">
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
              <AuthTextButton onClick={handleChangeEmail} disabled={loading}>
                Use a different email
              </AuthTextButton>
            </div>
            <div className="mt-2">
              <AuthNotice message={notice} />
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="mt-[10px] mb-[28px] lg:mb-[clamp(14px,3.1vh,28px)]">
          {/* Only mount the error row when there is one — an always-rendered
              wrapper reserved 12px of dead height on every screen. */}
          {error && (
            <div className="mb-3">
              <AuthError message={error} />
            </div>
          )}
          <AuthSubmitButton disabled={loading}>
            {method === "password"
              ? loading
                ? "Logging in…"
                : "Log in"
              : loading
              ? step === 1
                ? "Sending code…"
                : "Verifying…"
              : step === 1
              ? "Send code"
              : "Verify & log in"}
          </AuthSubmitButton>

          {/* Method switch. Hidden once a code is in flight — jumping away mid-OTP
              would silently discard the code the user is already holding. */}
          {(method === "password" || step === 1) && (
            <div className="mt-4 text-center">
              <AuthTextButton
                onClick={() =>
                  switchMethod(method === "password" ? "otp" : "password")
                }
                disabled={loading}
              >
                {method === "password"
                  ? "Log in with an email code instead"
                  : "Log in with a password instead"}
              </AuthTextButton>
            </div>
          )}
        </div>

        <AuthHelperText>
          {method === "password" ? (
            <>
              Forgot your password? Log in with an email code,<br className="hidden lg:inline" />
              {" "}then set a new one in Account Settings.
            </>
          ) : step === 1 ? (
            <>
              Log in using the email you used for your initial<br className="hidden lg:inline" />
              {" "}app registration.
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
