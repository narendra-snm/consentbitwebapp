export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { proxyWorkerResponse } from '@/lib/server-api';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyWorkerResponse('/api/checkout-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function GET(request: NextRequest) {
  const { search } = new URL(request.url);
  return proxyWorkerResponse(`/api/checkout-token${search}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}
