export const runtime = 'edge';

// GET /api/checkout-session-redirect?session_id=cs_xxx&redirect=<encoded url>
// Fetches Stripe session details server-side, appends them as URL params, then redirects.
import { NextRequest, NextResponse } from 'next/server';
import { serverFetchJson } from '@/lib/server-api';



interface SessionData {
  success: boolean;
  amount?: string;
  currency?: string;
  transaction_id?: string;
  date_of_purchase?: string;
  plan_id?: string;
  plan_type?: string;
  interval?: string;
  invoice_id?: string;
  invoice_url?: string;
  customer_email?: string;
  payment_status?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId  = searchParams.get('session_id') ?? '';
  const redirectTo = searchParams.get('redirect')   ?? '';

  if (!redirectTo) {
    return new NextResponse('Bad Request: missing redirect param', { status: 400 });
  }
  // If session_id is missing or invalid just redirect without extra params
  if (!sessionId.startsWith('cs_')) {
    return NextResponse.redirect(redirectTo, { status: 302 });
  }

  let data: SessionData = { success: false };
  try {
    const { data: json } = await serverFetchJson(
      `/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`,
      { method: 'GET' },
    );
    data = json;
  } catch {
    // Best-effort — redirect anyway without extra params
  }

  const dest = new URL(redirectTo);
  if (data.success) {
    if (data.amount)         dest.searchParams.set('amount',         data.amount);
    if (data.currency)       dest.searchParams.set('currency',       data.currency);
    if (data.transaction_id) dest.searchParams.set('transaction_id', data.transaction_id);
    if (data.date_of_purchase) dest.searchParams.set('date',         data.date_of_purchase);
    if (data.plan_id)        dest.searchParams.set('plan_id',        data.plan_id);
    if (data.plan_type)      dest.searchParams.set('plan_type',      data.plan_type);
    if (data.interval)       dest.searchParams.set('interval',       data.interval);
    if (data.invoice_id)     dest.searchParams.set('invoice_id',     data.invoice_id);
    if (data.invoice_url)    dest.searchParams.set('invoice_url',    data.invoice_url);
    if (data.customer_email) dest.searchParams.set('email',          data.customer_email);
    if (data.payment_status) dest.searchParams.set('payment_status', data.payment_status);
  }

  return NextResponse.redirect(dest.toString(), { status: 302 });
}
