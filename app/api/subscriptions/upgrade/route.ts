export const runtime = 'edge';

import { NextRequest } from "next/server";
import { proxyWorkerResponse } from "@/lib/server-api";



export async function POST(request: NextRequest) {
  const cookie = request.headers.get("cookie") || "";
  const body = await request.json();
  return proxyWorkerResponse("/api/subscriptions/upgrade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cookies: cookie,
  });
}
