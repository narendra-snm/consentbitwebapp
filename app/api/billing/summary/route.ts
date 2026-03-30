import { NextRequest, NextResponse } from "next/server";
import { serverFetchJson } from "@/lib/server-api";

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const { searchParams } = new URL(request.url);
    const organizationId = (searchParams.get("organizationId") || "").trim();

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId required" }, { status: 400 });
    }

    const { data, status } = await serverFetchJson(
      `/api/billing/summary?organizationId=${encodeURIComponent(organizationId)}`,
      { method: "GET", cookies: cookie },
    );
    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load billing summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
