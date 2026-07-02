export const runtime = 'edge';



import { serverFetch } from '@/lib/server-api';



export async function POST(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const res = await serverFetch('/api/auth/logout', { method: 'POST', cookies: cookie });
  const text = await res.text().catch(() => '');
  return new Response(text, {
    status: res.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': 'sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
    },
  });
}
