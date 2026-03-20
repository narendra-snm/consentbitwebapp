import type React from "react";
import { DashboardSessionProvider } from "./DashboardSessionProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardSessionProvider>{children}</DashboardSessionProvider>;
}

