"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import {  Cookie, Box } from "lucide-react";
import { useDashboardSession } from "../DashboardSessionProvider";
/** Second path segment after /dashboard that is not a site id */
const RESERVED_DASHBOARD_SEGMENTS = new Set(["profile", "all-domain"]);
function Home({className}: {className?: string}) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.707 2.29303L21.707 11.293C22.337 11.923 21.891 13 21 13H20V19C20 19.7957 19.6839 20.5587 19.1213 21.1214C18.5587 21.684 17.7957 22 17 22H16V15C16.0001 14.2348 15.7077 13.4985 15.1827 12.9418C14.6578 12.385 13.9399 12.0499 13.176 12.005L13 12H11C10.2044 12 9.4413 12.3161 8.87869 12.8787C8.31608 13.4413 8.00001 14.2044 8.00001 15V22H7.00001C6.20436 22 5.4413 21.684 4.87869 21.1214C4.31608 20.5587 4.00001 19.7957 4.00001 19V13H3.00001C2.11001 13 1.66301 11.923 2.29301 11.293L11.293 2.29303C11.4805 2.10556 11.7348 2.00024 12 2.00024C12.2652 2.00024 12.5195 2.10556 12.707 2.29303ZM13 14C13.2652 14 13.5196 14.1054 13.7071 14.2929C13.8947 14.4805 14 14.7348 14 15V22H10V15C10 14.7551 10.09 14.5187 10.2527 14.3357C10.4155 14.1526 10.6398 14.0357 10.883 14.007L11 14H13Z" fill="currentColor"/>
</svg>

  );
}

function  FileText({className}: {className?: string}) {
  return (
 <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.6667 2.5V5.83333C11.6667 6.05435 11.7545 6.26631 11.9108 6.42259C12.067 6.57887 12.279 6.66667 12.5 6.66667H15.8334" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7.50002 5.83333H8.33335M7.50002 10.8333H12.5M10.8334 14.1667H12.5M14.1667 17.5H5.83335C5.39133 17.5 4.9674 17.3244 4.65484 17.0118C4.34228 16.6993 4.16669 16.2754 4.16669 15.8333V4.16667C4.16669 3.72464 4.34228 3.30072 4.65484 2.98816C4.9674 2.67559 5.39133 2.5 5.83335 2.5H11.6667L15.8334 6.66667V15.8333C15.8334 16.2754 15.6578 16.6993 15.3452 17.0118C15.0326 17.3244 14.6087 17.5 14.1667 17.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>



);  
}
function  ScanLine({className}: {className?: string}) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.66656 7.50002V5.83335C1.66656 3.33335 3.33323 1.66669 5.83323 1.66669H14.1666C16.6666 1.66669 18.3332 3.33335 18.3332 5.83335V7.50002" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M1.66656 12.5V14.1667C1.66656 16.6667 3.33323 18.3333 5.83323 18.3333H14.1666C16.6666 18.3333 18.3332 16.6667 18.3332 14.1667V12.5" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M5.58325 7.71667L9.99992 10.275L14.3832 7.73336" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10 14.8085V10.2668" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8.96661 5.24174L6.29994 6.72509C5.69994 7.05843 5.19995 7.90009 5.19995 8.59175V11.4168C5.19995 12.1084 5.69161 12.9501 6.29994 13.2834L8.96661 14.7667C9.53327 15.0834 10.4666 15.0834 11.0416 14.7667L13.7083 13.2834C14.3083 12.9501 14.8083 12.1084 14.8083 11.4168V8.59175C14.8083 7.90009 14.3166 7.05843 13.7083 6.72509L11.0416 5.24174C10.4666 4.91674 9.53327 4.91674 8.96661 5.24174Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>


  );
}
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
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  const basePath = useMemo(() => {
    const segs = (pathname || "").split("/").filter(Boolean);
    // Before hydration, derive siteId from the URL only (matches server render)
    const resolvedId = hydrated ? activeSiteId : null;
    if (resolvedId && !RESERVED_DASHBOARD_SEGMENTS.has(String(resolvedId))) {
      return `/dashboard/${resolvedId}`;
    }
    if (segs[0] === "dashboard" && segs[1] && !RESERVED_DASHBOARD_SEGMENTS.has(segs[1])) {
      return `/dashboard/${segs[1]}`;
    }
    return "/dashboard";
  }, [pathname, activeSiteId, hydrated]);

  return (
    <div className="w-full flex justify-center mt-4.5">
      <div className="flex items-center bg-[#F1F5F9] rounded-xl ">
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
                flex items-center hover:bg-gray-50 gap-2 px-5 py-3.75 rounded-lg  text-base  transition-all
                ${
                  isActive
                    ? "bg-[#6790EA1A] text-[#111827] border-b-2  border-[#007AFF]"
                    : "text-[#4B5563] hover:text-[#111827]"
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