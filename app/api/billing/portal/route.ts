import { NextRequest, NextResponse } from "next/server";
import { serverFetchJson } from "@/lib/server-api";

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const body = await request.json().catch(() => ({}));
    const organizationId = (body.organizationId || "").trim();
    const returnUrl = body.returnUrl || body.return_url || "";

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId required" }, { status: 400 });
    }

    const { data, status } = await serverFetchJson("/api/billing/portal", {
      method: "POST",
      cookies: cookie,
      body: { organizationId, returnUrl },
    });
    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create portal session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
