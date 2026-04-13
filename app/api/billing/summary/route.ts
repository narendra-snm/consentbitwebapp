import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const { searchParams } = new URL(request.url);
    const organizationId = (searchParams.get("organizationId") || "").trim();

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId required" }, { status: 400 });
    }

    const res = await serverFetch(
      `/api/billing/summary?organizationId=${encodeURIComponent(organizationId)}`,
      { method: "GET", cookies: cookie },
    );
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...(res.headers.get('X-Content-Encoded') ? { 'X-Content-Encoded': '1' } : {}),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load billing summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
