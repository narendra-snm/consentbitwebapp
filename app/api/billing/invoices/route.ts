export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { proxyWorkerResponse } from "@/lib/server-api";



export async function GET(request: NextRequest) {
  const cookie = request.headers.get("cookie") || "";
  const { searchParams } = new URL(request.url);
  const organizationId = (searchParams.get("organizationId") || "").trim();
  const limit = (searchParams.get("limit") || "20").trim();

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId required", invoices: [] }, { status: 400 });
  }

  return proxyWorkerResponse(
    `/api/billing/invoices?organizationId=${encodeURIComponent(organizationId)}&limit=${encodeURIComponent(limit)}`,
    { method: "GET", cookies: cookie },
  );
}
