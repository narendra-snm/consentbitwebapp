"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Home, Cookie, ScanLine, FileText, Box } from "lucide-react";
import { useDashboardSession } from "../DashboardSessionProvider";

/** Second path segment after /dashboard that is not a site id */
const RESERVED_DASHBOARD_SEGMENTS = new Set(["profile", "all-domain"]);

const tabs = [
  {
    name: "Dashboard",
    slug: "",
    icon: Home,
  },
  {
    name: "Cookie Banner",
    slug: "cookie-banner",
    icon: Cookie,
  },
  {
    name: "Scan",
    slug: "scan",
    icon: ScanLine,
  },
  {
    name: "Consent Logs",
    slug: "consent-logs",
    icon: FileText,
  },
  {
    name: "Upgrade",
    slug: "upgrade",
    icon: Box,
  },
];

export default function DashboardTabs() {
  const pathname = usePathname();
  const { activeSiteId } = useDashboardSession();

  const basePath = useMemo(() => {
    const segs = (pathname || "").split("/").filter(Boolean);
    if (activeSiteId && !RESERVED_DASHBOARD_SEGMENTS.has(String(activeSiteId))) {
      return `/dashboard/${activeSiteId}`;
    }
    if (segs[0] === "dashboard" && segs[1] && !RESERVED_DASHBOARD_SEGMENTS.has(segs[1])) {
      return `/dashboard/${segs[1]}`;
    }
    return "/dashboard";
  }, [pathname, activeSiteId]);

  return (
    <div className="w-full flex justify-center mt-4.5">
      <div className="flex items-center bg-[#F1F5F9] rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          const href = tab.slug ? `${basePath}/${tab.slug}` : basePath;

          const isActive = tab.slug
            ? pathname.startsWith(href)
            : pathname === "/dashboard" || pathname === basePath;

          return (
            <Link
              key={tab.name}
              href={href}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all
                ${
                  isActive
                    ? "bg-[#6790EA1A] text-[#007AFF] border-b-2 border-[#007AFF]"
                    : "text-gray-600 hover:text-black"
                }
              `}
            >
              <Icon
                size={18}
                className={isActive ? "text-[#1E66F5]" : "text-gray-500"}
              />
              {tab.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}