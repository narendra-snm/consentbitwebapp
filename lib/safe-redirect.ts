/**
 * Turn an untrusted `?next=` value into a same-origin path, or the fallback.
 *
 * `router.replace(next)` follows cross-origin URLs and does not filter `javascript:`,
 * so an unchecked `/login?next=//evil.example` or `?next=javascript:…` became an open
 * redirect / script injection straight after a real login.
 *
 * Only an app-relative path survives: it must start with a single "/", contain no
 * backslash (browsers read "\" as "/"), and still resolve to the same origin. Resolved
 * against a fixed dummy origin, so this also works during server rendering.
 */
/**
 * The payment pages read `invoice_url` from the address bar, so it is untrusted. The real
 * value is Stripe's hosted_invoice_url (invoice.stripe.com); anything else — including
 * `javascript:`, which `window.open` would run — becomes null and the link is hidden.
 */
const STRIPE_INVOICE_HOSTS = new Set(["invoice.stripe.com", "pay.stripe.com"]);
export function safeInvoiceUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && STRIPE_INVOICE_HOSTS.has(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

export function safeNextPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  try {
    const base = "https://app.invalid";
    const u = new URL(raw, base);
    return u.origin === base ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}
