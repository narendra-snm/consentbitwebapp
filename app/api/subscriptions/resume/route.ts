export const runtime = 'edge';

import { NextRequest } from "next/server";
import { proxyWorkerResponse } from "@/lib/server-api";

// Undo a scheduled cancellation — the same subscription keeps renewing (no new checkout,
// same billing date and saved card). Mirrors ../cancel/route.ts.
export async function POST(request: NextRequest) {
  const cookie = request.headers.get("cookie") || "";
  const body = await request.json();
  return proxyWorkerResponse("/api/subscriptions/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cookies: cookie,
  });
}
