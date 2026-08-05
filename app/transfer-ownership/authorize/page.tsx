"use client";

export const runtime = 'edge';

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authorizeOwnershipTransfer } from "@/lib/client-api";

type Status = "verifying" | "success" | "error";

function AuthorizeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string>("");
  const [newOwner, setNewOwner] = useState<{ email: string; name: string } | null>(null);
  // Guard against double-invocation (React 18 StrictMode / re-renders) consuming the token twice.
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (!token) {
      setStatus("error");
      setMessage("This authorization link is missing its token.");
      return;
    }

    (async () => {
      try {
        const res = await authorizeOwnershipTransfer(token);
        setNewOwner(res?.newOwner || null);
        setStatus("success");
      } catch (err: unknown) {
        setMessage(err instanceof Error ? err.message : "We couldn't complete the ownership transfer.");
        setStatus("error");
      }
    })();
  }, [token]);

  return (
    <div className="w-full max-w-[460px] bg-white border border-[#EBEBEB] rounded-2xl px-8 py-10 text-center shadow-sm">
      {status === "verifying" && (
        <>
          <div className="mx-auto mb-5 h-10 w-10 rounded-full border-[3px] border-[#E5E7EB] border-t-[#6366F1] animate-spin" />
          <h1 className="text-lg font-semibold text-[#111827] mb-1">Authorizing transfer…</h1>
          <p className="text-sm text-[#6B7280]">Please wait while we verify your authorization link.</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="mx-auto mb-5 h-12 w-12 rounded-full bg-[#F0FDF4] flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-[#111827] mb-2">Ownership transferred</h1>
          <p className="text-sm text-[#6B7280] mb-5">
            This account now belongs to{" "}
            <strong className="text-[#111827]">{newOwner?.name || newOwner?.email || "the new owner"}</strong>
            {newOwner?.email ? <> (<span className="text-[#6B7280]">{newOwner.email}</span>)</> : null}.
            You have been signed out of this account. The new owner can log in with their email.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full py-2.5 bg-[#6366F1] text-white text-sm font-medium rounded-md hover:bg-[#4F46E5] transition-colors"
          >
            Go to login
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
          <h1 className="text-lg font-semibold text-[#111827] mb-2">Transfer not completed</h1>
          <p className="text-sm text-[#6B7280] mb-5">{message}</p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full py-2.5 border border-[#E5E5E5] text-[#374151] text-sm font-medium rounded-md hover:bg-[#F9FAFB] transition-colors"
          >
            Back to login
          </button>
        </>
      )}
    </div>
  );
}

export default function TransferOwnershipAuthorizePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="py-5 pt-12 px-4 flex justify-center w-full">
        <img src="/images/ConsentBit-logo-Dark.png" alt="ConsentBit" className="h-8" />
      </div>
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <Suspense fallback={null}>
          <AuthorizeInner />
        </Suspense>
      </div>
    </div>
  );
}
