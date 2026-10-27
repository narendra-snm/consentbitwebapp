"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDpaRequests,
  submitDpaRequest,
  type DpaRequestPayload,
  type DpaRequestSummary,
} from "@/lib/client-api";
import { useDashboardSession } from "../../DashboardSessionProvider";
import { siteTeamRole } from "@/lib/team-role";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COMPANY_SIZES = [
  { value: "0-10", label: "0–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-100", label: "51–100 employees" },
  { value: "101-500", label: "101–500 employees" },
  { value: "500+", label: "More than 500 employees" },
];

const REGIONS = ["EU / EEA", "United Kingdom", "Switzerland", "United States", "Brazil", "Canada", "APAC", "Elsewhere"];

// Built from the admin server's dpaContent.js (Erik's plan v1.12 master) into public/legal/ —
// regenerate both when the DPA changes. Keep in step with DPA_VERSION in dpaContent.js.
const DPA_VERSION = "1.0";
const DPA_HTML_URL = "/legal/consentbit-dpa.html";

const PRIVACY_POLICY_URL ="https://www.consentbit.com/privacy-policy";
const TERMS_URL = "https://www.consentbit.com/terms-condition";

const inputClass =
  "w-full h-[44px] border border-[#d1d5db] rounded-[8px] px-3 text-[15px] text-[#111827] bg-white placeholder:text-[#9ca3af] focus:outline-none focus:border-[#007aff] focus:ring-1 focus:ring-[#007aff]";

const EMPTY: DpaRequestPayload = {
  companyName: "",
  addressLine: "",
  city: "",
  postalCode: "",
  country: "",
  registrationNumber: "",
  vatNumber: "",
  companySize: "",
  website: "",
  siteIds: [],
  signatoryName: "",
  signatoryTitle: "",
  signatoryEmail: "",
  privacyContactName: "",
  privacyContactEmail: "",
  representative: "",
  agreementType: "standard",
  regions: [],
  neededBy: "",
  notes: "",
  privacyAck: false,
};

function fmtDate(raw: string) {
  const d = new Date(raw);
  return Number.isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(status: string) {
  if (status === "sent") return "Signed copy ready";
  if (status === "signed") return "Signed by both";
  if (status === "in_progress") return "In progress";
  if (status === "cancelled") return "Cancelled";
  return "Received";
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[15px] text-[#111827] mb-2">
        {label} {required ? <span className="text-red-600">*</span> : <span className="text-[#9ca3af] text-[13px]">(optional)</span>}
      </label>
      {children}
      {hint && <p className="text-[12px] text-[#6b7280] mt-1.5">{hint}</p>}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#fbfbfb] border border-[#ebebeb] rounded-[10px] px-5 py-6">
      <p className="font-semibold text-[16px] text-[#111827]">{title}</p>
      {description && <p className="text-[14px] text-[#4b5563] mt-1">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}

// Accounts (login email, lowercase) allowed to request a signed DPA for Essential-plan
// sites as well as Growth. The worker enforces the same list (consent-manager dpaRequest.js).
const DPA_ESSENTIAL_ALLOWED = ["rafee.niloy@strativ.se"];

export default function DpaRequestPage() {
  const { user, sites } = useDashboardSession();
  const [form, setForm] = useState<DpaRequestPayload>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<DpaRequestSummary | null>(null);
  const [requests, setRequests] = useState<DpaRequestSummary[]>([]);
  // Newest request with a published signed PDF (the list is newest first).
  const latestSigned = useMemo(() => requests.find((r) => r.hasDocument) || null, [requests]);
  const [dpaPreviewOpen, setDpaPreviewOpen] = useState(false);
  // The signed-copy form stays behind a button; Growth-plan accounts only.
  const [formOpen, setFormOpen] = useState(false);

  // The account's own Growth-plan sites — used to prefill the company website.
  // Same plan fields the Profile → Organizations tab reads. Allowlisted accounts
  // may also pick Essential-plan sites.
  const accountEmail = String((user as any)?.email || "").trim().toLowerCase();
  const growthSites = useMemo(() => {
    const plans = DPA_ESSENTIAL_ALLOWED.includes(accountEmail) ? ["growth", "essential"] : ["growth"];
    return (Array.isArray(sites) ? sites : []).filter((s: any) => {
      const plan = String(s?.planId ?? s?.plan_id ?? s?.subscription_plan ?? s?.plan ?? "").toLowerCase();
      return siteTeamRole(s) === "owner" && s?.id && plans.includes(plan);
    });
  }, [sites, accountEmail]);

  useEffect(() => {
    getDpaRequests()
      .then((r) => setRequests(r.requests || []))
      .catch(() => {});
  }, [submitted]);

  // Prefill signatory + website once the session is loaded.
  useEffect(() => {
    setForm((f) => ({
      ...f,
      signatoryName: f.signatoryName || String((user as any)?.name || ""),
      signatoryEmail: f.signatoryEmail || String((user as any)?.email || ""),
    }));
  }, [user]);

  // Default to the first Growth-plan site; drop a pick that is no longer Growth.
  useEffect(() => {
    setForm((f) => {
      const still = growthSites.find((s: any) => f.siteIds.includes(String(s.id)));
      const site: any = still || growthSites[0];
      return site
        ? { ...f, siteIds: [String(site.id)], website: String(site.domain || site.name || "") }
        : { ...f, siteIds: [], website: "" };
    });
  }, [growthSites]);

  const pickSite = (id: string) => {
    const site: any = growthSites.find((s: any) => String(s.id) === id);
    setForm((f) => ({ ...f, siteIds: site ? [id] : [], website: site ? String(site.domain || site.name || "") : "" }));
  };

  const set = <K extends keyof DpaRequestPayload>(key: K, value: DpaRequestPayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggle = (key: "regions" | "siteIds", value: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const missing = useMemo(() => {
    const req: [keyof DpaRequestPayload, string][] = [
      ["companyName", "company legal name"],
      ["addressLine", "registered address"],
      ["city", "city"],
      ["country", "country"],
      ["website", "a Growth-plan website"],
      ["signatoryName", "signatory name"],
      ["signatoryTitle", "signatory job title"],
      ["signatoryEmail", "signatory email"],
    ];
    const out = req.filter(([k]) => !String(form[k] || "").trim()).map(([, l]) => l);
    if (!form.regions.length) out.push("at least one region");
    return out;
  }, [form]);

  const emailInvalid = !!form.signatoryEmail && !EMAIL_REGEX.test(form.signatoryEmail.trim());
  const contactEmailInvalid = !!form.privacyContactEmail && !EMAIL_REGEX.test(form.privacyContactEmail.trim());
  const canSubmit = !submitting && form.siteIds.length === 1 && missing.length === 0 && !emailInvalid && !contactEmailInvalid && form.privacyAck;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitDpaRequest(form);
      setSubmitted(res.request);
      setForm({ ...EMPTY, signatoryName: form.signatoryName, signatoryEmail: form.signatoryEmail, website: form.website, siteIds: form.siteIds });
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[860px] text-left">
      <p className="font-semibold text-[20px] text-[#111827]">Data Processing Agreement</p>
      <p className="text-[15px] text-[#4b5563] mt-1 mb-5">
        Our DPA (GDPR Art. 28, with the EU Standard Contractual Clauses, UK Addendum and Swiss terms) is part of the ConsentBit
        Terms and covers every website in your account.
      </p>

      <div className="mb-8 bg-white border border-[#e5e7eb] rounded-[10px] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="font-semibold text-[16px] text-[#111827]">ConsentBit DPA</p>
            <p className="text-[13px] text-[#6b7280]">Version {DPA_VERSION} · Seattle New Media, LLC (dba ConsentBit)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDpaPreviewOpen((v) => !v)}
              className="h-[36px] px-3.5 rounded-[8px] border border-[#007aff] text-[#007aff] text-[13px] hover:bg-[#f5f9ff] transition-colors"
            >
              {dpaPreviewOpen ? "Hide DPA" : "Read DPA"}
            </button>
            <a
              href={DPA_HTML_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="h-[36px] px-3.5 rounded-[8px] border border-[#007aff] text-[#007aff] text-[13px] hover:bg-[#f5f9ff] transition-colors flex items-center"
            >
              Open / Download PDF
            </a>
            {/* Only once ConsentBit has signed and published a copy for this account
                (Admin → DPA requests → Publish). Downloads the newest one. */}
            {latestSigned && (
              <a
                href={`/api/dpa-request/document?id=${encodeURIComponent(latestSigned.id)}`}
                className="h-[36px] px-3.5 rounded-[8px] bg-[#007aff] text-white text-[13px] hover:bg-[#006ae0] transition-colors flex items-center"
              >
                Download signed copy (PDF)
              </a>
            )}
          </div>
        </div>
        {dpaPreviewOpen && (
          <iframe
            src={DPA_HTML_URL}
            title="ConsentBit Data Processing Agreement"
            className="w-full h-[560px] border-t border-[#e5e7eb] bg-[#f5f7fa]"
          />
        )}
      </div>

      <p className="font-semibold text-[18px] text-[#111827]">Request a signed copy</p>
      <p className="text-[15px] text-[#4b5563] mt-1 mb-5">
        Need the DPA signed by ConsentBit with your company details, for your records or procurement? Tell us who the agreement is
        with and who signs it. Our team prepares the signed copy and emails it to the signatory.
      </p>

      {growthSites.length ? (
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          aria-expanded={formOpen}
          className={`h-[44px] px-5 rounded-[8px] text-[15px] transition-colors ${formOpen ? "border border-[#007aff] text-[#007aff] hover:bg-[#f5f9ff]" : "bg-[#007aff] text-white hover:bg-[#006ae0]"} ${formOpen ? "mb-6" : ""}`}
        >
          {formOpen ? "Hide request form" : "Request a signed copy"}
        </button>
      ) : (
        <span className="relative inline-block group" tabIndex={0} aria-describedby="dpa-growth-only">
          <button
            type="button"
            disabled
            className="h-[44px] px-5 rounded-[8px] bg-[#e5e7eb] text-[#9ca3af] text-[15px] cursor-not-allowed"
          >
            Request a signed copy
          </button>
          <span
            id="dpa-growth-only"
            role="tooltip"
            className="pointer-events-none absolute left-0 top-full mt-2 z-10 w-max max-w-[280px] rounded-[8px] bg-[#111827] px-3 py-2 text-[13px] leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100"
          >
            Available only on the Growth plan. Upgrade a website to Growth to request a signed copy.
          </span>
        </span>
      )}

      {formOpen && growthSites.length > 0 && (<>
      {submitted && (
        <div className="mb-6 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3.5 text-[14px] text-[#166534]">
          Request received for <strong>{submitted.companyName}</strong>. A confirmation has been sent to {submitted.signatoryEmail}.
          Reference: {submitted.id}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <Section title="Company details" description="The legal entity that will be named as the data controller in the agreement.">
          <Field label="Company legal name" required>
            <input className={inputClass} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Acme GmbH" maxLength={200} />
          </Field>
          <Field label="Registered address" required>
            <input className={inputClass} value={form.addressLine} onChange={(e) => set("addressLine", e.target.value)} placeholder="Street and number" maxLength={300} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="City" required>
              <input className={inputClass} value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Postal code">
              <input className={inputClass} value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} maxLength={40} />
            </Field>
            <Field label="Country" required>
              <input className={inputClass} value={form.country} onChange={(e) => set("country", e.target.value)} maxLength={120} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Company registration number">
              <input className={inputClass} value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} maxLength={100} />
            </Field>
            <Field label="VAT / Tax ID">
              <input className={inputClass} value={form.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} maxLength={100} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Company website" required hint={growthSites.length ? "Signed DPAs are available for websites on the Growth plan." : undefined}>
              {growthSites.length ? (
                <select className={inputClass} value={form.siteIds[0] || ""} onChange={(e) => pickSite(e.target.value)}>
                  {growthSites.map((s: any) => (
                    <option key={s.id} value={String(s.id)}>{s.domain || s.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-[13px] text-[#92400e] bg-[#fffbeb] border border-[#fde68a] rounded-[8px] px-3 py-2.5">
                  Signed DPAs are available for websites on the Growth plan. Upgrade a website to Growth to request one.
                </p>
              )}
            </Field>
            <Field label="Company size">
              <select className={inputClass} value={form.companySize} onChange={(e) => set("companySize", e.target.value)}>
                <option value="">Select company size</option>
                {COMPANY_SIZES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Authorised signatory" description="The person who will sign the agreement for your company. The DPA is emailed to this address.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full name" required>
              <input className={inputClass} value={form.signatoryName} onChange={(e) => set("signatoryName", e.target.value)} maxLength={160} />
            </Field>
            <Field label="Job title" required>
              <input className={inputClass} value={form.signatoryTitle} onChange={(e) => set("signatoryTitle", e.target.value)} placeholder="e.g. Managing Director" maxLength={160} />
            </Field>
          </div>
          <Field label="Work email" required>
            <input type="email" className={inputClass} value={form.signatoryEmail} onChange={(e) => set("signatoryEmail", e.target.value)} maxLength={254} />
            {emailInvalid && <p className="text-[12px] text-red-600 mt-1.5">Enter a valid email address.</p>}
          </Field>
        </Section>

        <Section title="Privacy contact" description="Your Data Protection Officer or privacy contact, if different from the signatory. Named in the agreement for data-protection notices.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name">
              <input className={inputClass} value={form.privacyContactName} onChange={(e) => set("privacyContactName", e.target.value)} maxLength={160} />
            </Field>
            <Field label="Email">
              <input type="email" className={inputClass} value={form.privacyContactEmail} onChange={(e) => set("privacyContactEmail", e.target.value)} maxLength={254} />
              {contactEmailInvalid && <p className="text-[12px] text-red-600 mt-1.5">Enter a valid email address.</p>}
            </Field>
          </div>
          <Field
            label="EU / UK representative"
            hint="Only if your company is outside the EU or UK and has appointed a representative (GDPR Art. 27). Name and contact details."
          >
            <input className={inputClass} value={form.representative} onChange={(e) => set("representative", e.target.value)} maxLength={300} />
          </Field>
        </Section>

        <Section title="Agreement details">
          <div>
            <p className="text-[15px] text-[#111827] mb-2">Agreement</p>
            <div className="rounded-[10px] border border-[#007aff] bg-[#f5f9ff] px-4 py-3.5 sm:max-w-[420px]">
              <span className="block text-[15px] text-[#111827]">ConsentBit&apos;s standard DPA</span>
              <span className="block text-[13px] text-[#6b7280] mt-0.5">Our DPA with your company details filled in, sent to the signatory to sign.</span>
            </div>
          </div>
          <Field label="Where do you collect consent?" required hint="Tells us which transfer clauses to include (e.g. EU Standard Contractual Clauses, UK Addendum).">
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => {
                const on = form.regions.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggle("regions", r)}
                    className={`h-[36px] px-3.5 rounded-full border text-[14px] transition-colors ${on ? "bg-[#e6f1fd] border-[#007aff] text-[#007aff]" : "bg-white border-[#d1d5db] text-[#374151] hover:bg-[#f5f7fa]"}`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Needed by">
            <input type="date" className={`${inputClass} sm:max-w-[240px]`} value={form.neededBy} onChange={(e) => set("neededBy", e.target.value)} />
          </Field>
          <Field label="Notes" hint="Anything we should know, such as a procurement or purchase-order reference.">
            <textarea
              className="w-full min-h-[110px] border border-[#d1d5db] rounded-[8px] px-3 py-2.5 text-[15px] text-[#111827] bg-white placeholder:text-[#9ca3af] focus:outline-none focus:border-[#007aff] focus:ring-1 focus:ring-[#007aff]"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              maxLength={3000}
            />
          </Field>
        </Section>

        <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-5 py-5 text-[13px] leading-[1.6] text-[#4b5563] space-y-2">
          <p className="font-semibold text-[14px] text-[#111827]">How we use this information</p>
          <p>
            Seattle New Media, LLC (dba ConsentBit) uses the details in this form only to prepare, send and keep a record of your
            Data Processing Agreement, and to contact the people named here about it. We don't use them for marketing.
          </p>
          <p>
            The request and the signed agreement are kept for as long as the agreement is in force and afterwards for as long as we
            need them to show what was agreed. You can ask us to correct these details at any time by emailing{" "}
            <a href="mailto:web@consentbit.com" className="text-[#007aff] hover:underline">web@consentbit.com</a>. Read our{" "}
            <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-[#007aff] hover:underline">Privacy Policy</a>{" "}
            for how we handle personal data and your rights.
          </p>
        </div>

        <label className="flex items-start gap-3 text-[14px] text-[#111827] cursor-pointer">
          <input type="checkbox" className="mt-[3px] accent-[#007aff] size-[18px] shrink-0" checked={form.privacyAck} onChange={(e) => set("privacyAck", e.target.checked)} />
          <span>
            I confirm the details are accurate and that the signatory is authorised to sign on behalf of the company. I agree to the{" "}
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="text-[#007aff] hover:underline">Terms &amp; Conditions</a>{" "}
            and acknowledge the{" "}
            <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-[#007aff] hover:underline">Privacy Policy</a>.
          </span>
        </label>

        {error && <p className="text-[14px] text-red-600">{error}</p>}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-[44px] px-6 rounded-[8px] bg-[#007aff] text-white text-[15px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#006ae0] transition-colors"
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
          {missing.length > 0 && (
            <p className="text-[13px] text-[#6b7280]">Still needed: {missing.join(", ")}.</p>
          )}
        </div>
      </form>
      </>)}

      {requests.length > 0 && (
        <div className="mt-10">
          <p className="font-semibold text-[16px] text-[#111827] mb-3">Your DPA requests</p>
          <div className="bg-white border border-[#e5e7eb] rounded-[10px] overflow-hidden">
            <div className="grid grid-cols-[1.3fr_1.3fr_0.9fr_1fr_1fr] gap-4 px-4 py-3 border-b border-[#e5e7eb] text-[13px] font-medium text-[#6b7280]">
              <span>Company</span>
              <span>Signatory</span>
              <span>Submitted</span>
              <span>Status</span>
              <span>Signed copy</span>
            </div>
            {requests.map((r) => (
              <div key={r.id} className="grid grid-cols-[1.3fr_1.3fr_0.9fr_1fr_1fr] gap-4 px-4 py-3 border-b last:border-b-0 border-[#f3f4f6] text-[14px] text-[#111827]">
                <span className="truncate">{r.companyName}</span>
                <span className="truncate">{r.signatoryEmail}</span>
                <span>{fmtDate(r.createdAt)}</span>
                <span>{statusLabel(r.status)}</span>
                <span>
                  {r.hasDocument ? (
                    <a
                      href={`/api/dpa-request/document?id=${encodeURIComponent(r.id)}`}
                      className="inline-flex h-[30px] items-center px-3 rounded-[6px] bg-[#007aff] text-white text-[12px] hover:bg-[#006ae0]"
                    >
                      Download PDF
                    </a>
                  ) : (
                    <span className="text-[#9ca3af]">Not ready yet</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
