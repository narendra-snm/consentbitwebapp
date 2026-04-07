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
import { getDashboardInit } from "@/lib/client-api";

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
  refresh: (opts?: DashboardRefreshOptions) => Promise<string>;
  setActiveSiteId: (siteId: string | null) => void;
  updateSiteInState: (patch: { id: string } & Record<string, any>) => void;
  logout: () => Promise<void>;
};

const DashboardSessionContext = createContext<DashboardSessionApi | null>(null);

/** Must match DashboardTabs — these segments are not site ids. */
const RESERVED_DASHBOARD_SEGMENTS = new Set(["profile", "all-domain"]);

const SESSION_CACHE_KEY = "cbSessionCache";
const SESSION_CACHE_TTL = 20 * 60 * 1000; // 20 minutes
const LAST_USER_KEY = "cbLastUserEmail";

function readSessionCache(): any | null {
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(SESSION_CACHE_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: any; ts: number };
    if (Date.now() - parsed.ts > SESSION_CACHE_TTL) { sessionStorage.removeItem(SESSION_CACHE_KEY); return null; }
    const cached = parsed.data;
    // Prevent "previous user flashes": only use cached dashboard data if it matches
    // the last authenticated email we recorded for this browser session.
    const lastEmail =
      typeof sessionStorage !== "undefined" ? (sessionStorage.getItem(LAST_USER_KEY) || "").trim().toLowerCase() : "";
    const cachedEmail = String(cached?.user?.email || "").trim().toLowerCase();
    if (lastEmail && cachedEmail && lastEmail !== cachedEmail) return null;
    return cached;
  } catch { return null; }
}

function writeSessionCache(data: any) {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
      const email = String(data?.user?.email || "").trim().toLowerCase();
      if (email) sessionStorage.setItem(LAST_USER_KEY, email);
    }
  } catch { /* ignore quota errors */ }
}

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
  const plan = raw != null ? String(raw).trim().toLowerCase() : "";
  // Return null for "free" so callers can fall back to the org-level effectivePlanId.
  // Subscriptions created via the upgrade flow are stored at org level (siteId = null),
  // so the per-site row stays "free" even after a successful payment.
  if (!plan || plan === "free") return null;
  return plan;
}

export function DashboardSessionProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData?: any;
}) {
  const router = useRouter();
  const pathname = usePathname();
  /** Latest path without putting `pathname` in `refresh` deps (avoids refetch on every tab switch). */
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  /** True when state was seeded from sessionStorage or SSR — data is fresh, skip initial fetch. */
  const skipInitialRefresh = useRef(false);

  const [state, setState] = useState<DashboardSessionState>(() => {
    // 1. One-time post-login seed (set by verifyVerificationCode)
    const ssData = (() => {
      try {
        const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('dashboardInit') : null;
        if (raw) { sessionStorage.removeItem('dashboardInit'); return JSON.parse(raw); }
      } catch {}
      return null;
    })();
    // 2. Persistent session cache (written after every successful refresh)
    const seed = ssData ?? initialData ?? readSessionCache();
    console.log("SEED:", seed);
    if (seed?.authenticated) {
      skipInitialRefresh.current = true; // data is fresh — skip getDashboardInit on mount
      const orgs = Array.isArray(seed.organizations) ? seed.organizations : [];
      const sites = Array.isArray(seed.sites) ? seed.sites : [];
      const activeOrgId = pickOrganizationIdFromMe(orgs) || (sites.length > 0 ? pickOrganizationIdFromSite(sites[0]) : null);
      const activeSite = sites[0] ?? null;
      const activeSitePlanId = pickPlanIdFromSite(activeSite);
      return {
        loading: false,
        authenticated: true,
        user: seed.user ?? null,
        organizations: orgs,
        sites,
        effectivePlanId: activeSitePlanId || seed.effectivePlanId || "free",
        activeOrganizationId: activeOrgId,
        activeSiteId: activeSite?.id ? String(activeSite.id) : null,
      };
    }
    return {
      loading: true,
      authenticated: false,
      user: null,
      organizations: [],
      sites: [],
      effectivePlanId: "free",
      activeOrganizationId: null,
      activeSiteId: null,
    };
  });

  const refresh = useCallback(async (opts?: DashboardRefreshOptions): Promise<string> => {
    const showLoading = opts?.showLoading !== false;
    if (showLoading) setState((s) => ({ ...s, loading: true }));
    try {
      const data = await getDashboardInit();
      const authenticated = Boolean(data?.authenticated);
      const orgs = Array.isArray(data?.organizations) ? data.organizations : [];

      if (!authenticated) {
        // Clear stale cache so next login starts fresh
        try {
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.removeItem(SESSION_CACHE_KEY);
            sessionStorage.removeItem("dashboardInit");
            sessionStorage.removeItem("cbLastUserEmail");
          }
        } catch { /* ignore */ }
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
        router.replace("/login");
        return "free";
      }

      let activeOrgId = pickOrganizationIdFromMe(orgs);
      let sites = Array.isArray(data?.sites) ? data.sites : [];
      let effectivePlanId = data?.effectivePlanId || "free";

      if (!activeOrgId && sites.length > 0) {
        activeOrgId = pickOrganizationIdFromSite(sites[0]);
      }

      const urlActive = pickActiveSiteIdFromPath(pathnameRef.current);
      const fallbackActive = sites?.[0]?.id ?? null;

      let resolvedPlanId = "free";
      setState((prev) => {
        const prevActive = prev?.activeSiteId ? String(prev.activeSiteId) : null;
        const prevActiveStillExists = prevActive
          ? (sites || []).some((s: any) => String(s?.id) === prevActive)
          : false;
        const resolvedActiveSiteId = urlActive || (prevActiveStillExists ? prevActive : fallbackActive);
        const activeSite =
          (sites || []).find((s: any) => String(s?.id) === String(resolvedActiveSiteId)) || null;
        const activeSitePlanId = pickPlanIdFromSite(activeSite);
        resolvedPlanId = activeSitePlanId || effectivePlanId || "free";

        const next = {
          loading: false,
          authenticated: true,
          user: data?.user ?? null,
          organizations: orgs,
          sites,
          effectivePlanId: resolvedPlanId,
          activeOrganizationId: activeOrgId,
          activeSiteId: resolvedActiveSiteId ? String(resolvedActiveSiteId) : null,
        };

        // Persist to sessionStorage so next page visit loads instantly without a fetch
        writeSessionCache(next);

        return next;
      });
      return resolvedPlanId;
    } catch (e) {
      console.error("[DashboardSession] refresh failed", e);
      setState((s) => ({ ...s, loading: false }));
      return "free";
    }
  }, [router]);

  // Always reconcile with the server on mount. Seeded/cached sessions used to skip this entirely,
  // so fields like `pagesScanned` from dashboard-init never arrived (UI showed "—").
  useEffect(() => {
    const silent = skipInitialRefresh.current;
    skipInitialRefresh.current = false;
    void refresh({ showLoading: !silent });
  }, [refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect to login if session is not authenticated after loading completes.
  useEffect(() => {
    if (!state.loading && !state.authenticated) {
      router.replace("/login");
    }
  }, [state.loading, state.authenticated, router]);

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
    // Clear caches and redirect immediately — don't wait for the API call
    // to avoid a flash of empty/blue dashboard state before the login page loads.
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(SESSION_CACHE_KEY);
        sessionStorage.removeItem("dashboardInit");
        sessionStorage.removeItem("cbLastUserEmail");
      }
    } catch { /* ignore */ }
    router.push("/login");
    // Fire-and-forget the logout API call in the background
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch((e) => {
      console.error("[DashboardSession] logout failed", e);
    });
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

