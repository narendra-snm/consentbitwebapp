
/** Hash password for sending to server (never send plain password in request body). */
export async function hashPasswordForRequest(email: string, password: string): Promise<string> {
  const e = email.trim().toLowerCase();
  const p = (password ?? '').trim();
  const data = new TextEncoder().encode(`${e}|${p}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
//password hashing ends here


//login starts here

export async function login(email: string, password: string) {
  const emailNorm = email.trim().toLowerCase();
  const passwordHash = await hashPasswordForRequest(emailNorm, password);
  // Send hash; optionally send password so backend can verify server-side if hash mismatch (e.g. encoding)
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email: emailNorm, passwordHash, password }),
  });

  if (!res.ok) {
    throw new Error(`Login failed: ${res.status}`);
  }

  return res.json();

}
//login ends here

// Passwordless OTP auth starts here
export async function requestVerificationCode(payload: {
  email: string;
  purpose: 'login' | 'signup';
  name?: string;
}) {
  const res = await fetch('/api/auth/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      email: payload.email.trim().toLowerCase(),
      purpose: payload.purpose,
      name: payload.name,
    }),
  });
  const data = await res.json().catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Request code failed: ${res.status}`);
  return data as { success: true; requestId: string; expiresAt: string; code?: string };
}

export async function verifyVerificationCode(payload: {
  email: string;
  purpose: 'login' | 'signup';
  code: string;
}) {
  const res = await fetch('/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      email: payload.email.trim().toLowerCase(),
      purpose: payload.purpose,
      code: payload.code.trim(),
    }),
  });
  const data = await res.json().catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Verify code failed: ${res.status}`);
  return data;
}
// Passwordless OTP auth ends here



//Signup statrs here

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export async function signup(payload: SignupPayload) {
  const email = payload.email.trim().toLowerCase();
  const passwordHash = await hashPasswordForRequest(email, payload.password);
  const confirmPasswordHash = await hashPasswordForRequest(email, payload.confirmPassword);
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      name: payload.name.trim(),
      email,
      passwordHash,
      confirmPasswordHash,
      // Send snake_case too for backend/D1 schemas that expect it.
      password_hash: passwordHash,
      confirm_password_hash: confirmPasswordHash,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Signup failed: ${res.status}`);
  }
  return data;
}

//signup ends here

//me endpoint starts here
export async function getMe() {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (!res.ok) return { authenticated: false, user: null, organizations: [] };
  return res.json(); // { authenticated, user, organizations }
}
//me endpoint ends here
//profile update starts here
export async function updateProfile(payload: { name?: string }) {
  const res = await fetch('/api/auth/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update profile');
  return data; // { success, user, organizations }
}
//profile update ends here

//first setup starts here
export async function firstSetup(payload: {
  websiteUrl: string; // Website URL/Domain (e.g., valuable-tenets-951054.framer.app)
}) {
  // Ensure we're using a relative path to the Next.js API route
  const apiUrl = '/api/onboarding/first-setup';
  console.log('firstSetup: Calling', apiUrl, 'with payload:', payload);
  
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  console.log('firstSetup: Response status:', res.status, 'URL:', res.url);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('firstSetup: Error response:', errorText);
    throw new Error(`Setup failed: ${res.status} - ${errorText}`);
  }
  
  return res.json();
}
//first setup ends here

//sites endpoint starts here
export async function getSites(organizationId?: string) {
  const url = organizationId ? `/api/sites?organizationId=${organizationId}` : '/api/sites';
    
  const response = await fetch(url, {
    credentials: 'include',
  });

  const data = await response.json().catch(async () => ({ success: false, error: await response.text() }));
  if (!response.ok) {
    throw new Error((data as any)?.error || `Failed to load sites: ${response.status}`);
  }
  return data;
}
//sites endpoint ends here

// site banner settings update starts here
export async function updateSiteBannerSettings(payload: {
  name: string;
  domain: string;
  organizationId: string;
  bannerType: 'gdpr' | 'ccpa';
  regionMode: 'gdpr' | 'ccpa' | 'both';
}) {
  const res = await fetch('/api/sites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res
    .json()
    .catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Update site failed: ${res.status}`);
  return data as { success: true; site?: any };
}
// site banner settings update ends here

// payments starts here
export async function createCheckoutSession(payload: {
  organizationId: string;
  planType: 'standard';
  planId: 'basic' | 'essential' | 'growth';
  interval?: 'month' | 'year';
}) {
  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Checkout failed: ${res.status}`);
  return data as { success: true; url: string };
}
// payments ends here

// script verification starts here
export async function verifyScript(payload: { publicUrl: string; scriptUrl: string; siteId?: string }) {
  const res = await fetch('/api/verify-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Verify failed: ${res.status}`);
  return data as { success: true; found: boolean; siteId?: string | null; debug?: any };
}
// script verification ends here