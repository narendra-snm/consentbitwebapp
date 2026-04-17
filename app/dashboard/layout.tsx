
import type React from "react";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardSessionProvider } from "./DashboardSessionProvider";
import PostSetupOverlay from "./components/PostSetupOverlay";
import Footer from "@/components/auth/Footer";
import Header from "./components/header";
import DashboardTabs from "./components/DashboardTabs";

// Never cache this layout — it contains authenticated user data.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sid = cookieStore.get("sid")?.value;

  if (!sid) {
    redirect("/login");
  }

  return (
    <DashboardSessionProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="max-w-[1148px] mx-auto pb-4.25 w-full">
          <DashboardTabs />
        </div>
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <Suspense>
        <PostSetupOverlay />
      </Suspense>
    </DashboardSessionProvider>
  );
}
