import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const body = await request.json();
    const response = await serverFetch("/api/subscriptions/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cookies: cookie,
    });
    const data = await response
      .json()
      .catch(async () => ({ success: false, error: await response.text() }));
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Cancel subscription failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
