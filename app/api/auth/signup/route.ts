import { proxyWorkerResponse } from '@/lib/server-api';



export async function POST(request: Request) {
  const body = await request.json();
  const normalizedBody =
    body && typeof body === 'object'
      ? {
          ...body,
          password_hash: body.password_hash ?? body.passwordHash,
          confirm_password_hash: body.confirm_password_hash ?? body.confirmPasswordHash,
        }
      : body;
  return proxyWorkerResponse(
    '/api/auth/signup',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedBody),
    },
    { forwardSetCookie: true, requestUrl: request.url },
  );
}
