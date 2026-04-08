import { NextResponse } from 'next/server';
import { serverFetch, serverFetchJson } from '@/lib/server-api';

export const runtime = 'edge';

function jsonOrText(res: Response) {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('application/json')) {
    return res.json().catch(async () => ({ success: false, error: await res.text() }));
  }
  return res.text().then((t) => ({ success: false, error: t || 'Non-JSON response from upstream' }));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const qs = url.search ? url.search : '';
    const cookie = request.headers.get('cookie') || '';

    const workerRes = await serverFetch(`/api/sites${qs}`, {
      method: 'GET',
      cookies: cookie,
    });

    const data = await jsonOrText(workerRes);
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: any) {
    console.error('Sites GET proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load sites' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('cookie') || '';

    const { data, status } = await serverFetchJson('/api/sites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      cookies: cookie,
      body: JSON.stringify(body),
    });

    return NextResponse.json(data, { status });
  } catch (error: any) {
    console.error('Sites PATCH proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update site' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const qs = url.search ? url.search : '';
    const cookie = request.headers.get('cookie') || '';

    const workerRes = await serverFetch(`/api/sites${qs}`, {
      method: 'DELETE',
      cookies: cookie,
    });

    const data = await jsonOrText(workerRes);
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: any) {
    console.error('Sites DELETE proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete site' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('cookie') || '';

    const workerRes = await serverFetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cookies: cookie,
      body: JSON.stringify(body),
    });

    const data = await jsonOrText(workerRes);
    return NextResponse.json(data, { status: workerRes.status });
  } catch (error: any) {
    console.error('Sites POST proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create site' },
      { status: 500 }
    );
  }
}

