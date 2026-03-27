
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

// banner customization starts here
export async function getBannerCustomization(siteId: string) {
  const res = await fetch(`/api/banner-customization?siteId=${encodeURIComponent(siteId)}`, {
    credentials: 'include',
  });
  const data = await res
    .json()
    .catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Get customization failed: ${res.status}`);
  return data as { success: true; customization: any | null };
}

export async function saveBannerCustomization(payload: { siteId: string; customization: any }) {
  const res = await fetch('/api/banner-customization', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res
    .json()
    .catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Save customization failed: ${res.status}`);
  return data as { success: true };
}
// banner customization ends here

// payments starts here — matches consent-manager tier checkout (planId + interval + siteId)
export type CreateCheckoutPayload = {
  organizationId: string;
  planId: 'basic' | 'essential' | 'growth' | 'free';
  interval: 'monthly' | 'yearly';
  siteId?: string | null;
  siteName?: string | null;
  siteDomain?: string | null;
  stripeCouponId?: string | null;
  successUrl?: string;
  cancelUrl?: string;
};

export async function createCheckoutSession(
  payload: CreateCheckoutPayload,
): Promise<{ success: true; url: string; sessionId?: string }> {
  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Checkout failed: ${res.status}`);
  return data as { success: true; url: string; sessionId?: string };
}
// payments ends here

// billing invoices starts here
export type BillingInvoice = {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  created: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
};

export async function getBillingInvoices(
  organizationId: string,
  limit: number = 20,
): Promise<{ invoices: BillingInvoice[] }> {
  const res = await fetch(
    `/api/billing/invoices?organizationId=${encodeURIComponent(organizationId)}&limit=${limit}`,
    { credentials: "include" },
  );
  const data = await res
    .json()
    .catch(async () => ({ error: await res.text(), invoices: [] }));
  if (!res.ok) throw new Error(data.error || `Billing invoices failed: ${res.status}`);
  return data as { invoices: BillingInvoice[] };
}
// billing invoices ends here

// billing usage starts here
export type BillingUsage = {
  yearMonth: string;
  pageviewsUsed: number;
  pageviewsLimit: number;
  scansUsed: number;
  scansLimit: number;
  sitesUsed: number;
  sitesLimit: number;
  planId: string;
};

export async function getBillingUsage(
  organizationId: string,
  siteId?: string,
): Promise<BillingUsage> {
  const siteParam = siteId ? `&siteId=${encodeURIComponent(siteId)}` : "";
  const res = await fetch(
    `/api/billing/usage?organizationId=${encodeURIComponent(organizationId)}${siteParam}`,
    { credentials: "include" },
  );
  const data = await res
    .json()
    .catch(async () => ({ error: await res.text() }));
  if (!res.ok) throw new Error(data.error || `Billing usage failed: ${res.status}`);
  return data as BillingUsage;
}
// billing usage ends here

// subscription cancel starts here
export async function cancelSubscription(payload: {
  subscriptionId?: string | null;
  stripeSubscriptionId?: string | null;
}): Promise<{ success: true; message?: string }> {
  const res = await fetch("/api/subscriptions/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res
    .json()
    .catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Cancel subscription failed: ${res.status}`);
  }
  return data as { success: true; message?: string };
}
// subscription cancel ends here

// —— Cookie scan (site scanner) ——
export type ScanHistoryRow = {
  id: string;
  siteId: string;
  scanUrl: string | null;
  scriptsFound: number;
  cookiesFound: number;
  scanDuration: number | null;
  scanStatus: string;
  createdAt: string;
};

export type ScanCookie = {
  id: string;
  siteId: string;
  scanHistoryId: string | null;
  name: string;
  domain: string | null;
  path: string | null;
  category: string;
  provider: string | null;
  description: string | null;
  expires: string | null;
  httpOnly: number;
  secure: number;
  sameSite: string | null;
  source?: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type ScheduledScan = {
  id: string;
  siteId: string;
  scheduledAt: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  isActive: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getScanHistory(siteId: string): Promise<{ success: boolean; scans: ScanHistoryRow[] }> {
  const res = await fetch(`/api/scan-history?siteId=${encodeURIComponent(siteId)}`, { credentials: 'include' });
  const data = await res.json().catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Scan history failed: ${res.status}`);
  return data;
}

export async function getSiteCookies(siteId: string): Promise<{
  success: boolean;
  cookies: ScanCookie[];
  cookiesByCategory: Record<string, ScanCookie[]>;
}> {
  const res = await fetch(`/api/cookies?siteId=${encodeURIComponent(siteId)}`, { credentials: 'include' });
  const data = await res.json().catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Cookies failed: ${res.status}`);
  return data;
}

export async function addCustomCookie(payload: {
  siteId: string;
  name: string;
  domain?: string;
  category: string;
  duration?: string;
  scriptUrlPattern?: string;
  description?: string;
}): Promise<{ success: boolean }> {
  const res = await fetch('/api/cookies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Add cookie failed: ${res.status}`);
  return data;
}

export async function scanSiteNow(siteId: string): Promise<{
  success: boolean;
  scanHistoryId?: string;
  scriptsFound?: number;
  cookiesFound?: number;
  scanDuration?: number;
  error?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  let res: Response;
  try {
    res = await fetch('/api/scan-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ siteId }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') {
      throw new Error('Scan request timed out. The site may be slow or blocking scan traffic. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
  const data = await res.json().catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Scan failed: ${res.status}`);
  return data;
}

export async function getScheduledScans(siteId: string): Promise<{
  success: boolean;
  scheduledScans?: ScheduledScan[];
}> {
  const res = await fetch(`/api/scheduled-scan?siteId=${encodeURIComponent(siteId)}`, { credentials: 'include' });
  const data = await res.json().catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Scheduled scans failed: ${res.status}`);
  return data;
}

export async function createScheduledScan(
  siteId: string,
  scheduledAt: string,
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' = 'once',
): Promise<{ success: boolean; scheduledScanId?: string }> {
  const res = await fetch('/api/scheduled-scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ siteId, scheduledAt, frequency }),
  });
  const data = await res.json().catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Schedule failed: ${res.status}`);
  return data;
}

export async function deleteScheduledScan(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/scheduled-scan?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json().catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Delete schedule failed: ${res.status}`);
  return data;
}

// —— Consent logs ——
export type ConsentCategories = {
  essential?: boolean;
  analytics?: boolean;
  marketing?: boolean;
  preferences?: boolean;
  ccpa?: { doNotSell?: boolean };
};

export type ConsentLog = {
  id: string;
  siteId: string;
  deviceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  country: string | null;
  region: string | null;
  is_eu: number;
  createdAt: string;
  updatedAt: string;
  regulation: string | null;
  bannerType: string | null;
  consentMethod: string | null;
  status: string | null;
  expiresAt: string | null;
  categories: ConsentCategories | null;
};

export type ConsentLogCookie = {
  id: string;
  name: string;
  domain: string | null;
  path: string | null;
  category: string;
  provider: string | null;
  description: string | null;
  expires: string | null;
  source: string | null;
  lastSeenAt: string | null;
};

export type ConsentHistoryResponse = {
  success: boolean;
  consents: ConsentLog[];
  cookies: ConsentLogCookie[];
  total: number;
  limit: number;
  offset: number;
};

export async function getConsentHistory(
  siteId: string,
  limit: number = 100,
  offset: number = 0,
): Promise<ConsentHistoryResponse> {
  const res = await fetch(
    `/api/consent-history?siteId=${encodeURIComponent(siteId)}&limit=${limit}&offset=${offset}`,
    { credentials: 'include' },
  );
  const data = await res.json().catch(async () => ({ success: false, error: await res.text() }));
  if (!res.ok || !data.success) throw new Error(data.error || `Consent history failed: ${res.status}`);
  return data;
}

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