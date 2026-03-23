import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const { searchParams } = new URL(request.url);
    const organizationId = (searchParams.get("organizationId") || "").trim();
    const limit = (searchParams.get("limit") || "20").trim();

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId required", invoices: [] }, { status: 400 });
    }

    const response = await serverFetch(
      `/api/billing/invoices?organizationId=${encodeURIComponent(organizationId)}&limit=${encodeURIComponent(limit)}`,
      {
        method: "GET",
        cookies: cookie,
      },
    );
    const data = await response
      .json()
      .catch(async () => ({ error: await response.text(), invoices: [] }));
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load billing invoices";
    return NextResponse.json({ error: message, invoices: [] }, { status: 500 });
  }
}

