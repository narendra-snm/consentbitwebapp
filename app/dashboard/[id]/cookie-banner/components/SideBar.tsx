

import { useState } from "react";
import svgPaths from "./svg";

interface SidebarProps {
  
  active: string;
  setActive: (active: string) => void;
}

export function Sidebar({ active, setActive   }: SidebarProps) {

  const menuItems = [
    { name: "General", icon: "general" },
    { name: "Content", icon: "content" },
    { name: "Layout", icon: "layout" },
    { name: "Colors", icon: "colors" },
    { name: "Type", icon: "type" },
  ];

  return (
    <div className=" h-screen w-[172px] bg-white border-r border-gray-200 flex flex-col ">

      {menuItems.map((item) => {
        const isActive = active === item.name;

        return (
          <button
            key={item.name}
            onClick={() => setActive(item.name)}
            className={`relative flex items-center gap-4 px-6 h-16 text-left transition-all
              
              ${isActive ? "bg-[#E6F1FD]" : "hover:bg-gray-50"}
              
            `}
          >
            {/* Active blue vertical bar */}
            {isActive && (
              <div className="absolute right-0 h-16 w-[3px] bg-[#007AFF]" />
            )}

            {/* Icon */}
            <div>
              {item.icon === "general" && (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <path
                    d={svgPaths.p3cccb600}
                    stroke={isActive ? "#007AFF" : "#292D32"}
                    strokeWidth="1.5"
                  />
                  <path
                    d={svgPaths.p243d2300}
                    stroke={isActive ? "#007AFF" : "#292D32"}
                    strokeWidth="1.5"
                  />
                </svg>
              )}

              {item.icon === "content" && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.3701 8.87988H17.6201" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6.37988 8.87988L7.12988 9.62988L9.37988 7.37988" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.3701 15.8799H17.6201" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6.37988 15.8799L7.12988 16.6299L9.37988 14.3799" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

              )}
                {item.icon === "layout" && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M17 10H19C21 10 22 9 22 7V5C22 3 21 2 19 2H17C15 2 14 3 14 5V7C14 9 15 10 17 10Z" stroke="#2A2E33" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M5 22H7C9 22 10 21 10 19V17C10 15 9 14 7 14H5C3 14 2 15 2 17V19C2 21 3 22 5 22Z" stroke="#2A2E33" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6 10C8.20914 10 10 8.20914 10 6C10 3.79086 8.20914 2 6 2C3.79086 2 2 3.79086 2 6C2 8.20914 3.79086 10 6 10Z" stroke="#2A2E33" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M18 22C20.2091 22 22 20.2091 22 18C22 15.7909 20.2091 14 18 14C15.7909 14 14 15.7909 14 18C14 20.2091 15.7909 22 18 22Z" stroke="#2A2E33" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
</svg>


              )}

                {item.icon === "colors" && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.01012 18.0001L3.00012 13.9901C1.66012 12.6501 1.66012 11.32 3.00012 9.98004L9.68012 3.30005L17.0301 10.6501C17.4001 11.0201 17.4001 11.6201 17.0301 11.9901L11.0101 18.0101C9.69012 19.3301 8.35012 19.3301 7.01012 18.0001Z" stroke="#2A2E33" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8.34961 1.94995L9.68961 3.28992" stroke="#2A2E33" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M2.07031 11.92L17.1903 11.26" stroke="#2A2E33" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M3 22H16" stroke="#2A2E33" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M18.85 15C18.85 15 17 17.01 17 18.24C17 19.26 17.83 20.09 18.85 20.09C19.87 20.09 20.7 19.26 20.7 18.24C20.7 17.01 18.85 15 18.85 15Z" stroke="#2A2E33" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>


              )}
                {item.icon === "type" && (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.99023 5.93007V4.42007C1.99023 3.40007 2.82023 2.57007 3.84023 2.57007H16.7602C17.7802 2.57007 18.6102 3.40007 18.6102 4.42007V5.93007" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10.2998 18.1001V3.32007" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6.8999 18.1001H12.4799" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M13.6802 10.3401H20.6902C21.4202 10.3401 22.0102 10.9301 22.0102 11.6601V12.4601" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M16.0801 21.4301V10.8701" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M13.9399 21.4299H18.2199" stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>


              )}
            </div>

            {/* Label */}
            <span
              className={`text-base font-medium tracking-tight
                ${isActive ? "text-[#007AFF]" : "text-[#111827]"}
              `}
            >
              {item.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}