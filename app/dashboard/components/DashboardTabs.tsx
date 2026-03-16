"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Cookie, ScanLine, FileText, Box } from "lucide-react";

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

  const basePath = pathname.split("/").slice(0, 3).join("/"); 
  // /dashboard/1234

  return (
    <div className="w-full flex justify-center mt-4.5">
      <div className="flex items-center bg-[#F1F5F9] rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          const href = tab.slug ? `${basePath}/${tab.slug}` : basePath;

          const isActive = tab.slug
            ? pathname.includes(`/${tab.slug}`)
            : pathname.split("/").length <= 3;

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