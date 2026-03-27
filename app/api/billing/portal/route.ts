import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

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

    const response = await serverFetch("/api/billing/portal", {
      method: "POST",
      cookies: cookie,
      body: { organizationId, returnUrl },
    });
    const data = await response.json().catch(async () => ({ error: await response.text() }));
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create portal session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
