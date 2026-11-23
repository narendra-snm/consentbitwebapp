export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import {
  BILLING_CYCLES, BROWSERS, IMPACTS, INSTALL_METHODS, MAX_FILE_BYTES, MAX_FILES, PLANS, PLATFORMS, ROLES, SOURCES,
  findCategory, resolveCcTeams, resolvePriority, resolveTeam,
} from '@/lib/supportForm';

// TEST ONLY: validates the submission and computes routing, but does NOT deliver it
// anywhere yet. ClickUp task creation + support-inbox email go here (or in a worker)
// once the ClickUp list and custom fields exist. Response carries `delivered: false`
// so the form can say so.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(fd: FormData, key: string, max = 500): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export async function POST(request: NextRequest) {
  let fd: FormData;
  try {
    fd = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid form submission.' }, { status: 400 });
  }

  const data = {
    fullName: str(fd, 'fullName', 120),
    accountEmail: str(fd, 'accountEmail', 254).toLowerCase(),
    replyToEmail: str(fd, 'replyToEmail', 254).toLowerCase(),
    company: str(fd, 'company', 160),
    role: str(fd, 'role'),
    domains: str(fd, 'domains', 500),
    siteId: str(fd, 'siteId', 100),
    platform: str(fd, 'platform'),
    installMethod: str(fd, 'installMethod'),
    plan: str(fd, 'plan'),
    billingCycle: str(fd, 'billingCycle'),
    invoiceNumber: str(fd, 'invoiceNumber', 100),
    category: str(fd, 'category'),
    subCategory: str(fd, 'subCategory'),
    impact: str(fd, 'impact'),
    subject: str(fd, 'subject', 100),
    description: str(fd, 'description', 10000),
    pageUrl: str(fd, 'pageUrl', 2000),
    startedOn: str(fd, 'startedOn', 20),
    browser: str(fd, 'browser'),
    attachmentLink: str(fd, 'attachmentLink', 2000),
    allowAccess: str(fd, 'allowAccess') === 'true',
    privacyConsent: str(fd, 'privacyConsent') === 'true',
    source: str(fd, 'source', 20),
    referrer: str(fd, 'referrer', 2000),
    timezone: str(fd, 'timezone', 64),
  };

  const errors: Record<string, string> = {};
  const oneOf = (key: keyof typeof data, list: string[], required = true) => {
    const v = data[key] as string;
    if (!v) { if (required) errors[key] = 'Required.'; return; }
    if (!list.includes(v)) errors[key] = 'Invalid option.';
  };

  if (!data.fullName) errors.fullName = 'Required.';
  if (!EMAIL.test(data.accountEmail)) errors.accountEmail = 'Enter a valid email.';
  if (data.replyToEmail && !EMAIL.test(data.replyToEmail)) errors.replyToEmail = 'Enter a valid email.';
  oneOf('role', ROLES);
  if (!data.domains) errors.domains = 'Required.';
  oneOf('platform', PLATFORMS);
  oneOf('installMethod', INSTALL_METHODS);
  oneOf('plan', PLANS);
  oneOf('billingCycle', BILLING_CYCLES, false);
  oneOf('impact', IMPACTS);
  oneOf('browser', BROWSERS, false);
  if (!data.subject) errors.subject = 'Required.';
  if (!data.description) errors.description = 'Required.';
  if (!data.privacyConsent) errors.privacyConsent = 'Required.';
  if (data.pageUrl && !/^https?:\/\//i.test(data.pageUrl)) errors.pageUrl = 'Start with http:// or https://';
  if (data.attachmentLink && !/^https?:\/\//i.test(data.attachmentLink)) errors.attachmentLink = 'Start with http:// or https://';

  const cat = findCategory(data.category);
  if (!cat) errors.category = 'Required.';
  else if (cat.subs.length && !cat.subs.some((s) => s.label === data.subCategory)) errors.subCategory = 'Required.';
  if (data.category !== 'Billing & Subscription') data.invoiceNumber = '';
  if (!SOURCES.includes(data.source)) data.source = 'website';

  const files = fd.getAll('attachments').filter((f): f is File => typeof f !== 'string' && f.size > 0);
  if (files.length > MAX_FILES) errors.attachments = `Up to ${MAX_FILES} files.`;
  else if (files.some((f) => f.size > MAX_FILE_BYTES)) errors.attachments = 'Each file must be 10 MB or smaller.';

  if (Object.keys(errors).length) {
    return NextResponse.json({ success: false, error: 'Please fix the highlighted fields.', fields: errors }, { status: 400 });
  }

  const team = resolveTeam(data.category, data.subCategory)!;
  const ticket = {
    ticketId: `CB-${Date.now().toString(36).toUpperCase()}`,
    assignedTeam: team,
    ccTeams: resolveCcTeams(team, data.impact, data.plan, data.category, data.description),
    priority: resolvePriority(data.impact, data.plan),
    submittedAt: new Date().toISOString(),
    userAgent: request.headers.get('user-agent') || '',
    attachments: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    ...data,
  };

  // Routing only — no customer details in logs.
  console.log('[support-ticket] test submission (not delivered)', JSON.stringify({
    ticketId: ticket.ticketId, team: ticket.assignedTeam, cc: ticket.ccTeams, priority: ticket.priority,
    category: ticket.category, subCategory: ticket.subCategory, source: ticket.source, files: files.length,
  }));

  return NextResponse.json({
    success: true,
    delivered: false,
    ticketId: ticket.ticketId,
    assignedTeam: ticket.assignedTeam,
    ccTeams: ticket.ccTeams,
    priority: ticket.priority,
  });
}
