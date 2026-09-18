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
  const [query, setQuery] = useState("");

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

  const q = query.trim().toLowerCase();
  const visible = q
    ? pickable.filter((s) => `${s.domain || ""} ${s.name || ""}`.toLowerCase().includes(q))
    : pickable;

  /** Right-hand seat text for a site, for the chosen role (or both roles before one is picked). */
  const seatsLeft = (site: TeamSite) => {
    const left = (r: TeamRole) => {
      const cap = site.caps[r];
      return cap === null ? Infinity : Math.max(0, cap - site.used[r]);
    };
    const n = role ? left(role) : left("admin") + left("member");
    if (n === Infinity) return "Unlimited";
    if (n === 0) return "Full";
    return `${n} seat${n === 1 ? "" : "s"} left`;
  };

  const hint = saving
    ? ""
    : mode === "invite" && !emailValid
      ? "Enter an email address to continue."
      : !role
        ? "Choose a role to continue."
        : siteIds.length === 0
          ? "Select at least one site."
          : `${mode === "invite" ? "Invites" : "Gives"} ${mode === "invite" ? email.trim() : member?.email} ${
              role === "admin" ? "Admin" : "Member"
            } access to ${siteIds.length} site${siteIds.length === 1 ? "" : "s"}.`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[12px] shadow-xl max-w-[640px] w-full relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-[18px] text-[#111827]">
              {mode === "invite" ? "Invite new user" : "Edit member access"}
            </p>
            <p className="text-[15px] text-[#4b5563] mt-1">
              {mode === "invite"
                ? "They get an email with instructions to join, and access only to the sites you select."
                : `Change what ${member?.email} can see and do.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="text-[#6b7280] hover:text-[#111827] text-[22px] leading-none shrink-0"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-5 space-y-5 overflow-y-auto">
          {mode === "invite" && team.organizations.length > 1 && onOrganizationChange && (
            <div>
              <label className="block text-[15px] text-[#111827] mb-2">
                Organization <span className="text-red-600">*</span>
              </label>
              <select
                value={organizationId}
                onChange={(e) => onOrganizationChange(e.target.value)}
                disabled={saving}
                className="w-full h-[44px] border border-[#d1d5db] rounded-[8px] px-3 text-[15px] text-[#111827] bg-white focus:outline-none focus:border-[#007aff] focus:ring-1 focus:ring-[#007aff]"
              >
                {team.organizations.map((o) => (
                  <option key={o.organizationId} value={o.organizationId}>
                    {o.name || "Organization"} {o.role === "admin" ? "(Admin)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-[15px] text-[#111827] mb-2">
              Email address <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              value={email}
              autoFocus={mode === "invite"}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              disabled={saving || mode === "edit"}
              placeholder="email@address.com"
              className="w-full h-[44px] border border-[#d1d5db] rounded-[8px] px-3 text-[15px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#007aff] focus:ring-1 focus:ring-[#007aff] disabled:bg-[#f9fafb] disabled:text-[#6b7280]"
            />
            {mode === "invite" && email.trim() && !emailValid && (
              <p className="text-[12px] text-red-600 mt-1.5">Enter a valid email address.</p>
            )}
          </div>

          {/* Role — two cards */}
          <div>
            <label className="block text-[15px] text-[#111827] mb-2">
              Role <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((opt) => {
                const on = role === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 rounded-[10px] border px-4 py-3.5 transition-colors ${
                      roleLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                    } ${on ? "border-[#007aff] bg-[#f5f9ff]" : "border-[#e5e7eb] hover:border-[#cbd5e1]"}`}
                  >
                    <input
                      type="radio"
                      name="team-role"
                      value={opt.value}
                      checked={on}
                      onChange={() => chooseRole(opt.value)}
                      disabled={saving || roleLocked}
                      className="mt-[3px] accent-[#007aff] size-[18px] shrink-0"
                    />
                    <span>
                      <span className="block text-[15px] text-[#111827]">{opt.label}</span>
                      <span className="block text-[13px] leading-[1.45] text-[#4b5563] mt-0.5">{opt.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Sites */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[15px] text-[#111827]">
                Sites <span className="text-red-600">*</span>
              </label>
              <div className="flex items-center gap-4">
                <span className="text-[12px] text-[#4b5563]">{siteIds.length} selected</span>
                {pickable.length > 1 && (
                  <button
                    type="button"
                    disabled={saving || allSelectable.length === 0}
                    onClick={() => setSiteIds(allSelected ? [] : allSelectable)}
                    className="text-[14px] text-[#007aff] hover:underline disabled:opacity-40"
                  >
                    {allSelected ? "Clear all" : "Select all"}
                  </button>
                )}
              </div>
            </div>

            {pickable.length === 0 ? (
              <p className="text-[13px] text-[#6b7280] border border-[#e5e7eb] rounded-[10px] px-4 py-4">
                No Essential or Growth sites yet. Team members are available on those plans.
              </p>
            ) : (
              <div className="border border-[#e5e7eb] rounded-[10px] overflow-hidden">
                {pickable.length > 4 && (
                  <div className="p-3 border-b border-[#eef0f3]">
                    <div className="relative">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2">
                        <circle cx="11" cy="11" r="7" stroke="#6b7280" strokeWidth="2" />
                        <path d="M20 20l-3.5-3.5" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search sites"
                        className="w-full h-[40px] border border-[#e5e7eb] rounded-[8px] pl-9 pr-3 text-[14px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#007aff]"
                      />
                    </div>
                  </div>
                )}
                <div className="max-h-[240px] overflow-y-auto divide-y divide-[#eef0f3]">
                  {visible.length === 0 && (
                    <p className="px-4 py-4 text-[13px] text-[#6b7280]">No sites match “{query}”.</p>
                  )}
                  {visible.map((site) => {
                    const full = siteIsFull(site);
                    const checked = siteIds.includes(site.id);
                    return (
                      <label
                        key={site.id}
                        className={`flex items-center gap-3 px-4 py-3 ${
                          full ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-[#f9fafb]"
                        } ${checked ? "bg-[#f5f9ff]" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={saving || full}
                          onChange={() => toggleSite(site.id)}
                          className="accent-[#007aff] size-[18px] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] text-[#111827] truncate">{site.domain || site.name}</p>
                          <p className="text-[12px] text-[#6b7280] mt-0.5">
                            {planLabel(site.planId)} plan · {seatsLabel(site)}
                          </p>
                        </div>
                        <span className={`text-[12px] shrink-0 ${full ? "text-[#b45309]" : "text-[#4b5563]"}`}>
                          {full && role ? `No ${role === "admin" ? "Admin" : "Member"} seat` : seatsLeft(site)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {member?.hasOtherSites && (
              <p className="text-[12px] text-[#6b7280] mt-2">
                This member also has access to sites you don&apos;t manage. Those stay unchanged, and only the account owner can change their role.
              </p>
            )}
          </div>

          {error && <p className="text-[13px] text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#eef0f3] flex items-center justify-between gap-4">
          <p className="text-[13px] text-[#4b5563] min-w-0 truncate">{hint}</p>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-[40px] px-5 rounded-[8px] border border-[#d1d5db] bg-white text-[#111827] text-[15px] hover:bg-[#f9fafb] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="h-[40px] px-5 rounded-[8px] bg-[#007aff] text-white text-[15px] font-medium hover:bg-[#0069d9] disabled:bg-[#9cc8ff] disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (mode === "invite" ? "Inviting…" : "Saving…") : mode === "invite" ? "Invite user" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
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
  const { refresh: refreshSession } = useDashboardSession();
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
      const suspended = err instanceof TeamApiError && err.code === "TEAM_SUSPENDED";
      setLoadError(
        suspended
          ? err.message
          : err instanceof TeamApiError && err.status === 403
            ? "Only the account owner or an Admin can manage team members."
            : err instanceof Error ? err.message : "Could not load team members.",
      );
      // The session still lists the suspended site, which is why these tabs showed at
      // all — re-sync so Billing/Organizations/Usage/Team drop away.
      if (suspended) void refreshSession({ showLoading: false });
    } finally {
      setLoading(false);
    }
  }, [refreshSession]);

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
  const canInvite = team.sites.length > 0 && !sitesFull;
  const openInvite = () => { setNotice(null); setActionError(null); setInviteOpen(true); };

  // Summary numbers (the owner counts as an active person).
  const activeCount = 1 + team.members.filter((m) => m.status === "active" && !m.suspended).length;
  const pendingCount = team.members.filter((m) => m.status === "pending" && !m.inviteExpired).length;
  const shareableCount = team.sites.filter((s) => s.teamEnabled).length;
  const peopleCount = 1 + team.members.length;
  const two = (n: number) => String(n).padStart(2, "0");

  // "x of y seats used" across the sites that have a team feature.
  const enabledSites = team.sites.filter((s) => s.teamEnabled);
  const seatsUsed = enabledSites.reduce((n, s) => n + s.used.admin + s.used.member, 0);
  const seatsUnlimited = enabledSites.some((s) => s.caps.admin === null || s.caps.member === null);
  const seatsTotal = enabledSites.reduce((n, s) => n + (s.caps.admin ?? 0) + (s.caps.member ?? 0), 0);

  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  };
  const initial = (email: string | null | undefined) => String(email || "?").trim().charAt(0).toUpperCase();

  /** "N left" / "No limit" for a site across both roles. */
  const siteSeatsLeft = (s: TeamSite) => {
    if (!s.teamEnabled) return "Not available";
    if (s.caps.admin === null || s.caps.member === null) return "No limit";
    const left = Math.max(0, (s.caps.admin ?? 0) - s.used.admin) + Math.max(0, (s.caps.member ?? 0) - s.used.member);
    return left === 0 ? "Full" : `${left} left`;
  };

  const GRID = "grid grid-cols-[1.7fr_0.8fr_1.5fr_0.8fr_180px] gap-x-4";

  return (
    <div className="text-left">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-5">
        <div>
          <p className="font-semibold leading-[22px] text-[16px] text-[#111827]">Team</p>
          <p className="text-[15px] leading-[1.35] text-[#4b5563] mt-1 max-w-[620px]">
            Invite people to help manage your sites. Members only see the sites you give them, and only the
            permissions their role allows.
          </p>
        </div>
        <button
          type="button"
          onClick={openInvite}
          disabled={!canInvite}
          title={
            noTeamPlan
              ? "Team members are available on the Essential and Growth plans"
              : sitesFull
                ? "Every site has reached its member limit"
                : undefined
          }
          className="h-[36px] px-3.5 rounded-[6px] bg-[#007aff] text-white text-[15px] font-medium hover:bg-[#0069d9] disabled:bg-[#cfd3dc] disabled:cursor-not-allowed transition-colors shrink-0"
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

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#e8f1fd] rounded-[10px] px-4 py-4 mb-6">
        {[
          {
            value: activeCount,
            label: "Active members",
            icon: (
              <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 9c0-3.3 2.7-6 6-6s6 2.7 6 6m1-9a3 3 0 1 0 0-6m2 15c0-2.4-1.3-4.5-3.3-5.5" stroke="#007aff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            ),
          },
          {
            value: pendingCount,
            label: "Pending invitations",
            icon: (
              <>
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="#007aff" strokeWidth="1.6" />
                <path d="M3.5 6.5 12 13l8.5-6.5" stroke="#007aff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ),
          },
          {
            value: shareableCount,
            label: "Sites you can share",
            icon: (
              <>
                <circle cx="12" cy="12" r="9" stroke="#007aff" strokeWidth="1.6" />
                <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" stroke="#007aff" strokeWidth="1.6" />
              </>
            ),
          },
        ].map((stat) => (
          <div key={stat.label}>
            <div className="size-[40px] rounded-[8px] bg-white flex items-center justify-center mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">{stat.icon}</svg>
            </div>
            <p className="text-[24px] leading-none font-semibold text-[#111827]">{two(stat.value)}</p>
            <p className="text-[14px] text-[#4b5563] mt-1.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Members */}
      <div className="bg-white border border-[#e5e7eb] rounded-[10px] overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <p className="text-[15px] font-semibold text-[#111827]">Members</p>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f3f4f6] text-[#4b5563]">
            {peopleCount} {peopleCount === 1 ? "person" : "people"}
          </span>
        </div>

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
              className="h-[32px] border border-[#e5e5e5] rounded-[6px] px-2 text-[12px] bg-white"
            >
              {team.organizations.map((o) => (
                <option key={o.organizationId} value={o.organizationId}>
                  {o.name || "Organization"}{o.role === "admin" ? " (Admin)" : ""}
                </option>
              ))}
            </select>
          )}
          {enabledSites.length > 0 && (
            <span className="ml-auto text-[12px] text-[#4b5563] shrink-0">
              {seatsUsed} of {seatsUnlimited ? "unlimited" : seatsTotal} seats used
            </span>
          )}
        </div>

        {expanded && (
          <div className="overflow-x-auto">
            <div className="min-w-[780px]">
              <div className={`${GRID} px-4 py-3 border-b border-[#eef0f3]`}>
                {["Member", "Role", "Sites", "Status", ""].map((h) => (
                  <p key={h} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#374151]">{h}</p>
                ))}
              </div>

              {/* Owner row */}
              <div className={`${GRID} px-4 py-4 items-center`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="size-[32px] rounded-[8px] bg-[#e6f1fd] text-[#007aff] text-[13px] font-semibold flex items-center justify-center shrink-0">
                    {initial(team.owner?.email)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] text-[#111827] truncate">{team.owner?.email || "—"}</p>
                    <p className="text-[12px] text-[#6b7280] truncate">{team.owner?.name || "Account owner"}</p>
                  </div>
                </div>
                <span className="justify-self-start text-[11px] px-2.5 py-1 rounded-full bg-[#e6f1fd] text-[#007aff]">
                  Account Owner
                </span>
                <p className="text-[15px] text-[#4b5563]">All sites</p>
                <StatusDot status="active" />
                <div />
              </div>

              {team.members.map((m) => {
                const since = m.status === "active" ? fmtDate(m.acceptedAt || m.createdAt) : fmtDate(m.createdAt);
                return (
                  <div key={m.id} className={`${GRID} px-4 py-4 items-center border-t border-[#eef0f3]`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`size-[32px] rounded-[8px] text-[13px] font-semibold flex items-center justify-center shrink-0 ${
                        m.role === "admin" ? "bg-[#e6f1fd] text-[#007aff]" : "bg-[#f3f4f6] text-[#4b5563]"
                      }`}>
                        {initial(m.email)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[15px] text-[#111827] truncate">{m.email}</p>
                        <p className="text-[12px] text-[#6b7280] truncate">
                          {[m.name, since ? `${m.status === "active" ? "Added" : "Invited"} ${since}` : null].filter(Boolean).join(" · ")}
                        </p>
                      </div>
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
                      {m.suspended && <p className="text-[11px] text-[#9ca3af] mt-0.5">Site is on Basic/Free</p>}
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
                              className="h-[32px] px-3 rounded-[6px] border border-[#007aff] text-[#007aff] text-[12px] hover:bg-[#f5f9ff]"
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
                );
              })}
            </div>
          </div>
        )}

        {/* Invite prompt row */}
        {canInvite && (
          <div className="flex items-center justify-between gap-4 px-4 py-4 bg-[#e8f1fd] border-t border-[#dbe8fb]">
            <button type="button" onClick={openInvite} className="text-[15px] text-[#007aff] hover:underline text-left">
              {team.members.length === 0 ? "Invite someone to help manage your sites" : "Invite another person"}
            </button>
            <button
              type="button"
              onClick={openInvite}
              aria-label="Invite new user"
              className="size-[36px] rounded-[6px] bg-[#007aff] text-white text-[18px] leading-none flex items-center justify-center hover:bg-[#0069d9] shrink-0"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Seats by site */}
      {team.sites.length > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-[10px] mt-6 overflow-hidden">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-4 border-b border-[#eef0f3]">
            <p className="text-[15px] font-semibold text-[#111827]">Seats by site</p>
            <p className="text-[12px] text-[#6b7280]">
              Essential 1 Admin + 4 Members · Growth 1 Admin + unlimited Members · Free and Basic: no team. Pending invitations count.
            </p>
          </div>
          <div className="divide-y divide-[#eef0f3]">
            {team.sites.map((s) => {
              const left = siteSeatsLeft(s);
              return (
                <div key={s.id} className="grid grid-cols-[1.6fr_110px_1.3fr_auto] gap-x-4 items-center px-4 py-3">
                  <p className="text-[15px] text-[#111827] truncate">{s.domain || s.name}</p>
                  <span className="justify-self-start text-[12px] px-2.5 py-0.5 rounded-full bg-[#f3f4f6] text-[#4b5563]">
                    {planLabel(s.planId)}
                  </span>
                  <p className="text-[13px] text-[#4b5563] truncate">
                    {s.teamEnabled ? seatsLabel(s) : "Team not available on this plan"}
                  </p>
                  <div className="flex items-center justify-end gap-3">
                    <span className={`text-[12px] ${left === "Full" ? "text-[#b45309]" : "text-[#6b7280]"}`}>{left}</span>
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
              );
            })}
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
