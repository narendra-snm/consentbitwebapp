

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestVerificationCode, verifyVerificationCode } from "@/lib/client-api";
import { captureScanId, getScanId, clearScanId } from "@/lib/scan-handoff";
import OtpInput from "./OtpInput";
import Toast from "./Toast";
import { analytics } from "@/lib/analytics";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Verification code lifetime — keep in sync with the worker's OTP_TTL_MINUTES (default 10).
const CODE_TTL_SECONDS = 10 * 60;

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  // Set when a code verification attempt fails — surfaces the resend option even while the countdown runs.
  const [verifyFailed, setVerifyFailed] = useState(false);

  // Move any cookie-scan id handed off from the scanner page into sessionStorage.
  useEffect(() => { captureScanId(); }, []);

  // Tick the countdown down to zero once a code has been sent.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft(s => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const handleResend = async () => {
    if (loading || resending || (secondsLeft > 0 && !verifyFailed)) return;
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      await requestVerificationCode({ email, purpose: 'login' });
      setSecondsLeft(CODE_TTL_SECONDS);
      setVerifyFailed(false);
      setCode('');
      setNotice(`A new verification code has been sent to ${email}.`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to resend code. Please try again.'
      );
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation — no API call made for invalid/empty inputs
    if (step === 1) {
      if (!email.trim()) {
        setError('Please enter your email address.');
        return;
      }
      if (!EMAIL_REGEX.test(email.trim())) {
        setError('Please enter a valid email address.');
        return;
      }
    } else {
      if (code.replace(/\s/g, '').length < 6) {
        setError('Please enter the 6-digit verification code.');
        return;
      }
    }

    setError(null);
    setLoading(true);
    // router.replace() is fire-and-forget: it starts the transition and returns
    // immediately. Clearing `loading` afterwards would drop the button out of its
    // pending state while /dashboard (a force-dynamic route) is still loading,
    // leaving the UI looking idle for ~1s before the page swaps.
    let navigating = false;
    try {
      if (step === 1) {
        await requestVerificationCode({ email, purpose: 'login' });
        setSecondsLeft(CODE_TTL_SECONDS);
        setVerifyFailed(false);
        setStep(2);
      } else {
        await verifyVerificationCode({ email, purpose: 'login', code, scanId: getScanId() });
        clearScanId();
        analytics.identify(email, '');
        analytics.authEmailSubmitted(email);
        navigating = true;
        // replace, not push — a logged-in user pressing Back should not land
        // back on the login screen.
        router.replace(nextPath);
      }
    } catch (err: unknown) {
      if (step === 2) setVerifyFailed(true);
      setError(
        err instanceof Error
          ? err.message
          : step === 1
          ? 'Failed to send code. Please try again.'
          : 'Invalid or expired code. Please try again.'
      );
    } finally {
      // Stay in the loading state through the route transition; this component
      // unmounts when it commits.
      if (!navigating) setLoading(false);
    }
  };

    
    return (

      <form onSubmit={handleSubmit} noValidate>
        <Toast message={error||"An error occurred. Please try again."} isVisible={!!error} onClose={() => setError(null)} />
        <div className="flex flex-col items-center w-full max-w-[463px]">
          {/* Title */}
          <h1 className="text-[40px] font-normal text-[#262E84] mb-6">
            Log In
          </h1>

          {/* Email Input */}
          <input
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null); }}
            disabled={loading || step === 2}
            className="w-full border text-lg border-gray-300 rounded-[9px] px-4 py-4 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#262E84] placeholder:text-[#262E84]"
          />

          {/* Helper Text */}
          <p className="text-sm text-[#262E84] text-center mt-5 mb-10">
            {step === 1
              ? 'Log in using the email you used for your initial app registration.'
              : `A verification code has been sent to ${email}. Please check your inbox.`}
          </p>

          {/* Verification Code */}
          {step === 2 && (
            <div className="mb-10 flex flex-col items-center">
              <OtpInput
                value={code}
                onChange={val => { setCode(val); setError(null); }}
                length={6}
                disabled={loading}
              />
              {notice && (
                <p className="text-sm text-green-600 text-center mt-4">{notice}</p>
              )}
              {secondsLeft > 0 && !verifyFailed ? (
                <p className="text-sm text-[#262E84] text-center mt-4">
                  Code expires in {formatTime(secondsLeft)}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || resending}
                  className="text-sm text-[#262E84] underline mt-4 disabled:opacity-60"
                >
                  {resending
                    ? 'Resending code…'
                    : verifyFailed
                    ? 'Verification failed? Resend code'
                    : 'Code expired? Resend code'}
                </button>
              )}
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#262E84] text-lg hover:bg-[#24347a] text-white py-6 rounded-md transition disabled:opacity-70"
          >
            {loading
              ? step === 1 ? 'Sending code…' : 'Verifying…'
              : step === 1 ? 'Login' : 'Verify & Login'}
          </button>

        {/* Footer Text */}
        {/* <p className="text-sm text-[#262E84] text-center mt-3">
          Please check your Email Inbox
        </p> */}
        <Link href="/signup" className="text-sm text-[#262E84] text-center mt-3">
         Sign Up?
        </Link>
        {/* <div className={`rounded-md border border-rose-200 bg-rose-50 px-3 py-2 mt-2 w-full text-sm text-rose-700 ${error ? 'visible' : 'invisible'}`}>
          {error || 'Placeholder for error message'}
        </div> */}
      </div>
      </form>
    )
}

