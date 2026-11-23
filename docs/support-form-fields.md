# ConsentBit Support Form — Fields

Standalone support form (outside the dashboard). Customers are not logged in, so they must identify themselves. Submissions go to ClickUp and to the support inbox.

References: CookieYes ("What is this about?" + Platform), Usercentrics/Cookiebot (domain, settings ID, business impact, plan), Osano ("Contact purpose" routing).

---

## 1. Contact details

| # | Field | Type | Required | Options / notes |
|---|---|---|---|---|
| 1 | Full name | Text | Yes | |
| 2 | Account email | Email | Yes | The email they log in to ConsentBit with |
| 3 | Reply-to email | Email | No | If replies should go elsewhere |
| 4 | Company / organization name | Text | No | |
| 5 | Your role | Dropdown | Yes | Owner · Admin · Team member · Agency / developer for a client |

## 2. Account & site

| # | Field | Type | Required | Options / notes |
|---|---|---|---|---|
| 6 | Website domain(s) | Text | Yes | e.g. example.com — comma-separate several |
| 7 | Site ID | Text | No | Link to "where to find it" help doc |
| 8 | Platform | Dropdown | Yes | Webflow · Framer · WordPress · Shopify · Wix · Custom / HTML · Google Tag Manager · Other |
| 9 | Installed via | Dropdown | Yes | Webflow app · Framer plugin · Script pasted manually · Not installed yet |
| 10 | Plan | Dropdown | Yes | Free · Essential · Growth · Not sure · No account yet |
| 11 | Billing cycle | Dropdown | No | Monthly · Yearly · Not sure |
| 12 | Invoice / receipt number | Text | No | Shown only when Category = Billing & Subscription |

## 3. The issue

| # | Field | Type | Required | Options / notes |
|---|---|---|---|---|
| 13 | Category | Dropdown | Yes | See §4 |
| 14 | Sub-category | Dropdown | Yes | Depends on Category — see §4 |
| 15 | Impact | Radio | Yes | Site broken / banner missing · Feature not working · Question / how-to · Suggestion |
| 16 | Subject | Text (max 100) | Yes | |
| 17 | Description | Textarea | Yes | Placeholder hint changes per Category |
| 18 | Page URL where it happens | URL | No | |
| 19 | When did it start? | Date | No | |
| 20 | Browser / device | Dropdown | No | Chrome · Safari · Firefox · Edge · Mobile · All |
| 21 | Attachments | File upload / link | No | Up to 5 files × 10 MB, or a Loom link |

## 4. Categories → Sub-categories → Assigned team

| Category | Sub-categories | Assigned team | Escalates to |
|---|---|---|---|
| Installation & Setup | Script not detected · Webflow app install · Framer plugin · Custom platform · Verify site | Technical Support | Engineering |
| | Moving from another CMP | Customer Success | Technical Support |
| Banner & Customization | Banner not showing · Design / styling · Text & translations · Languages / Weglot · Branding removal · Mobile layout | Technical Support | Engineering |
| Cookie & Script Blocking | Script not blocked · Site broke after install · Essential script blocked · Iframes / embeds · GTM / Google Consent Mode · Analytics not firing after accept | Technical Support | Engineering |
| Cookie Scan | Cookies not found · Wrong categorization · Scan failed / stuck · New tracker alert | Technical Support | Engineering |
| Consent Logs & Reports | Logs missing · Export / PDF | Technical Support | Engineering |
| | Retention · Visitor export / delete | Legal & Compliance | Engineering |
| Compliance & Legal | GDPR · CCPA / US laws · IAB TCF · Quebec / Brazil · DPA request · Privacy policy generator · Certificate / document request · Audit / regulator request | Legal & Compliance | — |
| Billing & Subscription | Upgrade / downgrade · Refund · Invoice / VAT · Payment failed · Cancel · Promo code | Billing & Accounts | Customer Success |
| Account & Access | Login / OTP · Password · Team members | Technical Support | Engineering |
| | Transfer ownership · Move site · Delete account | Customer Success | Billing & Accounts |
| Integrations | Webflow · Framer · GTM · Microsoft Clarity / UET · MCP / API · Other | Technical Support | Engineering |
| Bug Report | Dashboard bug · Banner bug · Performance / page speed | Engineering | — |
| Feature Request | — | Product | — |
| Sales / Agency / Enterprise | Pricing · Agency / reseller · Enterprise / custom contract | Sales & Partnerships | Legal & Compliance |
| Other | — | Technical Support (triage) | Any |

## 5. Consent

| # | Field | Type | Required |
|---|---|---|---|
| 22 | Allow ConsentBit support to access my account and site to debug | Checkbox | No |
| 23 | I agree to the processing of my data to handle this request (link to Privacy Policy) | Checkbox | Yes |

## 6. Shown to the customer (read-only)

| # | Field | Notes |
|---|---|---|
| 24 | Assigned team | Updates live from Category + Sub-category: *"Your request will go to our **Legal & Compliance** team."* Also shown on the success screen and in the confirmation email. Staff can reassign in ClickUp. |

Teams: Technical Support · Engineering · Legal & Compliance · Billing & Accounts · Sales & Partnerships · Product · Customer Success

## 7. Hidden — set by the system

| # | Field | Source |
|---|---|---|
| 25 | Priority | Urgent · High · Normal · Low — from Impact, raised one level for paid plans |
| 26 | Ticket ID | Generated, e.g. CB-1042 |
| 27 | Source | Web app · Webflow app · Framer plugin · Website — `?source=` URL parameter |
| 28 | Referrer page | `document.referrer` |
| 29 | Submitted at + timezone | Browser |
| 30 | User agent | Browser |

## 8. Hidden — filled after submission (D1 lookup by account email + domain, optional)

| # | Field |
|---|---|
| 31 | User ID |
| 32 | Organization ID |
| 33 | Verified site ID |
| 34 | Verified plan |
| 35 | Stripe status |

## Routing overrides

- Impact = **Site broken / banner missing** → priority Urgent, Engineering notified immediately.
- Plan = **Growth** + Billing category → also notify Customer Success.
- Description mentions **regulator, lawsuit, complaint, fine** → copy Legal & Compliance.
