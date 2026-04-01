import type React from "react";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardSessionProvider } from "./DashboardSessionProvider";
import PostSetupOverlay from "./components/PostSetupOverlay";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sid = cookieStore.get("sid")?.value;

  if (!sid) {
    redirect("/login");
  }

  return (
    <DashboardSessionProvider>
      {children}
      <Suspense>
        <PostSetupOverlay />
      </Suspense>
    </DashboardSessionProvider>
  );
}
