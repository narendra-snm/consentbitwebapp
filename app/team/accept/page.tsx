"use client";

export const runtime = 'edge';

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  acceptTeamInvite,
  getMe,
  getTeamInviteInfo,
  type TeamInviteInfo,
} from "@/lib/client-api";
import {
  clearPendingTeamInvite,
  savePendingTeamInvite,
} from "@/lib/pending-team-invite";

type Status = "loading" | "invalid" | "signed-out" | "mismatch" | "ready" | "accepting" | "accepted";

function clearDashboardCache() {
  try {
    sessionStorage.removeItem("cbSessionCache");
    sessionStorage.removeItem("dashboardInit");
  } catch { /* ignore */ }
}

function roleLabel(role?: string) {
  return role === "admin" ? "Admin" : "Editor";
}

function AcceptInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [invite, setInvite] = useState<TeamInviteInfo | null>(null);
  const [signedInEmail, setSignedInEmail] = useState("");

  const selfPath = `/team/accept?token=${encodeURIComponent(token)}`;

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setStatus("invalid");
      setMessage("This invitation link is missing its token.");
      return;
    }

    (async () => {
      try {
        const [info, me] = await Promise.all([
          getTeamInviteInfo(token),
          getMe().catch(() => ({ authenticated: false })),
        ]);
        if (cancelled) return;
        setInvite(info.invite);

        if (!me?.authenticated) {
          // Keep the token so signup (which always lands on /dashboard) can come back here.
          savePendingTeamInvite(token);
          setStatus("signed-out");
          return;
        }

        const email = String(me?.user?.email || "").trim().toLowerCase();
        setSignedInEmail(email);
        if (email !== String(info.invite.email).toLowerCase()) {
          clearPendingTeamInvite();
          setStatus("mismatch");
          return;
        }
        // Signed in with the right account: the dashboard no longer needs to bounce
        // them back here, whether or not they accept now.
        clearPendingTeamInvite();
        setStatus("ready");
      } catch (err: unknown) {
        if (cancelled) return;
        clearPendingTeamInvite();
        setMessage(err instanceof Error ? err.message : "This invitation is no longer valid.");
        setStatus("invalid");
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const accept = useCallback(async () => {
    setStatus("accepting");
    try {
      const res = await acceptTeamInvite(token);
      clearPendingTeamInvite();
      clearDashboardCache();
      setStatus("accepted");
      const first = res.siteIds?.[0];
      router.replace(first ? `/dashboard/${first}` : "/dashboard");
    } catch (err: unknown) {
      clearPendingTeamInvite();
      setMessage(err instanceof Error ? err.message : "We couldn't accept this invitation.");
      setStatus("invalid");
    }
  }, [router, token]);

  const switchAccount = useCallback(async () => {
    savePendingTeamInvite(token);
    clearDashboardCache();
    try {
      sessionStorage.removeItem("cbLastUserEmail");
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch { /* ignore */ }
    const email = invite?.email ? `&email=${encodeURIComponent(invite.email)}` : "";
    router.replace(`/login?next=${encodeURIComponent(selfPath)}${email}`);
  }, [invite?.email, router, selfPath, token]);

  const inviter = invite?.inviterName || invite?.inviterEmail || "A ConsentBit user";

  const details = invite && (
    <>
      <p className="text-[14px] text-[#6b7280] mb-4">
        <strong className="text-[#111827]">{inviter}</strong> invited{" "}
        <strong className="text-[#111827]">{invite.email}</strong> to join their team as{" "}
        <strong className="text-[#111827]">{roleLabel(invite.role)}</strong>.
      </p>
      {invite.sites.length > 0 && (
        <div className="text-left bg-[#f7f9fc] border border-[#ebebeb] rounded-[10px] px-4 py-3 mb-5">
          <p className="text-[12px] uppercase tracking-[0.3px] text-[#6b7280] mb-2">Access to</p>
          <ul className="space-y-1">
            {invite.sites.map((s, i) => (
              <li key={i} className="text-[13px] text-[#111827] truncate">{s.domain || s.name}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  return (
    <div className="w-full max-w-[460px] bg-white border border-[#EBEBEB] rounded-2xl px-8 py-10 text-center shadow-sm">
      {(status === "loading" || status === "accepting" || status === "accepted") && (
        <>
          <div className="mx-auto mb-5 h-10 w-10 rounded-full border-[3px] border-[#e6f1fd] border-t-[#007AFF] animate-spin" />
          <h1 className="text-lg font-semibold text-[#111827] mb-1">
            {status === "loading" ? "Checking invitation…" : "Joining team…"}
          </h1>
          <p className="text-sm text-[#6B7280]">Please wait a moment.</p>
        </>
      )}

      {status === "signed-out" && (
        <>
          <h1 className="text-lg font-semibold text-[#111827] mb-3">You&apos;re invited to ConsentBit</h1>
          {details}
          <p className="text-[13px] text-[#6b7280] mb-4">
            Log in or create an account with <strong className="text-[#111827]">{invite?.email}</strong> to accept.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/login?next=${encodeURIComponent(selfPath)}&email=${encodeURIComponent(invite?.email || "")}`)}
            className="w-full h-[42px] mb-2.5 bg-[#007AFF] text-white text-sm font-medium rounded-[8px] hover:bg-[#0069d9] transition-colors"
          >
            Log in to accept
          </button>
          <button
            type="button"
            onClick={() => router.push(`/signup?email=${encodeURIComponent(invite?.email || "")}`)}
            className="w-full h-[42px] border border-[#007AFF] text-[#007AFF] text-sm font-medium rounded-[8px] hover:bg-[#f5f9ff] transition-colors"
          >
            Create an account
          </button>
        </>
      )}

      {status === "ready" && (
        <>
          <h1 className="text-lg font-semibold text-[#111827] mb-3">Join the team</h1>
          {details}
          <button
            type="button"
            onClick={() => void accept()}
            className="w-full h-[42px] bg-[#007AFF] text-white text-sm font-medium rounded-[8px] hover:bg-[#0069d9] transition-colors"
          >
            Accept invitation
          </button>
        </>
      )}

      {status === "mismatch" && (
        <>
          <h1 className="text-lg font-semibold text-[#111827] mb-3">Different account signed in</h1>
          <p className="text-[14px] text-[#6b7280] mb-5">
            You&apos;re signed in as <strong className="text-[#111827]">{signedInEmail}</strong>, but this invitation
            is for <strong className="text-[#111827]">{invite?.email}</strong>. Log in with that email to accept it.
          </p>
          <button
            type="button"
            onClick={() => void switchAccount()}
            className="w-full h-[42px] mb-2.5 bg-[#007AFF] text-white text-sm font-medium rounded-[8px] hover:bg-[#0069d9] transition-colors"
          >
            Log out and switch account
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="w-full h-[42px] border border-[#E5E5E5] text-[#374151] text-sm font-medium rounded-[8px] hover:bg-[#F9FAFB] transition-colors"
          >
            Back to dashboard
          </button>
        </>
      )}

      {status === "invalid" && (
        <>
          <div className="mx-auto mb-5 h-12 w-12 rounded-full bg-[#FEF2F2] flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v5M12 16h.01" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9" stroke="#DC2626" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-[#111827] mb-2">Invitation not available</h1>
          <p className="text-sm text-[#6B7280] mb-5">{message}</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="w-full h-[42px] border border-[#E5E5E5] text-[#374151] text-sm font-medium rounded-[8px] hover:bg-[#F9FAFB] transition-colors"
          >
            Go to dashboard
          </button>
        </>
      )}
    </div>
  );
}

export default function TeamAcceptPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="py-5 pt-12 px-4 flex justify-center w-full">
        <img src="/images/ConsentBit-logo-Dark.png" alt="ConsentBit" className="h-8" />
      </div>
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <Suspense fallback={null}>
          <AcceptInner />
        </Suspense>
      </div>
    </div>
  );
}
