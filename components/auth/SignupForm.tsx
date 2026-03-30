

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestVerificationCode, verifyVerificationCode } from "@/lib/client-api";
import OtpInput from "./OtpInput";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const otpWrapRef = useRef<HTMLDivElement | null>(null);
  const urlWantsVerify = (searchParams?.get("step") || "").toLowerCase() === "verify";
  const effectiveStep: 1 | 2 = urlWantsVerify ? 2 : step;

  // Allow deep-link / refresh into OTP step: /signup?step=verify&email=...
  useEffect(() => {
    const sp = searchParams;
    if (!sp) return;
    const wantsVerify = (sp.get("step") || "").toLowerCase() === "verify";
    const qpEmail = (sp.get("email") || "").trim();
    const qpName = (sp.get("name") || "").trim();
    if (wantsVerify) {
      if (qpEmail && !email) setEmail(qpEmail);
      if (qpName && !name) setName(qpName);
      setStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (effectiveStep !== 2) return;
    // Ensure the OTP UI is visible even on small viewports
    window.setTimeout(() => {
      otpWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }, [effectiveStep]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      console.debug('[SignupForm] submit', { effectiveStep, emailPresent: Boolean(email), namePresent: Boolean(name) });
    } catch {}

    // Client-side validation — no API call made for invalid/empty inputs
    if (effectiveStep === 1) {
      if (!name.trim()) {
        setError('Please enter your name.');
        return;
      }
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
    try {
      if (effectiveStep === 1) {
        await requestVerificationCode({ name, email, purpose: 'signup' });
        try {
          console.debug('[SignupForm] request-code ok, switching to step=verify');
        } catch {}
        setStep(2);
        // Persist step in URL so the OTP screen reliably shows (even after reload)
        router.replace(`/signup?step=verify&email=${encodeURIComponent(email.trim().toLowerCase())}&name=${encodeURIComponent(name.trim())}`);
      } else {
        await verifyVerificationCode({ email, purpose: 'signup', code });
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : effectiveStep === 1
          ? 'Failed to send code. Please try again.'
          : 'Signup failed. Please try again.';

      // If the email already exists, send them to login (common confusion).
      if (effectiveStep === 1 && /already exists|log in instead/i.test(msg)) {
        router.push(`/login?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <div className="flex flex-col items-center w-full max-w-[463px] mx-auto">
        {/* Title */}
        <h1 className="text-[40px] font-normal text-[#2C3E8F] mb-6">
          Sign Up
        </h1>

        {/* Name Input */}
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={e => { setName(e.target.value); setError(null); }}
          disabled={loading || effectiveStep === 2}
          className="w-full border text-lg mb-10 border-gray-300 rounded-[9px] px-4 py-4 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#262E84] placeholder:text-[#262E84]"
        />

        {/* Email Input */}
        <input
          type="email"
          placeholder="Email ID"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(null); }}
          disabled={loading || effectiveStep === 2}
          className="w-full border mb-10 text-lg border-gray-300 rounded-[9px] px-4 py-4 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#262E84] placeholder:text-[#262E84]"
        />

        {/* Helper Text */}
        <p className="text-sm text-[#262E84] text-center mb-10">
          {effectiveStep === 1
            ? '*Please use the exact mail as the webflow native app/iframe native app'
            : `A verification code has been sent to ${email}. Please check your inbox.`}
        </p>

        {/* Verification Code */}
        {effectiveStep === 2 && (
          <div ref={otpWrapRef} className="mb-10">
            <OtpInput
              value={code}
              onChange={val => { setCode(val); setError(null); }}
              length={6}
              disabled={loading}
            />
          </div>
        )}

        {/* Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#262E84] hover:bg-[#24347a] text-white py-6 rounded-md transition disabled:opacity-70"
        >
          {loading
            ? effectiveStep === 1 ? 'Sending code…' : 'Verifying…'
            : effectiveStep === 1 ? 'Send code' : 'Verify & Sign Up'}
        </button>

        {/* Error — min-h reserves space so nothing shifts when error appears */}
        <div className="w-full mt-3 min-h-[40px]">
          {error && (
            <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        <Link href="/login" className="text-sm text-[#262E84] text-center mt-1">
          Login?
        </Link>
      </div>
    </form>
  );
}

