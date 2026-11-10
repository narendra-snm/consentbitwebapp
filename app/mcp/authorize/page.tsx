"use client";

export const runtime = 'edge';

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  answerMcpAuthRequest,
  getMcpAuthRequest,
  getMe,
  setMcpAccessEnabled,
  type McpAuthRequestInfo,
} from "@/lib/client-api";

// An AI client (ChatGPT, Claude, Cursor …) asked to connect to this ConsentBit
// account. consentbit-mcp's /authorize sends the browser here with a nonce; the
// owner allows or denies, and we follow the redirect back to the MCP server.

type Status = "loading" | "invalid" | "off" | "ready" | "working" | "done";

const ACCESS_LINES = [
  "See your sites, plans and whether each cookie banner is live",
  "See compliance settings and the latest cookie scan",
  "See consent totals (counts only, never visitor data)",
];

function AuthorizeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const nonce = params.get("nonce") || "";

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [info, setInfo] = useState<McpAuthRequestInfo["request"] | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!nonce) {
      setStatus("invalid");
      setMessage("This link is missing its request id. Start the connection again from your AI client.");
      return;
    }
    (async () => {
      const me = await getMe().catch(() => ({ authenticated: false } as any));
      if (cancelled) return;
      if (!me?.authenticated) {
        router.replace(`/login?next=${encodeURIComponent(`/mcp/authorize?nonce=${nonce}`)}`);
        return;
      }
      setEmail(String(me?.user?.email || ""));
      try {
        const res = await getMcpAuthRequest(nonce);
        if (cancelled) return;
        setInfo(res.request);
        setStatus(res.enabled ? "ready" : "off");
      } catch (err: unknown) {
        if (cancelled) return;
        setMessage(err instanceof Error ? err.message : "This connection request is no longer valid.");
        setStatus("invalid");
      }
    })();
    return () => { cancelled = true; };
  }, [nonce, router]);

  const turnOn = useCallback(async () => {
    setStatus("working");
    try {
      await setMcpAccessEnabled(true);
      setStatus("ready");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Could not turn on MCP access.");
      setStatus("invalid");
    }
  }, []);

  const answer = useCallback(async (decision: "allow" | "deny") => {
    setStatus("working");
    try {
      const res = await answerMcpAuthRequest(nonce, decision);
      setStatus("done");
      // Full navigation: the MCP server finishes OAuth and returns to the AI client.
      window.location.replace(res.redirectTo);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Something went wrong. Start again from your AI client.");
      setStatus("invalid");
    }
  }, [nonce]);

  const clientName = info?.clientName || "An AI client";

  return (
    <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center px-4">
      <div className="bg-white border border-[#ebebeb] rounded-[12px] shadow-sm max-w-[460px] w-full p-7 text-center">
        <p className="text-[12px] uppercase tracking-[0.3px] text-[#6b7280] mb-2">ConsentBit MCP</p>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-8 h-8 rounded-full border-[3px] border-[#007AFF] border-t-transparent animate-spin" />
            <p className="text-[14px] text-[#6b7280]">Loading…</p>
          </div>
        )}

        {status === "invalid" && (
          <>
            <p className="font-semibold text-[18px] text-[#111827] mb-2">Can&apos;t connect</p>
            <p className="text-[14px] text-[#6b7280] mb-5">{message}</p>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="h-[40px] px-5 rounded-[8px] border border-[#e5e5e5] text-[#374151] text-[14px] hover:bg-[#f9fafb]"
            >
              Go to dashboard
            </button>
          </>
        )}

        {status === "off" && (
          <>
            <p className="font-semibold text-[18px] text-[#111827] mb-2">Turn on MCP access?</p>
            <p className="text-[14px] text-[#6b7280] mb-5">
              <strong className="text-[#111827]">{clientName}</strong> wants to connect, but MCP access is off for this
              account. Turn it on to continue. You can turn it off any time in Profile → MCP access.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => answer("deny")}
                className="flex-1 h-[40px] rounded-[8px] border border-[#e5e5e5] text-[#374151] text-[14px] hover:bg-[#f9fafb]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={turnOn}
                className="flex-1 h-[40px] rounded-[8px] bg-[#007aff] text-white text-[14px] hover:bg-[#0069d9]"
              >
                Turn on
              </button>
            </div>
          </>
        )}

        {(status === "ready" || status === "working" || status === "done") && info && (
          <>
            <p className="font-semibold text-[18px] text-[#111827] mb-2">
              {clientName} wants to access your ConsentBit account
            </p>
            {email && <p className="text-[13px] text-[#6b7280] mb-4">Signed in as {email}</p>}
            <div className="text-left bg-[#f7f9fc] border border-[#ebebeb] rounded-[10px] px-4 py-3 mb-5">
              <p className="text-[12px] uppercase tracking-[0.3px] text-[#6b7280] mb-2">It will be able to (read only)</p>
              <ul className="space-y-1.5">
                {ACCESS_LINES.map((l) => (
                  <li key={l} className="text-[14px] text-[#111827]">• {l}</li>
                ))}
              </ul>
              <p className="text-[12px] text-[#6b7280] mt-3">It cannot change your banner, billing or team.</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={status !== "ready"}
                onClick={() => answer("deny")}
                className="flex-1 h-[40px] rounded-[8px] border border-[#e5e5e5] text-[#374151] text-[14px] hover:bg-[#f9fafb] disabled:opacity-50"
              >
                Deny
              </button>
              <button
                type="button"
                disabled={status !== "ready"}
                onClick={() => answer("allow")}
                className="flex-1 h-[40px] rounded-[8px] bg-[#007aff] text-white text-[14px] hover:bg-[#0069d9] disabled:opacity-50"
              >
                {status === "ready" ? "Allow" : "Connecting…"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function McpAuthorizePage() {
  return (
    <Suspense fallback={null}>
      <AuthorizeInner />
    </Suspense>
  );
}
