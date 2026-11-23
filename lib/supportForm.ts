// Support form config — shared by app/support (form) and app/api/support-ticket (route).
// Spec: docs/support-form-fields.md

export const TEAMS = [
  'Technical Support',
  'Engineering',
  'Legal & Compliance',
  'Billing & Accounts',
  'Sales & Partnerships',
  'Product',
  'Customer Success',
] as const;
export type Team = (typeof TEAMS)[number];

type SubCategory = { label: string; team?: Team };
type Category = { label: string; team: Team; hint: string; subs: SubCategory[] };

export const CATEGORIES: Category[] = [
  {
    label: 'Installation & Setup',
    team: 'Technical Support',
    hint: 'Which platform are you installing on? What happens when you verify the script?',
    subs: [
      { label: 'Script not detected' },
      { label: 'Webflow app install' },
      { label: 'Framer plugin' },
      { label: 'Custom platform' },
      { label: 'Verify site' },
      { label: 'Moving from another CMP', team: 'Customer Success' },
    ],
  },
  {
    label: 'Banner & Customization',
    team: 'Technical Support',
    hint: 'What do you expect the banner to look like, and what do you see instead?',
    subs: [
      { label: 'Banner not showing' },
      { label: 'Design / styling' },
      { label: 'Text & translations' },
      { label: 'Languages / Weglot' },
      { label: 'Branding removal' },
      { label: 'Mobile layout' },
    ],
  },
  {
    label: 'Cookie & Script Blocking',
    team: 'Technical Support',
    hint: 'Which script or cookie is affected (e.g. Google Analytics, Meta Pixel)? On which page?',
    subs: [
      { label: 'Script not blocked' },
      { label: 'Site broke after install' },
      { label: 'Essential script blocked' },
      { label: 'Iframes / embeds' },
      { label: 'GTM / Google Consent Mode' },
      { label: 'Analytics not firing after accept' },
    ],
  },
  {
    label: 'Cookie Scan',
    team: 'Technical Support',
    hint: 'When did you last run the scan? Which cookies are missing or wrongly categorized?',
    subs: [
      { label: 'Cookies not found' },
      { label: 'Wrong categorization' },
      { label: 'Scan failed / stuck' },
      { label: 'New tracker alert' },
    ],
  },
  {
    label: 'Consent Logs & Reports',
    team: 'Technical Support',
    hint: 'Which date range or report? What did you expect to see?',
    subs: [
      { label: 'Logs missing' },
      { label: 'Export / PDF' },
      { label: 'Retention', team: 'Legal & Compliance' },
      { label: 'Visitor export / delete', team: 'Legal & Compliance' },
    ],
  },
  {
    label: 'Compliance & Legal',
    team: 'Legal & Compliance',
    hint: 'Which law or document is this about, and is there a deadline?',
    subs: [
      { label: 'GDPR' },
      { label: 'CCPA / US laws' },
      { label: 'IAB TCF' },
      { label: 'Quebec / Brazil' },
      { label: 'DPA request' },
      { label: 'Privacy policy generator' },
      { label: 'Certificate / document request' },
      { label: 'Audit / regulator request' },
    ],
  },
  {
    label: 'Billing & Subscription',
    team: 'Billing & Accounts',
    hint: 'Include the invoice number and the change you need.',
    subs: [
      { label: 'Upgrade / downgrade' },
      { label: 'Refund' },
      { label: 'Invoice / VAT' },
      { label: 'Payment failed' },
      { label: 'Cancel' },
      { label: 'Promo code' },
    ],
  },
  {
    label: 'Account & Access',
    team: 'Technical Support',
    hint: 'What happens when you try to sign in or make the change?',
    subs: [
      { label: 'Login / OTP' },
      { label: 'Password' },
      { label: 'Team members' },
      { label: 'Transfer ownership', team: 'Customer Success' },
      { label: 'Move site', team: 'Customer Success' },
      { label: 'Delete account', team: 'Customer Success' },
    ],
  },
  {
    label: 'Integrations',
    team: 'Technical Support',
    hint: 'Which tool are you connecting, and what is not working?',
    subs: [
      { label: 'Webflow' },
      { label: 'Framer' },
      { label: 'GTM' },
      { label: 'Microsoft Clarity / UET' },
      { label: 'MCP / API' },
      { label: 'Other' },
    ],
  },
  {
    label: 'Bug Report',
    team: 'Engineering',
    hint: 'Steps to reproduce: what you did, what you expected, what happened.',
    subs: [{ label: 'Dashboard bug' }, { label: 'Banner bug' }, { label: 'Performance / page speed' }],
  },
  {
    label: 'Feature Request',
    team: 'Product',
    hint: 'What would you like ConsentBit to do, and what problem would it solve for you?',
    subs: [],
  },
  {
    label: 'Sales / Agency / Enterprise',
    team: 'Sales & Partnerships',
    hint: 'How many sites, and what do you need?',
    subs: [{ label: 'Pricing' }, { label: 'Agency / reseller' }, { label: 'Enterprise / custom contract' }],
  },
  { label: 'Other', team: 'Technical Support', hint: 'Tell us what you need help with.', subs: [] },
];

export const ROLES = ['Owner', 'Admin', 'Team member', 'Agency / developer for a client'];
export const PLATFORMS = ['Webflow', 'Framer', 'WordPress', 'Shopify', 'Wix', 'Custom / HTML', 'Google Tag Manager', 'Other'];
export const INSTALL_METHODS = ['Webflow app', 'Framer plugin', 'Script pasted manually', 'Not installed yet'];
export const PLANS = ['Free', 'Essential', 'Growth', 'Not sure', 'No account yet'];
export const BILLING_CYCLES = ['Monthly', 'Yearly', 'Not sure'];
export const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Mobile', 'All'];
export const IMPACTS = ['Site broken / banner missing', 'Feature not working', 'Question / how-to', 'Suggestion'];
export const SOURCES = ['webapp', 'webflow', 'framer', 'website'];

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function findCategory(label: string): Category | undefined {
  return CATEGORIES.find((c) => c.label === label);
}

export function resolveTeam(category: string, sub: string): Team | null {
  const cat = findCategory(category);
  if (!cat) return null;
  return cat.subs.find((s) => s.label === sub)?.team ?? cat.team;
}

const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

// Impact sets the base; paid plans go up one level (capped at Urgent).
export function resolvePriority(impact: string, plan: string): Priority {
  const base = { 'Site broken / banner missing': 3, 'Feature not working': 2, 'Question / how-to': 1, Suggestion: 0 }[impact] ?? 1;
  const paid = plan === 'Essential' || plan === 'Growth';
  return PRIORITIES[Math.min(3, base + (paid && base < 3 ? 1 : 0))];
}

const LEGAL_KEYWORDS = /\b(regulator|lawsuit|complaint|fine|fined|authority|attorney|lawyer)\b/i;

// Teams to notify besides the assigned one (routing overrides in the spec).
export function resolveCcTeams(assigned: Team, impact: string, plan: string, category: string, description: string): Team[] {
  const cc = new Set<Team>();
  if (impact === 'Site broken / banner missing') cc.add('Engineering');
  if (plan === 'Growth' && category === 'Billing & Subscription') cc.add('Customer Success');
  if (LEGAL_KEYWORDS.test(description)) cc.add('Legal & Compliance');
  cc.delete(assigned);
  return [...cc];
}
