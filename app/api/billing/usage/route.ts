import { NextRequest, NextResponse } from "next/server";
import { proxyWorkerResponse } from "@/lib/server-api";

export const runtime = 'edge';

export async function GET(request: NextRequest) {
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

  return proxyWorkerResponse(`/api/billing/usage?${query}`, { method: "GET", cookies: cookie });
}
