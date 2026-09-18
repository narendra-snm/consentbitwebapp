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
import {
  normalizeSiteLabel,
  isDuplicateDomainForOthers,
  validateManageDomain,
  deriveSiteNameFromDomain,
  renameSiteDomain,
} from "@/lib/site-manage-helpers";
import { useDashboardSession } from "../../DashboardSessionProvider";
import InstallConsentModal from "../../components/InstallConsentModal";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS: { value: TeamRole; label: string; description: string }[] = [
  {
    value: "admin",
    label: "Admin",
    description:
      "Acts for the account owner on the sites you give them: billing, plan upgrades, adding sites, site name and URL, inviting and removing members, and the owner's email notifications. Can't transfer ownership",
  },
  {
    value: "member",
    label: "Member",
    description:
      "Can manage cookie banner, cookie scan, consent logs and consent settings. No billing, plans, new sites or account settings",
  },
];

function roleLabel(role: string) {
  return role === "admin" ? "Admin" : role === "member" || role === "editor" ? "Member" : "Account Owner";
}

function planLabel(planId: string | null) {
  const v = String(planId || "free").toLowerCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function roleSeats(site: TeamSite, role: TeamRole) {
  const cap = site.caps[role];
  const used = site.used[role];
  const noun = role === "admin" ? "Admin" : "Members";
  return cap === null ? `${noun} ${used} · unlimited` : `${noun} ${used}/${cap}`;
}

function seatsLabel(site: TeamSite) {
  if (!site.teamEnabled) return "Team not available on this plan";
  return `${roleSeats(site, "admin")} · ${roleSeats(site, "member")}`;
}

function roleIsFull(site: TeamSite, role: TeamRole) {
  const cap = site.caps[role];
  return cap !== null && site.used[role] >= cap;
}

/** No seat of any role left (or no team feature on this plan). */
function siteHasNoSeats(site: TeamSite) {
  return !site.teamEnabled || (roleIsFull(site, "admin") && roleIsFull(site, "member"));
}

const STATUS_STYLE = {
  active: { dot: "bg-[#22c55e]", text: "text-[#111827]", label: "Active" },
  pending: { dot: "bg-[#f59e0b]", text: "text-[#b45309]", label: "Pending" },
  expired: { dot: "bg-[#ef4444]", text: "text-[#dc2626]", label: "Expired" },
  suspended: { dot: "bg-[#9ca3af]", text: "text-[#6b7280]", label: "Suspended" },
} as const;

function StatusDot({ status }: { status: keyof typeof STATUS_STYLE }) {
  const st = STATUS_STYLE[status];
  return (
    <p className={`flex items-center gap-2 text-[15px] ${st.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
      {st.label}
    </p>
  );
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
  const originalRole: TeamRole | "" =
    member?.role === "admin" ? "admin" : member ? "member" : "";
  const [role, setRole] = useState<TeamRole | "">(originalRole);
  // A role covers every site the person holds; an Admin can't change it when some of
  // those sites are outside their slice (the server refuses too).
  const roleLocked = mode === "edit" && !!member?.hasOtherSites;
  const [siteIds, setSiteIds] = useState<string[]>(member?.siteIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = EMAIL_REGEX.test(email.trim());
  const original = useMemo(() => new Set(member?.siteIds ?? []), [member]);

  // A site is unavailable when its plan has no team feature, or the chosen role has
  // no seat left there. The member's own seat (same site, same role) doesn't count.
  const siteIsFull = (site: TeamSite) => {
    if (!site.teamEnabled) return true;
    if (!role) return siteHasNoSeats(site);
    if (original.has(site.id) && role === originalRole) return false;
    return roleIsFull(site, role);
  };

  const toggleSite = (id: string) => {
    setError(null);
    setSiteIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const chooseRole = (next: TeamRole) => {
    setRole(next);
    setError(null);
    // Drop sites that have no seat for the new role.
    setSiteIds((prev) =>
      prev.filter((id) => {
        const site = team.sites.find((s) => s.id === id);
        if (!site) return true; // a site outside this viewer's slice — the server keeps it
        if (!site.teamEnabled) return false;
        if (original.has(id) && next === originalRole) return true;
        return !roleIsFull(site, next);
      }),
    );
  };

  // Only Essential/Growth sites can have team members, so Free/Basic sites are left
  // out of the picker entirely.
  const pickable = team.sites.filter((s) => s.teamEnabled);
  const allSelectable = pickable.filter((s) => !siteIsFull(s)).map((s) => s.id);
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
            {pickable.length > 1 && (
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
          {pickable.length === 0 ? (
            <p className="text-[12px] text-[#6b7280] border border-[#e5e5e5] rounded-[8px] px-3 py-3">
              No Essential or Growth sites yet. Team members are available on those plans.
            </p>
          ) : (
            <div className="border border-[#e5e5e5] rounded-[8px] max-h-[200px] overflow-y-auto divide-y divide-[#f1f1f1]">
              {pickable.map((site) => {
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
                        {full && site.teamEnabled ? (role ? ` · no ${role === "admin" ? "Admin" : "Member"} seat left` : " · limit reached") : ""}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          {member?.hasOtherSites && (
            <p className="text-[11px] text-[#6b7280] mt-1.5">
              This member also has access to sites you don&apos;t manage. Those stay unchanged, and only the account owner can change their role.
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
                  onChange={() => chooseRole(opt.value)}
                  disabled={saving || roleLocked}
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

// ─── Manage site (Admin) ─────────────────────────────────────────────────────
// Team Admins don't get Profile → Organizations (billing lives there), so they
// change a site's URL here. Same call and error handling as the owner's Manage
// modal; the site name follows the URL, as it does there.

type InstallPayload = { scriptUrl: string; siteDomain: string; siteId: string; cdnScriptId?: string; isOldScript?: boolean };

function renameErrorText(code: string | undefined, message: string | undefined) {
  if (code === "DOMAIN_EXISTS_OTHER_ACCOUNT") return "This website URL is already registered to another ConsentBit account.";
  if (code === "DOMAIN_EXISTS_SAME_ACCOUNT") return "This website URL is already used by another site in this account.";
  if (code === "DUPLICATE_SITE_NAME") return "This site name is already used by another site in this account. Choose a different URL.";
  if (code === "DOMAIN_REQUIRED" || code === "INVALID_DOMAIN") return message || "Enter a valid website URL.";
  return message || "Failed to update site";
}

function ManageSiteModal({ site, onClose, onDone }: { site: TeamSite; onClose: () => void; onDone: (p: InstallPayload) => void }) {
  const { sites, refresh, updateSiteInState } = useDashboardSession();
  const [domain, setDomain] = useState(site.domain || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const value = domain.trim();
    if (!value) return;
    setError(null);
    const domainErr = validateManageDomain(value);
    if (domainErr) { setError(domainErr); return; }
    if (isDuplicateDomainForOthers(sites, site.id, value)) {
      setError("This website URL is already used by another site you manage.");
      return;
    }
    setSaving(true);
    try {
      const result = await renameSiteDomain({ websiteUrl: value, excludeSiteId: site.id });
      if (!result.ok) { setError(result.message || "This domain cannot be used."); return; }
      const rawSite: any = (Array.isArray(sites) ? sites : []).find((s: any) => String(s.id) === site.id);
      try { sessionStorage.removeItem("cbSessionCache"); } catch { /* ignore */ }
      await refresh({ showLoading: false });
      const finalDomain = result.domain || normalizeSiteLabel(value);
      updateSiteInState({ id: site.id, name: deriveSiteNameFromDomain(value), domain: finalDomain });
      const cdnScriptId = rawSite?.cdnScriptId ?? rawSite?.cdn_script_id;
      onDone({
        scriptUrl: rawSite?.embedScriptUrl ?? rawSite?.embed_script_url ?? "",
        siteDomain: finalDomain,
        siteId: site.id,
        cdnScriptId: cdnScriptId ? String(cdnScriptId) : undefined,
        isOldScript: !!result.isOldScript,
      });
    } catch (e: any) {
      setError(renameErrorText(e?.code, e?.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} disabled={saving}>
      <p className="font-semibold text-[16px] text-black mb-1">Change Site URL</p>
      <p className="text-[12px] text-[#6b7280] mb-5">
        Move this site to a new domain. Settings, plan and history stay unchanged.
      </p>
      <label className="block text-[12px] font-medium text-[#374151] mb-1">New Website URL</label>
      <input
        type="text"
        value={domain}
        onChange={(e) => { setDomain(e.target.value); setError(null); }}
        disabled={saving}
        placeholder="example.com"
        className="w-full h-[42px] border border-[#e5e5e5] rounded-[8px] px-3 text-[13px] text-black focus:outline-none focus:ring-2 focus:ring-[#007aff]"
      />
      <p className="text-[11px] text-[#9ca3af] mt-1.5 mb-4">The consent banner will be linked to this domain.</p>
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
          onClick={() => void save()}
          disabled={saving || !domain.trim()}
          className="h-[38px] px-5 rounded-[8px] bg-[#007aff] text-white text-[13px] font-medium hover:bg-[#0069d9] disabled:bg-[#cfd3dc] disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save New URL"}
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
  const [managingSite, setManagingSite] = useState<TeamSite | null>(null);
  const [installModal, setInstallModal] = useState<InstallPayload | null>(null);
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

  // Invites are accepted elsewhere (the invitee's own browser), so re-check when this
  // tab comes back into view, and poll while an invitation is still pending so
  // "Pending" flips to "Active" without a reload.
  const hasPending = !!team?.members.some((m) => m.status === "pending");
  useEffect(() => {
    if (!organizationId) return;
    const reload = () => {
      if (document.visibilityState === "visible") void load(organizationId, { silent: true });
    };
    document.addEventListener("visibilitychange", reload);
    window.addEventListener("focus", reload);
    const timer = hasPending ? window.setInterval(reload, 20_000) : undefined;
    return () => {
      document.removeEventListener("visibilitychange", reload);
      window.removeEventListener("focus", reload);
      if (timer) window.clearInterval(timer);
    };
  }, [organizationId, hasPending, load]);

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
  const noTeamPlan = team.sites.length > 0 && team.sites.every((s) => !s.teamEnabled);
  const sitesFull = team.sites.length > 0 && team.sites.every(siteHasNoSeats);

  return (
    <div className="text-left">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-semibold leading-[22px] text-[16px] text-[#111827]">Team Members</p>
          <p className="text-[14px] text-[#4b5563] mt-1">
            Invite people to help manage your sites. Members only see the sites you give them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setNotice(null); setActionError(null); setInviteOpen(true); }}
          disabled={team.sites.length === 0 || sitesFull}
          title={
            noTeamPlan
              ? "Team members are available on the Essential and Growth plans"
              : sitesFull
                ? "Every site has reached its member limit"
                : undefined
          }
          className="h-[36px] px-3.5 rounded-[6px] bg-[#007aff] text-white text-[14px] font-medium hover:bg-[#0069d9] disabled:bg-[#cfd3dc] disabled:cursor-not-allowed transition-colors shrink-0"
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

      {noTeamPlan && (
        <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[8px] px-3.5 py-2.5 mb-4">
          <p className="text-[13px] text-[#92400e]">
            Team members are available on the Essential and Growth plans.
            {isOwnerView ? " Upgrade a site to invite people to it." : " Ask the account owner to upgrade."}
          </p>
        </div>
      )}

      {/* Account owner card */}
      <div className="bg-white border border-[#e5e7eb] rounded-[10px] overflow-hidden">
        <div className="px-4 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#6b7280]">Account Owner</p>
          <p className="text-[15px] font-semibold text-[#111827] mt-1">{team.owner?.email || "—"}</p>
        </div>

        {/* Organization block */}
        <div>
          <div className="flex items-center gap-3 px-4 py-3 bg-[#f1f4f8] border-t border-[#e5e7eb]">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex items-center gap-3 text-left min-w-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={`shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`}>
                <path d="M6 9l6 6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[15px] text-[#111827] truncate">{team.organizationName || "Organization"}</span>
            </button>
            {!isOwnerView && (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#e6f1fd] text-[#007aff] shrink-0">You are Admin</span>
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
                <div className="grid grid-cols-[1.6fr_0.8fr_1.6fr_0.7fr_190px] gap-x-4 px-4 py-3 border-b border-[#eef0f3]">
                  {["Email address", "Role", "Sites", "Status", ""].map((h) => (
                    <p key={h} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#374151]">{h}</p>
                  ))}
                </div>

                {/* Owner row */}
                <div className="grid grid-cols-[1.6fr_0.8fr_1.6fr_0.7fr_190px] gap-x-4 px-4 py-4 items-center">
                  <p className="text-[15px] text-[#111827] truncate">{team.owner?.email || "—"}</p>
                  <span className="justify-self-start text-[11px] px-2.5 py-1 rounded-full bg-[#e6f1fd] text-[#007aff]">
                    Account Owner
                  </span>
                  <p className="text-[15px] text-[#4b5563]">All sites</p>
                  <StatusDot status="active" />
                  <div />
                </div>

                {team.members.map((m) => (
                  <div key={m.id} className="grid grid-cols-[1.6fr_0.8fr_1.6fr_0.7fr_190px] gap-x-4 px-4 py-4 items-center border-t border-[#eef0f3]">
                    <div className="min-w-0">
                      <p className="text-[15px] text-[#111827] truncate">{m.email}</p>
                      {m.name && <p className="text-[12px] text-[#9ca3af] truncate">{m.name}</p>}
                    </div>
                    <span
                      className={`justify-self-start text-[11px] px-2.5 py-1 rounded-full ${
                        m.role === "admin" ? "bg-[#e6f1fd] text-[#007aff]" : "bg-[#f3f4f6] text-[#4b5563]"
                      }`}
                    >
                      {roleLabel(m.role)}
                    </span>
                    <div className="flex flex-wrap gap-1.5 min-w-0">
                      {m.siteIds.slice(0, 3).map((id) => (
                        <span
                          key={id}
                          title={m.suspendedSiteIds?.includes(id) ? "Suspended: this site is on Basic/Free, which has no team members" : undefined}
                          className={`text-[12px] px-2 py-0.5 rounded-[6px] truncate max-w-[170px] ${
                            m.suspendedSiteIds?.includes(id) ? "bg-[#f9fafb] text-[#9ca3af] line-through" : "bg-[#f3f4f6] text-[#374151]"
                          }`}
                        >
                          {siteDisplay(siteById.get(id), id)}
                        </span>
                      ))}
                      {m.siteIds.length > 3 && (
                        <span className="text-[12px] px-2 py-0.5 rounded-[6px] bg-[#f3f4f6] text-[#6b7280]">
                          +{m.siteIds.length - 3} more
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <StatusDot status={m.suspended ? "suspended" : m.status === "active" ? "active" : m.inviteExpired ? "expired" : "pending"} />
                      {m.suspended && (
                        <p className="text-[11px] text-[#9ca3af] mt-0.5">Site is on Basic/Free</p>
                      )}
                    </div>
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
                  <p className="px-4 py-4 text-[15px] text-[#4b5563] border-t border-[#eef0f3]">
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
        <div className="bg-white border border-[#e5e7eb] rounded-[10px] mt-6 overflow-hidden">
          <div className="px-4 py-4 border-b border-[#eef0f3]">
          <p className="text-[15px] font-semibold text-[#111827]">Member limits</p>
          <p className="text-[14px] text-[#4b5563] mt-1">
            Seats per site, on top of the account owner: Essential 1 Admin + 4 Members, Growth 1 Admin + unlimited
            Members. Free and Basic don&apos;t include team members. Pending invitations count.
          </p>
          </div>
          <div className="divide-y divide-[#eef0f3]">
            {team.sites.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-[15px] text-[#111827] truncate pr-4">{s.domain || s.name}</p>
                <div className="flex items-center gap-3 shrink-0">
                  <p className={`text-[12px] ${s.teamEnabled && siteHasNoSeats(s) ? "text-[#b45309]" : "text-[#6b7280]"}`}>
                    {planLabel(s.planId)} · {seatsLabel(s)}
                  </p>
                  {/* Owners change URLs in Profile → Organizations; Admins only have this. */}
                  {!isOwnerView && (
                    <button
                      type="button"
                      onClick={() => { setNotice(null); setActionError(null); setManagingSite(s); }}
                      className="h-[30px] px-3 rounded-[6px] border border-[#007aff] text-[#007aff] text-[12px]"
                    >
                      Manage
                    </button>
                  )}
                </div>
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

      {managingSite && (
        <ManageSiteModal
          site={managingSite}
          onClose={() => setManagingSite(null)}
          onDone={async (payload) => {
            setManagingSite(null);
            setNotice({
              text: payload.isOldScript
                ? `Site URL changed to ${payload.siteDomain}. This site still uses an older ConsentBit script: remove it from the site and install the new one shown next, or banners will be duplicated.`
                : `Site URL changed to ${payload.siteDomain}.`,
            });
            setInstallModal(payload);
            await load(organizationId, { silent: true });
          }}
        />
      )}

      {installModal && (
        <InstallConsentModal
          key={installModal.siteId}
          open={true}
          scriptUrl={installModal.scriptUrl}
          siteDomain={installModal.siteDomain}
          siteId={installModal.siteId}
          cdnScriptId={installModal.cdnScriptId}
          onClose={() => setInstallModal(null)}
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
