"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useDashboardSession } from "../DashboardSessionProvider";
import AddNewSiteModal from "./AddNewSiteModal";
export default function Header() {
  const [domainOpen, setDomainOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
const [addSiteOpen, setAddSiteOpen] = useState(false);
  const domainRef = useRef<any>(null);
  const notifRef = useRef<any>(null);

  const router = useRouter();
  const pathname = usePathname();
  const pathParts = (pathname || "").split("/").filter(Boolean);
  const urlSiteId = pathParts[0] === "dashboard" && pathParts.length >= 2 ? pathParts[1] : null;
  const { sites, activeSiteId, setActiveSiteId, logout, loading } = useDashboardSession();
  const activeSite = sites.find((s: any) => String(s?.id) === String(activeSiteId)) || sites[0] || null;

  const notifications = new Array(7).fill({
    title: "Lorem ipsum dolor sit amet",
    desc: "Your Exotic Veggie Platter is on the menu. Get excited!",
    time: "2 days ago",
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: any) {
      if (!domainRef.current?.contains(e.target)) setDomainOpen(false);
      if (!notifRef.current?.contains(e.target)) setNotifOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayDomain =
    activeSite?.domain || activeSite?.name || (loading ? "Loading…" : "Select a site");

  const handleSelectSite = (site: any) => {
    setActiveSiteId(site?.id ? String(site.id) : null);
    setDomainOpen(false);
    if (site?.id) router.push(`/dashboard/${site.id}`);
  };

  return (
    <header className="w-full bg-white border-b border-[#00000010] px-8 py-6.5 flex items-center justify-between rounded-t-xl">
      {/* LEFT SECTION */}
   {  addSiteOpen && <AddNewSiteModal  onClose={() => setAddSiteOpen(false)} />}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <img
          src="/images/ConsentBit-logo-Dark.png"
          alt="Consentbit"
          width={170}
          height={21}
        />

        {/* DOMAIN SELECTOR */}
        <div ref={domainRef} className="relative flex items-center gap-2">
          <button
            onClick={() => setDomainOpen(!domainOpen)}
            className="border-2 border-[#E6F1FD] bg-[#E6F1FD] rounded-md px-3 py-2 text-sm"
          >
            {displayDomain}
          </button>

          <button onClick={() =>{ 
            setAddSiteOpen(true)
            setDomainOpen(false)

          }}  className="w-8 cursor-pointer h-8 flex items-center justify-center rounded-md bg-[#E6F1FD] text-[#007AFF]">
            <Plus size={16} />
          </button>

          {domainOpen && (
            <div className="absolute top-[110%] left-0 w-[300px] bg-white rounded-xl  shadow-[0_12px_40px_rgba(15,23,42,0.16)]  overflow-hidden z-50">
              {sites.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSite(s)}
                  className={`px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 ${
                    activeSite?.id === s.id ? "bg-[#E6F1FD] text-[#007AFF]" : ""
                  }`}
                >
                  {s?.domain || s?.name || s?.id}
                </div>
              ))}

              <div className="border-t" />

              <div className="flex justify-between px-4 py-3 text-sm">
                <button className="text-[#007AFF] cursor-pointer" onClick={()=>router.push("/dashboard/all-domain")}>View All →</button>
                <button className="text-[#007AFF] cursor-pointer" onClick={() =>{ 
            setAddSiteOpen(true)
            setDomainOpen(false)

          }}>
                  Add New +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* VIEW ALL DOMAINS */}
        <button onClick={()=>router.push("/dashboard/all-domain")} className="flex items-center gap-2 text-base cursor-pointer  text-[#4B5563]">
          <Globe size={16} />
          View all Domains
        </button>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-4">
        {/* PLAN */}
        <div className="flex items-center text-xs bg-[#E6F1FD] border border-[#E6F1FD] rounded-lg overflow-hidden">
          <span className="px-2 py-3.5 bg-gray-100 text-gray-600">
            Current Plan :
          </span>
          <span className="px-3 py-1 bg-[#E6F1FD]">Free</span>
        </div>

        {/* UPGRADE BUTTON */}
        <button className="px-3.5 py-3.5 rounded-lg bg-[#747BE0] text-white text-sm">
          Update to Pro
        </button>

        {/* SETTINGS */}
        <img src="/images/Button.svg" className="mt-1 cursor-pointer" />

        {/* LOGOUT */}
        <button
          type="button"
          onClick={logout}
          disabled={loading}
          className="px-3 py-3.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Logout
        </button>

        {/* NOTIFICATION */}
        <div ref={notifRef} className="relative">
          <img
            src="/images/bell.svg"
            className="mt-1 cursor-pointer"
            onClick={() => setNotifOpen(!notifOpen)}
          />

          {notifOpen && (
            <div className="absolute right-0 top-[180%] w-[412px] bg-white rounded-xl shadow-[0_12px_40px_rgba(15,23,42,0.16)] border border-[#E5E7EB] z-50">
              {/* Optional header / title */}
              {/* <div className="px-4 py-3 border-b border-[#E5E7EB]">
                <p className="text-sm font-semibold text-gray-800">Notifications</p>
              </div> */}

              <div className="max-h-[700px] overflow-y-auto">
                {notifications.map((n, i) => (
                  <div
                    key={i}
                    className="flex gap-3 px-5 py-4 border-b border-[#F3F4F6] last:border-none hover:bg-[#F9FAFB] transition-colors"
                  >
                    {/* Red dot on left */}
                    <div className="flex items-start pt-1">
                      <span className="w-2 h-2 rounded-full bg-[#F97373]" />
                    </div>

                    {/* Text */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">
                          {n.title}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 leading-snug">
                        {n.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AVATAR */}

        <img src="/images/Icon.svg"  className="mt-1 rounded-full cursor-pointer" onClick={()=>router.push("/dashboard/profile")} />
      </div>
    </header>
  );
}
