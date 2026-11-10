"use client";

import { useEffect, useState } from "react";
import {
  disconnectMcpClient,
  getMcpAccess,
  setMcpAccessEnabled,
  type McpConnection,
} from "@/lib/client-api";

// The ConsentBit MCP server AI clients connect to (test worker; mcp.consentbit.com once
// it goes to production). Keep in step with consentbit-mcp's /mcp route.
const MCP_SERVER_URL = "https://consentbit-mcp.web-8fb.workers.dev/mcp";

const FEATURES = [
  "Check banner and compliance status",
  "Run cookie scans and review results",
  "See consent totals (counts only, never visitor data)",
  "Manage all your sites in one place",
];

function fmtDate(raw: string | null) {
  if (!raw) return "-";
  const d = new Date(raw);
  return Number.isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function McpAccessPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [connections, setConnections] = useState<McpConnection[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<McpConnection | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getMcpAccess()
      .then((r) => {
        setEnabled(r.enabled);
        setConnections(r.connections || []);
      })
      .catch((err) => setError(err?.message || "Failed to load MCP access"))
      .finally(() => setLoading(false));
  }, []);

  async function onToggle() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const r = await setMcpAccessEnabled(!enabled);
      setEnabled(r.enabled);
      setConnections(r.connections || []);
    } catch (err: any) {
      setError(err?.message || "Failed to update MCP access");
    } finally {
      setSaving(false);
    }
  }

  async function onDisconnect(conn: McpConnection) {
    setSaving(true);
    setError(null);
    try {
      const r = await disconnectMcpClient(conn.id);
      setConnections(r.connections || []);
      setConfirmDisconnect(null);
    } catch (err: any) {
      setError(err?.message || "Failed to disconnect");
    } finally {
      setSaving(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(MCP_SERVER_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-left">
        <div className="w-5 h-5 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin" />
        <p className="text-sm text-[#6b7280]">Loading MCP access…</p>
      </div>
    );
  }

  return (
    <div className="max-w-[860px] text-left">
      <p className="font-semibold text-[20px] text-[#111827]">MCP access</p>
      <p className="text-[15px] text-[#4b5563] mt-1 mb-5">
        Let AI assistants like ChatGPT, Claude and Cursor work with your ConsentBit account through the ConsentBit MCP server.
      </p>

      {/* On/off switch */}
      <div className="bg-[#fbfbfb] border border-[#ebebeb] rounded-[10px] px-5 py-5 mb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-semibold text-[16px] text-[#111827]">Enable OAuth-based access</p>
            <p className="text-[14px] text-[#4b5563] mt-1">
              Allow trusted AI clients to securely access your data through ConsentBit MCP. Turning this off blocks every connected client.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Enable OAuth-based access"
            onClick={onToggle}
            disabled={saving}
            className={`relative shrink-0 w-[44px] h-[24px] rounded-full transition-colors disabled:opacity-60 ${enabled ? "bg-[#007aff]" : "bg-[#d1d5db]"}`}
          >
            <span
              className={`absolute top-[2px] left-[2px] size-[20px] rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-[20px]" : ""}`}
            />
          </button>
        </div>

        {enabled && (
          <div className="mt-5">
            <p className="text-[14px] text-[#111827] mb-2">Server URL — paste this into your AI client:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 h-[40px] flex items-center px-3 rounded-[8px] border border-[#d1d5db] bg-white text-[14px] text-[#111827] truncate">
                {MCP_SERVER_URL}
              </code>
              <button
                type="button"
                onClick={copyUrl}
                className="h-[40px] px-4 rounded-[8px] border border-[#007aff] text-[#007aff] text-[13px] hover:bg-[#f5f9ff] transition-colors"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[14px] text-red-600 mb-4">{error}</p>}

      {/* Connected clients */}
      <p className="font-semibold text-[18px] text-[#111827] mb-3">Connectors</p>
      {connections.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-[10px] px-6 py-10 text-center">
          <div className="mx-auto mb-4 size-[56px] rounded-full bg-[#f3f4f6] flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.17 7.44L12 12.55L20.77 7.47M12 21.61V12.54" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9.93 2.48L4.59 5.44C3.38 6.11 2.39 7.79 2.39 9.17V14.82C2.39 16.2 3.38 17.88 4.59 18.55L9.93 21.52C11.07 22.15 12.94 22.15 14.08 21.52L19.42 18.55C20.63 17.88 21.62 16.2 21.62 14.82V9.17C21.62 7.79 20.63 6.11 19.42 5.44L14.08 2.47C12.93 1.84 11.07 1.84 9.93 2.48Z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="font-semibold text-[16px] text-[#111827]">Connect to ConsentBit MCP</p>
          <p className="text-[14px] text-[#4b5563] mt-1 mb-4">
            {enabled
              ? "Add the server URL above in your AI client, then sign in with your ConsentBit account."
              : "Turn on OAuth-based access above to connect an AI client."}
          </p>
          <ul className="inline-block text-left space-y-1.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-[14px] text-[#4b5563]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5 22 22 17.5 22 12S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z" stroke="#6b7280" strokeWidth="1.5" />
                  <path d="M7.75 12L10.58 14.83L16.25 9.17" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-[10px] overflow-hidden">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_120px] gap-4 px-4 py-3 border-b border-[#e5e7eb] text-[13px] font-medium text-[#6b7280]">
            <span>Client</span>
            <span>Access</span>
            <span>Connected</span>
            <span>Last used</span>
            <span />
          </div>
          {connections.map((c) => (
            <div key={c.id} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_120px] gap-4 px-4 py-3 border-b last:border-b-0 border-[#f3f4f6] text-[14px] text-[#111827] items-center">
              <span className="truncate">{c.clientName}</span>
              <span className="truncate">{c.scopes.includes("write") ? "Read & write" : "Read only"}</span>
              <span>{fmtDate(c.createdAt)}</span>
              <span>{fmtDate(c.lastUsedAt)}</span>
              <span className="text-right">
                <button
                  type="button"
                  onClick={() => setConfirmDisconnect(c)}
                  className="h-[30px] px-3 rounded-[6px] border border-[#fca5a5] text-[#dc2626] text-[12px] hover:bg-[#fef2f2]"
                >
                  Disconnect
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {confirmDisconnect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] shadow-xl max-w-md w-full p-6">
            <p className="font-semibold text-[16px] text-black mb-1">Disconnect {confirmDisconnect.clientName}?</p>
            <p className="text-[13px] text-[#6b7280] mb-5">
              This client loses access to your ConsentBit account right away. You can connect it again later.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDisconnect(null)}
                disabled={saving}
                className="flex-1 h-[38px] rounded-[8px] border border-[#e5e5e5] text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onDisconnect(confirmDisconnect)}
                disabled={saving}
                className="flex-1 h-[38px] rounded-[8px] bg-[#dc2626] text-white text-[13px] font-medium hover:bg-[#b91c1c] disabled:opacity-50"
              >
                {saving ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
