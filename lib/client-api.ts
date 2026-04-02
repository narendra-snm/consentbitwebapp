
/**
 * Decode a base64 transport envelope produced by the worker's security middleware.
 * Response shape: { d: "<base64 UTF-8 JSON>" }
 * Falls through for plain JSON responses (backward-compat / public endpoints).
 */
function decodeEnvelope(parsed: any): any {
  if (parsed && typeof parsed.d === 'string') {
    try {
      const binary = atob(parsed.d);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch { /* fall through to raw parsed value */ }
  }
  return parsed;
}

/** Parse a fetch response safely — reads body once, handles HTML error pages from Cloudflare/Workers. */
async function parseApiResponse(res: Response): Promise<any> {
  const text = await res.text();
  let parsed: any;
  try { parsed = JSON.parse(text); } catch {
    return { success: false, error: text.trimStart().startsWith('<') ? `Please enter the correct website URL.` : text || `Please enter the correct website URL.` };
  }
  return decodeEnvelope(parsed);
}

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

  return parseApiResponse(res);

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
  const data = await parseApiResponse(res);
  try {
    console.log('[requestVerificationCode] response', {
      status: res.status,
      ok: res.ok,
      keys: data && typeof data === 'object' ? Object.keys(data) : null,
      success: data?.success,
      hasRequestId: typeof data?.requestId === 'string',
      hasExpiresAt: typeof data?.expiresAt === 'string',
      hasEnvelope: typeof data?.d === 'string',
      error: data?.error,
    });
  } catch {}
  const success =
    Boolean(data?.success) ||
    (res.ok && (typeof data?.requestId === 'string' || typeof data?.expiresAt === 'string' || typeof data?.code === 'string'));
  if (!res.ok || !success) throw new Error(data?.error || `Request code failed: ${res.status}`);
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
  const data = await parseApiResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || `Verify code failed: ${res.status}`);
  // Cache dashboard data so the provider renders instantly after navigation
  if (data.dashboardInit?.authenticated) {
    try {
      sessionStorage.setItem('dashboardInit', JSON.stringify(data.dashboardInit));
      // Used by DashboardSessionProvider to avoid showing stale cached data from another user.
      sessionStorage.setItem('cbLastUserEmail', payload.email.trim().toLowerCase());
    } catch {}
  }
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

  const data = await parseApiResponse(res);
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
  return parseApiResponse(res);
}

export async function getDashboardInit() {
  const res = await fetch('/api/auth/dashboard-init', { credentials: 'include', cache: 'no-store' });
  if (!res.ok) return { authenticated: false, user: null, organizations: [], sites: [], effectivePlanId: 'free' };
  return parseApiResponse(res); // decodes base64 envelope if present
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
  const data = await parseApiResponse(res);
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
    let message = errorText;
    try {
      const parsed = JSON.parse(errorText) as { error?: string; message?: string };
      message = parsed?.error || parsed?.message || message;
    } catch {
      // non-json response
    }
    throw new Error(message || `Setup failed: ${res.status}`);
  }
  
  return parseApiResponse(res);
}
//first setup ends here

//sites endpoint starts here
export async function getSites(organizationId?: string) {
  const url = organizationId ? `/api/sites?organizationId=${organizationId}` : '/api/sites';
    
  const response = await fetch(url, {
    credentials: 'include',
  });

  const data = await parseApiResponse(response);
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
  bannerType: 'gdpr' | 'ccpa' | 'iab';
  regionMode: 'gdpr' | 'ccpa' | 'both';
}) {
  const res = await fetch('/api/sites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch {
    data = { success: false, error: text.trimStart().startsWith('<') ? `Something went wrong. Please try again.` : text };
  }
  if (!res.ok || !data.success) throw new Error(data.error || `Update site failed: ${res.status}`);
  return data as { success: true; site?: any };
}
// site banner settings update ends here

// banner customization starts here
export async function getBannerCustomization(siteId: string) {
  const res = await fetch(`/api/banner-customization?siteId=${encodeURIComponent(siteId)}`, {
    credentials: 'include',
  });
  const data = await parseApiResponse(res);
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
  const data = await parseApiResponse(res);
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
  const data = await parseApiResponse(res);
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
  /** Site whose Stripe subscription produced this invoice, when known */
  siteId?: string | null;
};

export async function getBillingInvoices(
  organizationId: string,
  limit: number = 20,
): Promise<{ invoices: BillingInvoice[] }> {
  const res = await fetch(
    `/api/billing/invoices?organizationId=${encodeURIComponent(organizationId)}&limit=${limit}`,
    { credentials: "include" },
  );
  const data = await parseApiResponse(res);
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
  const data = await parseApiResponse(res);
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
  const data = await parseApiResponse(res);
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Cancel subscription failed: ${res.status}`);
  }
  return data as { success: true; message?: string };
}
// subscription cancel ends here

// billing summary starts here
export type BillingSummary = {
  planName: string;
  planId: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionId?: string | null;       // some backends return this alias
  nextBillingDate?: string | null;
  currentPeriodEnd?: string | null;     // alias used by some backends
  amountCents?: number | null;
  cancelAtPeriodEnd?: boolean;
  cancel_at_period_end?: boolean;       // snake_case alias
  paymentMethod?: { brand: string; last4: string; exp_month: number; exp_year: number } | null;
  domainsLimit?: number;
};
export async function getBillingSummary(organizationId: string): Promise<BillingSummary> {
  const res = await fetch(`/api/billing/summary?organizationId=${encodeURIComponent(organizationId)}`, { credentials: "include" });
  const data = await parseApiResponse(res);
  if (!res.ok) throw new Error(data.error || "Failed to load billing summary");
  return data as BillingSummary;
}

export async function createBillingPortalSession(organizationId: string, returnUrl: string): Promise<{ url: string }> {
  const res = await fetch("/api/billing/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ organizationId, returnUrl }),
  });
  const data = await parseApiResponse(res);
  if (!res.ok) throw new Error(data.error || "Failed to create portal session");
  return data as { url: string };
}
// billing summary ends here

// —— Cookie scan (site scanner) ——
export type ScanHistoryRow = {
  id: string;
  siteId: string;
  scanUrl: string | null;
  scriptsFound: number;
  cookiesFound: number;
  /** Distinct cookie category keys for this scan (e.g. analytics, necessary). */
  categories?: string[];
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
  const data = await parseApiResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || `Scan history failed: ${res.status}`);
  return data;
}

export async function getSiteCookies(siteId: string): Promise<{
  success: boolean;
  cookies: ScanCookie[];
  cookiesByCategory: Record<string, ScanCookie[]>;
}> {
  const res = await fetch(`/api/cookies?siteId=${encodeURIComponent(siteId)}`, { credentials: 'include' });
  const data = await parseApiResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || `Cookies failed: ${res.status}`);
  return data;
}

// ── Custom cookie rules ───────────────────────────────────────────────────────

export type CustomCookieRule = {
  id: string;
  siteId: string;
  name: string;
  domain: string;
  scriptUrlPattern: string | null;
  category: string;
  description: string | null;
  duration: string | null;
  published: 0 | 1;
  createdAt: string;
  updatedAt: string;
};

export async function getCustomCookieRules(siteId: string): Promise<{ rules: CustomCookieRule[] }> {
  const res = await fetch(`/api/custom-cookie-rules?siteId=${encodeURIComponent(siteId)}`, {
    credentials: 'include',
  });
  const data = await parseApiResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || `Failed to load cookie rules: ${res.status}`);
  return data as { rules: CustomCookieRule[] };
}

export async function addCustomCookieRule(payload: {
  siteId: string;
  name: string;
  domain: string;
  category: string;
  scriptUrlPattern?: string;
  description?: string;
  duration?: string;
}): Promise<{ success: boolean; id?: string }> {
  const res = await fetch('/api/custom-cookie-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await parseApiResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || `Failed to add cookie rule: ${res.status}`);
  return data;
}

export async function deleteCustomCookieRule(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/custom-cookie-rules?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await parseApiResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || `Failed to delete cookie rule: ${res.status}`);
  return data;
}

export async function publishCustomCookieRules(siteId: string): Promise<{ success: boolean }> {
  const res = await fetch('/api/custom-cookie-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action: 'publish', siteId }),
  });
  const data = await parseApiResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || `Failed to publish rules: ${res.status}`);
  return data;
}

// ── Legacy (kept for backward compat) ────────────────────────────────────────
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
  const data = await parseApiResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || `Add cookie failed: ${res.status}`);
  return data;
}

export async function scanSiteNow(siteId: string): Promise<{
  success: boolean;
  scanHistoryId?: string;
  scanning?: boolean;
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
  const data = await parseApiResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || `Scan failed: ${res.status}`);
  return data;
}

/** Set pendingScan = 1 on the site so the next browser visit triggers a full cookie+script report. */
export async function requestBrowserScan(siteId: string): Promise<void> {
  const res = await fetch('/api/scan-pending', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ siteId, action: 'request' }),
  });
  const data = await parseApiResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to request browser scan');
}

export async function checkBrowserScanPending(siteId: string): Promise<boolean> {
  const res = await fetch(`/api/scan-pending?siteId=${encodeURIComponent(siteId)}`, { credentials: 'include' });
  const data = await parseApiResponse(res);
  return !!data.pending;
}

export async function getScheduledScans(siteId: string): Promise<{
  success: boolean;
  scheduledScans?: ScheduledScan[];
}> {
  const res = await fetch(`/api/scheduled-scan?siteId=${encodeURIComponent(siteId)}`, { credentials: 'include' });
  const data = await parseApiResponse(res);
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
  const data = await parseApiResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || `Schedule failed: ${res.status}`);
  return data;
}

export async function deleteScheduledScan(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/scheduled-scan?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await parseApiResponse(res);
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
  const data = await parseApiResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || `Consent history failed: ${res.status}`);
  return data;
}

// script verification starts here
export async function verifyScript(payload: { publicUrl: string; scriptUrl: string; siteId?: string }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch('/api/verify-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error('Verification timed out. Please try again.');
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
  const data = await parseApiResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || `Verify failed: ${res.status}`);
  return data as { success: true; found: boolean; siteId?: string | null; debug?: any };
}
// script verification ends here