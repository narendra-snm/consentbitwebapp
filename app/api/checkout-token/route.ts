export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const res = await proxyWorkerResponse('/api/checkout-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export async function GET(request: NextRequest) {
  const { search } = new URL(request.url);
  const res = await proxyWorkerResponse(`/api/checkout-token${search}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
