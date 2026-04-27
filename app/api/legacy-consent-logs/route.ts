export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

interface Env {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CONSENT_WEBAPP: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  WEBFLOW_AUTHENTICATION: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  R2: any;
}

// ── Session auth ─────────────────────────────────────────────────────────────

function getSid(request: NextRequest): string | null {
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)sid=([^;]+)/);
  return m ? m[1].trim() : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSessionUser(db: any, sid: string): Promise<{ id: string } | null> {
  if (!sid) return null;
  const row = await db
    .prepare("SELECT userId FROM Session WHERE id = ?1 AND expiresAt > datetime('now')")
    .bind(sid)
    .first() as { userId: string } | null;
  return row ? { id: row.userId } : null;
}

// ── Domain aliases (mirrors cb-server extractDomainAliases) ──────────────────

function extractDomainAliases(siteDetails: {
  stagingUrl?: string;
  customDomain?: string;
  domains?: Array<{ url?: string }>;
}): string[] {
  const aliases: string[] = [];
  const add = (raw: string) => {
    aliases.push(raw);
    const clean = raw.replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (clean !== raw) aliases.push(clean);
    if (!clean.startsWith('www.')) aliases.push(`www.${clean}`);
    const base = clean.split('.')[0];
    if (base && base.length > 2) aliases.push(base);
  };
  if (siteDetails.stagingUrl) add(siteDetails.stagingUrl);
  if (siteDetails.customDomain) add(siteDetails.customDomain);
  if (Array.isArray(siteDetails.domains)) {
    for (const d of siteDetails.domains) { if (d.url) add(d.url); }
  }
  return Array.from(new Set(aliases));
}

// ── KV consent data (V1) ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getKvConsentData(
  kv: any,
  domainAliases: string[],
): Promise<Record<string, unknown[]>> {
  const visitors: Record<string, unknown[]> = {};

  for (const alias of domainAliases) {
    let cursor: string | undefined;
    do {
      const list = await kv.list({
        prefix: `Cookie-Preferences:${alias}:`,
        cursor,
        limit: 1000,
      });
      cursor = list.cursor ?? undefined;

      await Promise.all(
        list.keys.map(async (key) => {
          const visitorId = key.name.split(':').slice(2).join(':');
          if (!visitorId || visitors[visitorId]) return;
          const raw = await kv.get(key.name);
          if (!raw) return;
          try {
            const parsed = JSON.parse(raw);
            visitors[visitorId] = Array.isArray(parsed) ? parsed : [parsed];
          } catch { /* skip malformed */ }
        }),
      );
    } while (cursor);
  }

  return visitors;
}

// ── R2 consent data (V2) ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getR2ConsentData(
  r2: any,
  siteName: string,
  domainAliases: string[],
): Promise<Record<string, unknown[]>> {
  const visitors: Record<string, unknown[]> = {};
  const prefixes = [siteName, ...domainAliases].map((a) =>
    a.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0],
  );
  const tried = new Set<string>();

  for (const prefix of prefixes) {
    if (tried.has(prefix)) continue;
    tried.add(prefix);

    const listed = await r2.list({ prefix: `consent-v2/${prefix}/` });
    if (!listed?.objects?.length) continue;

    await Promise.all(
      listed.objects.map(async (obj: { key: string }) => {
        const visitorId = obj.key.split('/').pop()?.replace('.json', '') || '';
        if (!visitorId || visitors[visitorId]) return;
        const file = await r2.get(obj.key);
        if (!file) return;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          visitors[visitorId] = Array.isArray(parsed) ? parsed : [parsed];
        } catch { /* skip malformed */ }
      }),
    );
  }

  return visitors;
}

// ── Merge KV + R2 ────────────────────────────────────────────────────────────

async function getConsentData(
  env: Env,
  siteName: string,
  domainAliases: string[],
): Promise<Record<string, unknown[]>> {
  const [kvData, r2Data] = await Promise.all([
    getKvConsentData(env.WEBFLOW_AUTHENTICATION, domainAliases),
    getR2ConsentData(env.R2, siteName, domainAliases),
  ]);
  // R2 takes precedence; KV fills gaps
  return { ...kvData, ...r2Data };
}

// ── Transform to ConsentLog rows ─────────────────────────────────────────────

type ConsentRow = {
  id: string;
  siteId: string;
  deviceId: null;
  ipAddress: string | null;
  userAgent: string | null;
  country: string | null;
  region: null;
  is_eu: 0;
  createdAt: string;
  updatedAt: string;
  regulation: string | null;
  bannerType: string | null;
  consentMethod: 'legacy';
  status: string;
  expiresAt: null;
  categories: unknown;
};

function buildConsentRows(
  visitors: Record<string, unknown[]>,
  siteId: string,
): ConsentRow[] {
  const rows: ConsentRow[] = [];

  for (const [visitorId, consentArray] of Object.entries(visitors)) {
    if (!Array.isArray(consentArray)) continue;

    for (const entry of consentArray) {
      const e = entry as Record<string, unknown>;
      const prefs = (e.preferences || {}) as Record<string, unknown>;
      const meta = (e.metadata || {}) as Record<string, unknown>;

      let status = 'rejected';
      if (e.action) {
        status = e.action === 'acceptance' ? 'given' : 'rejected';
      } else {
        if (prefs.marketing || prefs.Marketing || prefs.analytics || prefs.Analytics || prefs.personalization || prefs.Personalization) {
          status = 'given';
        }
      }

      let categories: unknown;
      if (prefs.doNotShare !== undefined || prefs.doNotSell !== undefined || prefs.donotshare !== undefined || prefs.donotselldata !== undefined) {
        categories = { ccpa: { doNotSell: Boolean(prefs.doNotSell ?? prefs.donotselldata) } };
      } else {
        categories = {
          essential: Boolean(prefs.necessary ?? true),
          analytics: Boolean(prefs.analytics ?? prefs.Analytics),
          marketing: Boolean(prefs.marketing ?? prefs.Marketing),
          preferences: Boolean(prefs.personalization ?? prefs.Personalization),
        };
      }

      rows.push({
        id: `${visitorId}_${e.timestamp || Date.now()}`,
        siteId,
        deviceId: null,
        ipAddress: (meta.ip as string) || null,
        userAgent: (meta.userAgent as string) || null,
        country: (e.country as string) || (meta.country as string) || null,
        region: null,
        is_eu: 0,
        createdAt: String(e.timestamp || ''),
        updatedAt: String(e.timestamp || ''),
        regulation: (e.bannerType as string) === 'CCPA' ? 'ccpa' : 'gdpr',
        bannerType: (e.bannerType as string) || null,
        consentMethod: 'legacy',
        status,
        expiresAt: null,
        categories,
      });
    }
  }

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return rows;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext() as unknown as { env: Env };

    // Auth
    const sid = getSid(request);
    if (!sid) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    const user = await getSessionUser(env.CONSENT_WEBAPP, sid);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const siteId = new URL(request.url).searchParams.get('siteId') || '';
    if (!siteId) return NextResponse.json({ success: false, error: 'siteId required' }, { status: 400 });

    // Verify site ownership + legacy flag
    const site = await env.CONSENT_WEBAPP
      .prepare(
        `SELECT s.id, s.domain, s.legacySource
         FROM Site s
         INNER JOIN Organization o ON o.id = s.organizationId
         INNER JOIN User u ON u.id = o.ownerId
         WHERE s.id = ?1 AND u.id = ?2 AND s.isLegacy = 1`,
      )
      .bind(siteId, user.id)
      .first() as { id: string; domain: string; legacySource: string } | null;

    if (!site) return NextResponse.json({ success: false, error: 'Legacy site not found' }, { status: 404 });

    const domain = site.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

    // Build domain aliases from WEBFLOW_AUTHENTICATION KV entry (if webflow)
    let siteName = domain;
    let domainAliases: string[] = [domain, `www.${domain}`];

    const rawSiteDetails = await env.WEBFLOW_AUTHENTICATION.get(site.id).catch(() => null);
    if (rawSiteDetails) {
      try {
        const parsed = JSON.parse(rawSiteDetails) as { siteName?: string; stagingUrl?: string; customDomain?: string; domains?: Array<{ url?: string }> };
        if (parsed.siteName) siteName = parsed.siteName;
        domainAliases = extractDomainAliases(parsed);
      } catch { /* use defaults */ }
    }

    // Fetch from KV + R2
    const visitors = await getConsentData(env, siteName, domainAliases);
    const consents = buildConsentRows(visitors, siteId);

    return NextResponse.json({
      success: true,
      consents,
      cookies: [],
      customCookieRules: [],
      total: consents.length,
      limit: 200,
      offset: 0,
    });
  } catch (err) {
    console.error('[legacy-consent-logs]', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
