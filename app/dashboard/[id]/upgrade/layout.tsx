"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useDashboardSession } from "../../DashboardSessionProvider";
import { isTeamSite } from "@/lib/team-role";

// Plans and billing are the account owner's. Upgrade links are hidden for team
// Admins/Members, but several screens link here directly, so the route itself stops
// them before any checkout can start.
export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const { sites } = useDashboardSession();
  const siteId = String((params as { id?: string })?.id ?? "");
  const site = (sites || []).find((s: any) => String(s?.id) === siteId);

  if (!isTeamSite(site)) return <>{children}</>;

  return (
    <div className="max-w-[560px] mx-auto mt-16 px-4">
      <div className="bg-[#fbfbfb] border border-[#ebebeb] rounded-[10px] px-6 py-8 text-center">
        <p className="text-[16px] font-semibold text-[#111827] mb-2">Plans are managed by the account owner</p>
        <p className="text-[13px] text-[#6b7280] mb-5">
          You have team access to {site?.domain || site?.name || "this site"}. Ask the account owner to change its
          plan.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/${siteId}`)}
          className="h-[38px] px-5 rounded-[8px] bg-[#007aff] text-white text-[13px] font-medium hover:bg-[#0069d9]"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
