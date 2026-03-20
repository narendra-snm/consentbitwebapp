"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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

type DashboardSessionApi = DashboardSessionState & {
  refresh: () => Promise<void>;
  setActiveSiteId: (siteId: string | null) => void;
  updateSiteInState: (patch: { id: string } & Record<string, any>) => void;
  logout: () => Promise<void>;
};

const DashboardSessionContext = createContext<DashboardSessionApi | null>(null);

function pickActiveSiteIdFromPath(pathname: string | null): string | null {
  const parts = (pathname || "").split("/").filter(Boolean);
  if (parts[0] !== "dashboard") return null;
  if (parts.length < 2) return null;
  const id = parts[1];
  if (!id || id === "one") return null;
  return id;
}

export function DashboardSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

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

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const me = await getMe();
      const authenticated = Boolean(me?.authenticated);
      const orgs = me?.organizations ?? [];
      const activeOrgId = orgs?.[0]?.id ?? null;

      if (!authenticated || !activeOrgId) {
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

      const sitesRes = await getSites(activeOrgId);
      const sites = sitesRes?.success ? sitesRes.sites || [] : [];
      const effectivePlanId = sitesRes?.effectivePlanId || "free";

      const urlActive = pickActiveSiteIdFromPath(pathname);
      const fallbackActive = sites?.[0]?.id ?? null;
      const activeSiteId = urlActive || fallbackActive;

      setState({
        loading: false,
        authenticated: true,
        user: me?.user ?? null,
        organizations: orgs,
        sites,
        effectivePlanId,
        activeOrganizationId: activeOrgId,
        activeSiteId: activeSiteId ? String(activeSiteId) : null,
      });
    } catch (e) {
      console.error("[DashboardSession] refresh failed", e);
      setState((s) => ({ ...s, loading: false }));
    }
  }, [pathname]);

  useEffect(() => {
    refresh();
    // refresh when route changes so activeSiteId stays in sync
  }, [refresh]);

  const setActiveSiteId = useCallback((siteId: string | null) => {
    setState((s) => ({ ...s, activeSiteId: siteId }));
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

