"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Plus } from "lucide-react";

export default function Header() {
  const [domainOpen, setDomainOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const domainRef = useRef<any>(null);
  const notifRef = useRef<any>(null);

  const domains = [
    "Https.sitenamehere.com",
    "Https.sitenamehere.com",
    "Https.sitenamehere.com",
  ];

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

  return (
    <header className="w-full bg-white border-b border-[#00000010] px-8 py-6.5 flex items-center justify-between rounded-t-xl">
      {/* LEFT SECTION */}
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
            acme.com
          </button>

          <button className="w-8 h-8 flex items-center justify-center rounded-md bg-[#E6F1FD] text-[#007AFF]">
            <Plus size={16} />
          </button>

          {domainOpen && (
            <div className="absolute top-[110%] left-0 w-[300px] bg-white rounded-xl  shadow-[0_12px_40px_rgba(15,23,42,0.16)]  overflow-hidden z-50">
              {domains.map((d, i) => (
                <div
                  key={i}
                  className={`px-4 py-3 text-sm cursor-pointer ${
                    i === 0
                      ? "bg-[#E6F1FD] text-[#007AFF]"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {d}
                </div>
              ))}

              <div className="border-t" />

              <div className="flex justify-between px-4 py-3 text-sm">
                <button className="text-[#007AFF]">View All →</button>
                <button className="text-[#007AFF]">Add New +</button>
              </div>
            </div>
          )}
        </div>

        {/* VIEW ALL DOMAINS */}
        <button className="flex items-center gap-2 text-base text-[#4B5563]">
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
        <img src="/images/Icon.svg" className="mt-1 rounded-full" />
      </div>
    </header>
  );
}
