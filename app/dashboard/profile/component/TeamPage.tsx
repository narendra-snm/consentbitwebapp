"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getTeam,
  inviteTeamMember,
  updateTeamMember,
  removeTeamMember,
  resendTeamInvite,
  TeamApiError,
  type TeamMember,
  type TeamOverview,
  type TeamRole,
  type TeamSite,
} from "@/lib/client-api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS: { value: TeamRole; label: string; description: string }[] = [
  {
    value: "admin",
    label: "Admin",
    description: "Can edit site name and URL, invite and remove members, and has all Editor permissions",
  },
  {
    value: "editor",
    label: "Editor",
    description: "Can manage cookie banner, cookie scan, consent logs and consent settings",
  },
];

function roleLabel(role: string) {
  return role === "admin" ? "Admin" : role === "editor" ? "Editor" : "Account Owner";
}

function planLabel(planId: string | null) {
  const v = String(planId || "free").toLowerCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function seatsLabel(site: TeamSite) {
  return site.cap === null ? `${site.used} members · unlimited` : `${site.used}/${site.cap} members`;
}

function siteDisplay(site: TeamSite | undefined, fallbackId: string) {
  return site?.domain || site?.name || fallbackId;
}

// ─── Shared modal chrome (matches the Transfer Ownership modal) ──────────────

function Modal({ children, onClose, disabled }: { children: React.ReactNode; onClose: () => void; disabled?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[12px] shadow-xl max-w-[520px] w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          aria-label="Close"
          className="absolute right-4 top-4 text-[#9ca3af] hover:text-[#374151] text-2xl leading-none"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

// ─── Invite / edit form ──────────────────────────────────────────────────────

type MemberFormProps = {
  mode: "invite" | "edit";
  team: TeamOverview;
  member?: TeamMember;
  organizationId: string;
  onOrganizationChange?: (id: string) => void;
  onClose: () => void;
  onDone: (result: { inviteLink?: string; email?: string }) => void;
};

function MemberForm({ mode, team, member, organizationId, onOrganizationChange, onClose, onDone }: MemberFormProps) {
  const [email, setEmail] = useState(member?.email ?? "");
  const [role, setRole] = useState<TeamRole | "">(member?.role ?? "");
  const [siteIds, setSiteIds] = useState<string[]>(member?.siteIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = EMAIL_REGEX.test(email.trim());
  const original = useMemo(() => new Set(member?.siteIds ?? []), [member]);

  const siteIsFull = (site: TeamSite) =>
    site.cap !== null && site.used >= site.cap && !original.has(site.id);

  const toggleSite = (id: string) => {
    setError(null);
    setSiteIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const allSelectable = team.sites.filter((s) => !siteIsFull(s)).map((s) => s.id);
  const allSelected = allSelectable.length > 0 && allSelectable.every((id) => siteIds.includes(id));

  const canSubmit = !saving && !!role && siteIds.length > 0 && (mode === "edit" || emailValid);

  const submit = async () => {
    if (!canSubmit || !role) return;
    setSaving(true);
    setError(null);
    try {
      if (mode === "invite") {
        const res = await inviteTeamMember({ organizationId, email, role, siteIds });
        onDone({ inviteLink: res.inviteLink, email: email.trim().toLowerCase() });
      } else if (member) {
        await updateTeamMember({ memberId: member.id, role, siteIds });
        onDone({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} disabled={saving}>
      <p className="font-semibold text-[18px] text-[#111827] mb-1">
        {mode === "invite" ? "Invite new user" : "Edit member access"}
      </p>
      <p className="text-[13px] text-[#6b7280] mb-4">
        {mode === "invite"
          ? "The invited user will only have access to the sites you select."
          : `Change what ${member?.email} can see and do.`}
      </p>

      {mode === "invite" && (
        <div className="flex items-center gap-2.5 bg-[#e6f1fd] border border-[#cadbee] rounded-[8px] px-3.5 py-2.5 mb-5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <circle cx="12" cy="12" r="9" stroke="#007AFF" strokeWidth="1.8" />
            <path d="M12 11v5M12 8h.01" stroke="#007AFF" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <p className="text-[13px] text-[#111827]">The user will receive an email with instructions to join your team.</p>
        </div>
      )}

      <div className="space-y-4 mb-5">
        {mode === "invite" && team.organizations.length > 1 && onOrganizationChange && (
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Organization <span className="text-red-600">*</span>
            </label>
            <select
              value={organizationId}
              onChange={(e) => onOrganizationChange(e.target.value)}
              disabled={saving}
              className="w-full h-[42px] border border-[#e5e5e5] rounded-[8px] px-3 text-[13px] text-black bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]"
            >
              {team.organizations.map((o) => (
                <option key={o.organizationId} value={o.organizationId}>
                  {o.name || "Organization"} {o.role === "admin" ? "(Admin)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sites */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[13px] font-medium text-[#374151]">
              Sites <span className="text-red-600">*</span>
            </label>
            {team.sites.length > 1 && (
              <button
                type="button"
                disabled={saving || allSelectable.length === 0}
                onClick={() => setSiteIds(allSelected ? [] : allSelectable)}
                className="text-[12px] text-[#007aff] hover:underline disabled:opacity-40"
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
            )}
          </div>
          {team.sites.length === 0 ? (
            <p className="text-[12px] text-[#6b7280] border border-[#e5e5e5] rounded-[8px] px-3 py-3">
              There are no sites to share yet. Add a site first.
            </p>
          ) : (
            <div className="border border-[#e5e5e5] rounded-[8px] max-h-[200px] overflow-y-auto divide-y divide-[#f1f1f1]">
              {team.sites.map((site) => {
                const full = siteIsFull(site);
                const checked = siteIds.includes(site.id);
                return (
                  <label
                    key={site.id}
                    className={`flex items-center gap-3 px-3 py-2.5 ${full ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-[#f9fbff]"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={saving || full}
                      onChange={() => toggleSite(site.id)}
                      className="accent-[#007aff] size-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-black truncate">{site.domain || site.name}</p>
                      <p className="text-[11px] text-[#6b7280]">
                        {planLabel(site.planId)} plan · {seatsLabel(site)}
                        {full ? " · limit reached" : ""}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          {member?.hasOtherSites && (
            <p className="text-[11px] text-[#6b7280] mt-1.5">
              This member also has access to sites you don&apos;t manage. Those stay unchanged.
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Email address <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            disabled={saving || mode === "edit"}
            placeholder="email@address.com"
            className="w-full h-[42px] border border-[#e5e5e5] rounded-[8px] px-3 text-[13px] text-black focus:outline-none focus:ring-2 focus:ring-[#007aff] disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
          />
          {mode === "invite" && email.trim() && !emailValid && (
            <p className="text-[11px] text-red-600 mt-1.5">Enter a valid email address.</p>
          )}
        </div>

        {/* Role */}
        <div>
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Role <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2.5">
            {ROLE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="team-role"
                  value={opt.value}
                  checked={role === opt.value}
                  onChange={() => { setRole(opt.value); setError(null); }}
                  disabled={saving}
                  className="mt-[3px] accent-[#007aff] size-4 shrink-0"
                />
                <span>
                  <span className="block text-[14px] text-[#111827]">{opt.label}</span>
                  <span className="block text-[12px] text-[#6b7280]">{opt.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="h-[38px] px-5 rounded-[8px] border border-[#e5e5e5] text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="h-[38px] px-5 rounded-[8px] bg-[#007aff] text-white text-[13px] font-medium hover:bg-[#0069d9] disabled:bg-[#cfd3dc] disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (mode === "invite" ? "Inviting…" : "Saving…") : mode === "invite" ? "Invite user" : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; link?: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (orgId?: string | null, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setLoadError(null);
    try {
      const data = await getTeam(orgId);
      setTeam(data);
      setOrganizationId(data.organizationId);
    } catch (err) {
      setLoadError(
        err instanceof TeamApiError && err.status === 403
          ? "Only the account owner or an Admin can manage team members."
          : err instanceof Error ? err.message : "Could not load team members.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(null); }, [load]);

  const siteById = useMemo(() => {
    const m = new Map<string, TeamSite>();
    for (const s of team?.sites ?? []) m.set(s.id, s);
    return m;
  }, [team]);

  const handleResend = async (member: TeamMember) => {
    setRowBusy(member.id);
    setActionError(null);
    try {
      const res = await resendTeamInvite(member.id);
      setNotice({ text: `Invitation sent again to ${member.email}.`, link: res.inviteLink });
      await load(organizationId, { silent: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not resend the invitation.");
    } finally {
      setRowBusy(null);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    setActionError(null);
    try {
      const res = await removeTeamMember(removing.id);
      setNotice({
        text: res.removed === "sites"
          ? `${removing.email} no longer has access to your sites.`
          : `${removing.email} was removed from the team.`,
      });
      setRemoving(null);
      await load(organizationId, { silent: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not remove this member.");
      setRemoving(null);
    } finally {
      setRemoveBusy(false);
    }
  };

  if (loading && !team) {
    return (
      <div className="flex items-center gap-3 py-10">
        <div className="w-6 h-6 rounded-full border-[3px] border-[#007AFF] border-t-transparent animate-spin" />
        <p className="text-[14px] text-[#6b7280]">Loading team…</p>
      </div>
    );
  }

  if (loadError || !team) {
    return (
      <div className="bg-[#fbfbfb] border border-[#ebebeb] rounded-[10px] px-5 py-6">
        <p className="text-[14px] text-[#111827] font-medium mb-1">Team members</p>
        <p className="text-[13px] text-[#6b7280] mb-4">{loadError || "Could not load team members."}</p>
        <button
          type="button"
          onClick={() => void load(organizationId)}
          className="h-[36px] px-4 rounded-[8px] border border-[#007aff] text-[#007aff] text-[12px]"
        >
          Try again
        </button>
      </div>
    );
  }

  const isOwnerView = team.viewerRole === "owner";
  const sitesFull = team.sites.length > 0 && team.sites.every((s) => s.cap !== null && s.used >= s.cap);

  return (
    <div className="text-left">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-semibold leading-[20px] text-[16px] text-black tracking-[-0.5px]">Team Members</p>
          <p className="text-[13px] text-[#6b7280] mt-1">
            Invite people to help manage your sites. Members only see the sites you give them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setNotice(null); setActionError(null); setInviteOpen(true); }}
          disabled={team.sites.length === 0 || sitesFull}
          title={sitesFull ? "Every site has reached its member limit" : undefined}
          className="h-[40px] px-4 rounded-[8px] bg-[#007aff] text-white text-[13px] font-medium hover:bg-[#0069d9] disabled:bg-[#cfd3dc] disabled:cursor-not-allowed transition-colors shrink-0"
        >
          + Invite new user
        </button>
      </div>

      {notice && (
        <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[8px] px-3.5 py-2.5 mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] text-[#166534]">{notice.text}</p>
            {notice.link && (
              <p className="text-[11px] text-[#6b7280] mt-1 break-all">
                Dev link (email not configured):{" "}
                <a href={notice.link} className="text-[#007aff] underline">{notice.link}</a>
              </p>
            )}
          </div>
          <button type="button" onClick={() => setNotice(null)} className="text-[#6b7280] text-lg leading-none">×</button>
        </div>
      )}
      {actionError && <p className="text-[12px] text-red-600 mb-3">{actionError}</p>}

      {/* Account owner card */}
      <div className="bg-white border border-[#ebebeb] rounded-[10px] px-5 py-5">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[12px] uppercase tracking-[0.3px] text-[#6b7280]">Account Owner</p>
        </div>
        <p className="text-[15px] font-semibold text-[#111827] mb-4">{team.owner?.email || "—"}</p>

        {/* Organization block */}
        <div className="border border-[#ebebeb] rounded-[10px] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 bg-[#f7f9fc]">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex items-center gap-3 text-left min-w-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}>
                <path d="M9 6l6 6-6 6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[14px] font-medium text-[#111827] truncate">{team.organizationName || "Organization"}</span>
            </button>
            {!isOwnerView && (
              <span className="text-[11px] px-2 py-0.5 rounded-[4px] bg-[#e6f1fd] text-[#007aff] shrink-0">You are Admin</span>
            )}
            {team.organizations.length > 1 && (
              <select
                value={organizationId ?? ""}
                onChange={(e) => void load(e.target.value)}
                aria-label="Organization"
                className="ml-auto h-[32px] border border-[#e5e5e5] rounded-[6px] px-2 text-[12px] bg-white"
              >
                {team.organizations.map((o) => (
                  <option key={o.organizationId} value={o.organizationId}>
                    {o.name || "Organization"}{o.role === "admin" ? " (Admin)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {expanded && (
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[1.6fr_0.8fr_1.6fr_0.7fr_190px] gap-x-4 px-5 py-3 border-t border-b border-black/10">
                  {["Email address", "Role", "Sites", "Status", ""].map((h) => (
                    <p key={h} className="text-[13px] font-medium text-[#111827]">{h}</p>
                  ))}
                </div>

                {/* Owner row */}
                <div className="grid grid-cols-[1.6fr_0.8fr_1.6fr_0.7fr_190px] gap-x-4 px-5 py-4 items-center">
                  <p className="text-[13px] text-[#374151] truncate">{team.owner?.email || "—"}</p>
                  <span className="justify-self-start text-[11px] px-2 py-0.5 rounded-[50px] bg-[#69B4FF73] text-[#007aff] font-medium">
                    Account Owner
                  </span>
                  <p className="text-[13px] text-[#6b7280]">All sites</p>
                  <p className="text-[13px] text-[#374151]">Active</p>
                  <div />
                </div>

                {team.members.map((m) => (
                  <div key={m.id} className="grid grid-cols-[1.6fr_0.8fr_1.6fr_0.7fr_190px] gap-x-4 px-5 py-4 items-center border-t border-black/5">
                    <div className="min-w-0">
                      <p className="text-[13px] text-[#374151] truncate">{m.email}</p>
                      {m.name && <p className="text-[11px] text-[#9ca3af] truncate">{m.name}</p>}
                    </div>
                    <span
                      className={`justify-self-start text-[11px] px-2 py-0.5 rounded-[50px] font-medium ${
                        m.role === "admin" ? "bg-[#e6f1fd] text-[#007aff]" : "bg-[#f1f5f9] text-[#4b5563]"
                      }`}
                    >
                      {roleLabel(m.role)}
                    </span>
                    <div className="flex flex-wrap gap-1.5 min-w-0">
                      {m.siteIds.slice(0, 3).map((id) => (
                        <span key={id} className="text-[11px] px-2 py-0.5 rounded-[4px] bg-[#f3f4f6] text-[#374151] truncate max-w-[160px]">
                          {siteDisplay(siteById.get(id), id)}
                        </span>
                      ))}
                      {m.siteIds.length > 3 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-[4px] bg-[#f3f4f6] text-[#6b7280]">
                          +{m.siteIds.length - 3} more
                        </span>
                      )}
                    </div>
                    <p className={`text-[13px] ${m.status === "active" ? "text-[#374151]" : m.inviteExpired ? "text-red-600" : "text-[#b45309]"}`}>
                      {m.status === "active" ? "Active" : m.inviteExpired ? "Expired" : "Pending"}
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      {m.isSelf ? (
                        <span className="text-[12px] text-[#9ca3af]">You</span>
                      ) : (
                        <>
                          {m.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => void handleResend(m)}
                              disabled={rowBusy === m.id}
                              className="h-[32px] px-3 rounded-[6px] border border-[#cadbee] text-[#007aff] text-[12px] hover:bg-[#f5f9ff] disabled:opacity-50"
                            >
                              {rowBusy === m.id ? "Sending…" : "Resend"}
                            </button>
                          )}
                          {m.canEdit && (
                            <button
                              type="button"
                              onClick={() => { setNotice(null); setActionError(null); setEditing(m); }}
                              className="h-[32px] px-3 rounded-[6px] border border-[#007aff] text-[#007aff] text-[12px]"
                            >
                              Edit
                            </button>
                          )}
                          {m.canRemove && (
                            <button
                              type="button"
                              onClick={() => { setNotice(null); setActionError(null); setRemoving(m); }}
                              className="h-[32px] px-3 rounded-[6px] border border-[#fecaca] text-red-600 text-[12px] hover:bg-[#fef2f2]"
                            >
                              Remove
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {team.members.length === 0 && (
                  <p className="px-5 py-5 text-[13px] text-[#6b7280] border-t border-black/5">
                    No team members yet. Invite someone to help manage your sites.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Member limits per site */}
      {team.sites.length > 0 && (
        <div className="bg-[#fbfbfb] border border-[#ebebeb] rounded-[10px] px-5 py-4 mt-5">
          <p className="text-[14px] font-medium text-[#111827] mb-1">Member limits</p>
          <p className="text-[12px] text-[#6b7280] mb-3">
            Each site allows a number of members based on its plan: Free 1, Basic 2, Essential 5, Growth unlimited.
            Pending invitations count.
          </p>
          <div className="divide-y divide-black/5">
            {team.sites.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2">
                <p className="text-[13px] text-[#374151] truncate pr-4">{s.domain || s.name}</p>
                <p className={`text-[12px] shrink-0 ${s.cap !== null && s.used >= s.cap ? "text-[#b45309]" : "text-[#6b7280]"}`}>
                  {planLabel(s.planId)} · {seatsLabel(s)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {inviteOpen && organizationId && (
        <MemberForm
          key={organizationId}
          mode="invite"
          team={team}
          organizationId={organizationId}
          onOrganizationChange={(id) => void load(id, { silent: true })}
          onClose={() => setInviteOpen(false)}
          onDone={async ({ inviteLink, email }) => {
            setInviteOpen(false);
            setNotice({ text: `Invitation sent to ${email}.`, link: inviteLink });
            await load(organizationId, { silent: true });
          }}
        />
      )}

      {editing && organizationId && (
        <MemberForm
          mode="edit"
          team={team}
          member={editing}
          organizationId={organizationId}
          onClose={() => setEditing(null)}
          onDone={async () => {
            setNotice({ text: `Access updated for ${editing.email}.` });
            setEditing(null);
            await load(organizationId, { silent: true });
          }}
        />
      )}

      {removing && (
        <Modal onClose={() => setRemoving(null)} disabled={removeBusy}>
          <p className="font-semibold text-[16px] text-black mb-1">Remove team member</p>
          <p className="text-[13px] text-[#6b7280] mb-5">
            {removing.hasOtherSites
              ? <><span className="text-black font-medium">{removing.email}</span> will lose access to the sites you manage. Access to other sites stays unchanged.</>
              : <><span className="text-black font-medium">{removing.email}</span> will lose access to all sites in this account{removing.status === "pending" ? " and the invitation link will stop working" : ""}.</>}
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRemoving(null)}
              disabled={removeBusy}
              className="h-[38px] px-5 rounded-[8px] border border-[#e5e5e5] text-[#374151] text-[13px] font-medium hover:bg-[#f9fafb] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmRemove()}
              disabled={removeBusy}
              className="h-[38px] px-5 rounded-[8px] bg-[#dc2626] text-white text-[13px] font-medium hover:bg-[#b91c1c] disabled:opacity-50"
            >
              {removeBusy ? "Removing…" : "Remove"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
