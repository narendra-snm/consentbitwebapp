export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { proxyWorkerResponse } from "@/lib/server-api";



export async function POST(request: NextRequest) {
  const cookie = request.headers.get("cookie") || "";
  const body = await request.json().catch(() => ({}));
  const organizationId = (body.organizationId || "").trim();
  const returnUrl = body.returnUrl || body.return_url || "";

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  }

  return proxyWorkerResponse("/api/billing/portal", {
    method: "POST",
    cookies: cookie,
    body: { organizationId, returnUrl },
  });
}
