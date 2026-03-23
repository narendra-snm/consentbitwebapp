import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const { searchParams } = new URL(request.url);
    const organizationId = (searchParams.get("organizationId") || "").trim();
    const siteId = (searchParams.get("siteId") || "").trim();

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId required" }, { status: 400 });
    }

    const query = siteId
      ? `organizationId=${encodeURIComponent(organizationId)}&siteId=${encodeURIComponent(siteId)}`
      : `organizationId=${encodeURIComponent(organizationId)}`;
    const response = await serverFetch(`/api/billing/usage?${query}`, {
      method: "GET",
      cookies: cookie,
    });
    const data = await response
      .json()
      .catch(async () => ({ error: await response.text() }));
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load billing usage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

