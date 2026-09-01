"use client";

export const runtime = 'edge';

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmEmailVerification, resendEmailVerification } from "@/lib/client-api";

type Status = "verifying" | "success" | "error";

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string>("");
  const [expired, setExpired] = useState(false);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  // Guard against double-invocation (React 18 StrictMode / re-renders) consuming the token twice.
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (!token) {
      setStatus("error");
      setMessage("This confirmation link is missing its token.");
      return;
    }

    (async () => {
      try {
        await confirmEmailVerification(token);
        setStatus("success");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "We couldn't confirm your email address.";
        // The worker flags an expired link separately so we can offer a resend
        // instead of a dead end.
        setExpired(/expired/i.test(msg));
        setMessage(msg);
        setStatus("error");
      }
    })();
  }, [token]);

  async function handleResend() {
    setResending(true);
    try {
      await resendEmailVerification();
      setResent(true);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Could not send a new link.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="w-full max-w-[460px] bg-white border border-[#EBEBEB] rounded-2xl px-8 py-10 text-center shadow-sm">
      {status === "verifying" && (
        <>
          <div className="mx-auto mb-5 h-10 w-10 rounded-full border-[3px] border-[#E5E7EB] border-t-[#6366F1] animate-spin" />
          <h1 className="text-lg font-semibold text-[#111827] mb-1">Confirming your email…</h1>
          <p className="text-sm text-[#6B7280]">This only takes a moment.</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="mx-auto mb-5 h-12 w-12 rounded-full bg-[#F0FDF4] flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-[#111827] mb-2">Email confirmed</h1>
          <p className="text-sm text-[#6B7280] mb-5">
            Thanks — your address is verified and you can now upgrade to a paid plan.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="w-full py-2.5 bg-[#6366F1] text-white text-sm font-medium rounded-md hover:bg-[#4F46E5] transition-colors"
          >
            Go to dashboard
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="mx-auto mb-5 h-12 w-12 rounded-full bg-[#FEF2F2] flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v5M12 16h.01" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9" stroke="#DC2626" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-[#111827] mb-2">Email not confirmed</h1>
          <p className="text-sm text-[#6B7280] mb-5">{resent ? "A new confirmation link is on its way — check your inbox." : message}</p>

          {/* Resend needs a session, so it only helps someone already signed in. */}
          {expired && !resent && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full mb-3 py-2.5 bg-[#6366F1] text-white text-sm font-medium rounded-md hover:bg-[#4F46E5] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {resending ? "Sending…" : "Send me a new link"}
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="w-full py-2.5 border border-[#E5E5E5] text-[#374151] text-sm font-medium rounded-md hover:bg-[#F9FAFB] transition-colors"
          >
            Go to dashboard
          </button>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="py-5 pt-12 px-4 flex justify-center w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/ConsentBit-logo-Dark.png" alt="ConsentBit" className="h-8" />
      </div>
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <Suspense fallback={null}>
          <VerifyEmailInner />
        </Suspense>
      </div>
    </div>
  );
}
