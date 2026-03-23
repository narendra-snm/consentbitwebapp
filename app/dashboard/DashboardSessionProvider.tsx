"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMe, getSites } from "@/lib/client-api";

type DashboardSessionState = {
  loading: boolean;
  authenticated: boolean;
  user: any | null;
  organizations: any[];
  sites: any[];
  effectivePlanId: string;
  activeOrganizationId: string | null;
  activeSiteId: string | null;
};

export type DashboardRefreshOptions = {
  /** Default true. Set false after checkout / background sync to avoid blanking the whole dashboard. */
  showLoading?: boolean;
};

type DashboardSessionApi = DashboardSessionState & {
  refresh: (opts?: DashboardRefreshOptions) => Promise<void>;
  setActiveSiteId: (siteId: string | null) => void;
  updateSiteInState: (patch: { id: string } & Record<string, any>) => void;
  logout: () => Promise<void>;
};

const DashboardSessionContext = createContext<DashboardSessionApi | null>(null);

/** Must match DashboardTabs — these segments are not site ids. */
const RESERVED_DASHBOARD_SEGMENTS = new Set(["profile", "all-domain"]);

function pickActiveSiteIdFromPath(pathname: string | null): string | null {
  const parts = (pathname || "").split("/").filter(Boolean);
  if (parts[0] !== "dashboard") return null;
  if (parts.length < 2) return null;
  const id = parts[1];
  if (!id || id === "one") return null;
  if (RESERVED_DASHBOARD_SEGMENTS.has(id)) return null;
  return id;
}

/** `/api/auth/me` may return org rows with `id`, `organizationId`, or D1 lowercase keys. */
function pickOrganizationIdFromMe(orgs: unknown): string | null {
  if (!Array.isArray(orgs) || orgs.length === 0) return null;
  const o: unknown = orgs[0];
  if (typeof o === "string") return o.trim() || null;
  if (o && typeof o === "object") {
    const rec = o as Record<string, unknown>;
    const raw = rec.id ?? rec.organizationId ?? rec.organization_id;
    const s = raw != null ? String(raw).trim() : "";
    return s || null;
  }
  return null;
}

function pickOrganizationIdFromSite(site: unknown): string | null {
  if (!site || typeof site !== "object") return null;
  const s = site as Record<string, unknown>;
  const raw = s.organizationId ?? s.organizationid;
  const id = raw != null ? String(raw).trim() : "";
  return id || null;
}

function pickPlanIdFromSite(site: unknown): string | null {
  if (!site || typeof site !== "object") return null;
  const s = site as Record<string, unknown>;
  const raw = s.planId ?? s.plan_id ?? s.subscription_plan ?? s.plan ?? null;
  const plan = raw != null ? String(raw).trim() : "";
  return plan || null;
}

export function DashboardSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  /** Latest path without putting `pathname` in `refresh` deps (avoids refetch on every tab switch). */
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const [state, setState] = useState<DashboardSessionState>({
    loading: true,
    authenticated: false,
    user: null,
    organizations: [],
    sites: [],
    effectivePlanId: "free",
    activeOrganizationId: null,
    activeSiteId: null,
  });

  const refresh = useCallback(async (opts?: DashboardRefreshOptions) => {
    const showLoading = opts?.showLoading !== false;
    if (showLoading) setState((s) => ({ ...s, loading: true }));
    try {
      const me = await getMe();
      const authenticated = Boolean(me?.authenticated);
      const orgs = Array.isArray(me?.organizations) ? me.organizations : [];

      if (!authenticated) {
        setState({
          loading: false,
          authenticated: false,
          user: null,
          organizations: [],
          sites: [],
          effectivePlanId: "free",
          activeOrganizationId: null,
          activeSiteId: null,
        });
        return;
      }

      let activeOrgId = pickOrganizationIdFromMe(orgs);

      // If /me didn't include an org id, load sites without organizationId — the Worker
      // resolves the org from the session (getOrCreateOrganizationForUser) and we infer id from Site rows.
      let sitesRes = activeOrgId
        ? await getSites(activeOrgId)
        : await getSites();
      let sites = sitesRes?.success ? sitesRes.sites || [] : [];
      let effectivePlanId = sitesRes?.effectivePlanId || "free";

      if (!activeOrgId && sites.length > 0) {
        activeOrgId = pickOrganizationIdFromSite(sites[0]);
      }

      const urlActive = pickActiveSiteIdFromPath(pathnameRef.current);
      const fallbackActive = sites?.[0]?.id ?? null;

      setState((prev) => {
        const prevActive = prev?.activeSiteId ? String(prev.activeSiteId) : null;
        const prevActiveStillExists = prevActive
          ? (sites || []).some((s: any) => String(s?.id) === prevActive)
          : false;
        const resolvedActiveSiteId = urlActive || (prevActiveStillExists ? prevActive : fallbackActive);
        const activeSite =
          (sites || []).find((s: any) => String(s?.id) === String(resolvedActiveSiteId)) || null;
        const activeSitePlanId = pickPlanIdFromSite(activeSite);
        const resolvedPlanId = activeSitePlanId || effectivePlanId || "free";

        return {
          loading: false,
          authenticated: true,
          user: me?.user ?? null,
          organizations: orgs,
          sites,
          effectivePlanId: resolvedPlanId,
          activeOrganizationId: activeOrgId,
          activeSiteId: resolvedActiveSiteId ? String(resolvedActiveSiteId) : null,
        };
      });
    } catch (e) {
      console.error("[DashboardSession] refresh failed", e);
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  // Fetch user + sites once on mount (and when `refresh` is explicitly called elsewhere).
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Keep active site in sync with the URL when switching tabs under `/dashboard/[id]/...` — no API calls.
  useEffect(() => {
    const urlActive = pickActiveSiteIdFromPath(pathname);
    if (!urlActive) return;
    setState((s) => {
      if (!s.authenticated) return s;
      if (String(s.activeSiteId) === String(urlActive)) return s;
      const nextSite =
        (s.sites || []).find((site: any) => String(site?.id) === String(urlActive)) || null;
      const nextPlanId = pickPlanIdFromSite(nextSite) || s.effectivePlanId || "free";
      return { ...s, activeSiteId: String(urlActive), effectivePlanId: nextPlanId };
    });
  }, [pathname]);

  const setActiveSiteId = useCallback((siteId: string | null) => {
    setState((s) => {
      const nextSite =
        (s.sites || []).find((site: any) => String(site?.id) === String(siteId)) || null;
      const nextPlanId = pickPlanIdFromSite(nextSite) || s.effectivePlanId || "free";
      return { ...s, activeSiteId: siteId, effectivePlanId: nextPlanId };
    });
  }, []);

  const updateSiteInState = useCallback((patch: { id: string } & Record<string, any>) => {
    setState((s) => ({
      ...s,
      sites: (s.sites || []).map((site: any) => (String(site?.id) === String(patch.id) ? { ...site, ...patch } : site)),
    }));
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (e) {
      console.error("[DashboardSession] logout failed", e);
    } finally {
      setState({
        loading: false,
        authenticated: false,
        user: null,
        organizations: [],
        sites: [],
        effectivePlanId: "free",
        activeOrganizationId: null,
        activeSiteId: null,
      });
      router.push("/login");
    }
  }, [router]);

  const value: DashboardSessionApi = useMemo(
    () => ({
      ...state,
      refresh,
      setActiveSiteId,
      updateSiteInState,
      logout,
    }),
    [refresh, setActiveSiteId, state, updateSiteInState, logout]
  );

  return <DashboardSessionContext.Provider value={value}>{children}</DashboardSessionContext.Provider>;
}

export function useDashboardSession() {
  const ctx = useContext(DashboardSessionContext);
  if (!ctx) throw new Error("useDashboardSession must be used within DashboardSessionProvider");
  return ctx;
}

