"use client";
import { useState } from "react";
import PoweredByFooter from "./PoweredByFooter";
import { iabT, resolveIabLang } from "./iabTranslations";
import { useIabPurposeSections } from "./iabGvlPurposes";

/**
 * CMP id shown in the modal's storage-disclosure text. Matches the runtime TCF
 * manager's config (iabrefrence/Tcfmanager.js), so the preview quotes the same
 * registered id the live banner encodes into the TC string.
 */
const CMP_ID = 502;

// ─── Default Style Config ────────────────────────────────────────────────────
const defaultStyleConfig = {
  bannerBg: "#FFFFFF",
  textColor: "#000000",
  headingColor: "#000000",
  buttonColor: "#FFFFFF",
  buttonTextColor: "#007AFF",
  SecButtonColor: "#007AFF",
  SecButtonTextColor: "#FFFFFF",
  textAlign: "left",
  fontWeight: "400",
  borderRadius: "12",
  buttonBorderRadius: "4",
  bannerType: "banner", // "box" | "banner" | "popup"
  bannerEntranceAnimation: "fade-in", // 'fade-in' | 'slide-up' | 'slide-down' | 'zoom-in'
  // Preview-only: allow the outer editor to pass its floating-button state so we can avoid overlap.
  floatingButtonEnabled: false,
  floatingButtonPosition: "left",
  // Google Additional Consent (AC) layer — when true, the Vendors tab gains a
  // "Google Partners" sub-tab listing Google-certified additional ad partners.
  isGAC: false,
  // Growth-plan entitlement: hides the "Powered by ConsentBit" strip on the preference view.
  hideBranding: false,
};

function entranceAnimStyle(anim, opts = {}) {
  const isCenter = opts?.isCenter === true;
  const a = String(anim || "fade-in").toLowerCase();
  if (isCenter) {
    if (a === "slide-up") return "cbIabCenterSlideUp 0.4s ease-out both";
    if (a === "slide-down") return "cbIabCenterSlideDown 0.4s ease-out both";
    if (a === "zoom-in") return "cbIabCenterZoomIn 0.3s ease-out both";
    return "cbIabFadeIn 0.3s ease-out both";
  }
  if (a === "slide-up") return "cbIabSlideUp 0.4s ease-out both";
  if (a === "slide-down") return "cbIabSlideDown 0.4s ease-out both";
  if (a === "zoom-in") return "cbIabZoomIn 0.3s ease-out both";
  return "cbIabFadeIn 0.3s ease-out both";
}

// ─── Cookie Categories Data ──────────────────────────────────────────────────
// Names and descriptions are i18n keys resolved at render, matching the runtime
// banner — it stores keys here too rather than text, so a language switch does
// not have to rebuild the category list. The `cookies` audit rows below are not
// rendered by the preview and are left as-is.
const cookieCategories = [
  {
    id: "necessary",
    nameKey: "cat.necessary",
    alwaysActive: true,
    descKey: "cat.necessaryDesc",
    cookies: [
      {
        name: "_cfuvid",
        duration: "Session",
        description:
          "Calendly sets this cookie to track users across sessions to optimize user experience by maintaining session consistency.",
      },
      {
        name: "cookieyes-consent",
        duration: "1 year",
        description:
          "CookieYes sets this cookie to remember users consent preferences so that their preferences are respected on subsequent visits.",
      },
    ],
  },
  {
    id: "functional",
    nameKey: "cat.functional",
    alwaysActive: false,
    descKey: "cat.functionalDesc",
    cookies: [],
  },
  {
    id: "analytics",
    nameKey: "cat.analytics",
    alwaysActive: false,
    descKey: "cat.analyticsDesc",
    cookies: [
      {
        name: "_hjSessionUser_*",
        duration: "1 year",
        description:
          "Hotjar sets this cookie to ensure data from subsequent visits to the same site is attributed to the same user ID.",
      },
      {
        name: "_hjSession_*",
        duration: "1 hour",
        description:
          "Hotjar sets this cookie to ensure data from subsequent visits to the same site is attributed to the same user ID.",
      },
    ],
  },
  {
    id: "performance",
    nameKey: "cat.performance",
    alwaysActive: false,
    descKey: "cat.performanceDesc",
    cookies: [
      {
        name: "SRM_B",
        duration: "1 year 24 days",
        description: "Used by Microsoft Advertising as a unique ID for visitors.",
      },
    ],
  },
  {
    id: "advertisement",
    nameKey: "cat.advertisement",
    alwaysActive: false,
    descKey: "cat.advertisementDesc",
    cookies: [
      {
        name: "MUID",
        duration: "1 year 24 days",
        description:
          "Bing sets this cookie to recognise unique web browsers visiting Microsoft sites.",
      },
      {
        name: "ANONCHK",
        duration: "10 minutes",
        description:
          "The ANONCHK cookie, set by Bing, is used to store a user session ID and verify ad clicks on the Bing search engine.",
      },
    ],
  },
];

// ─── Purposes Data ───────────────────────────────────────────────────────────
// Purposes, special purposes, features and special features are IAB's own
// declarations, not ours. They come from the Global Vendor List in the selected
// language via useIabPurposeSections() — see iabGvlPurposes.ts — so the preview
// shows the same wording the live banner does.

/** Curried string lookup, so components take a plain `t(key, vars)` prop. */
const makeT = (lang) => (key, vars) => iabT(lang, key, vars);

// ─── Google Additional Consent (AC) — sample ATP partners ────────────────────
// Preview-only sample of Google-certified additional advertising partners (ATP).
// At runtime the live banner fetches the real list from Google's ATP feed; here
// we show a representative sample so the GAC section renders in the preview.
const sampleAtpProviders = [
  { id: 1, name: "Google Advertising Products", policyUrl: "https://policies.google.com/privacy" },
  { id: 2552, name: "Outbrain UK Ltd", policyUrl: "https://www.outbrain.com/legal/privacy" },
  { id: 2657, name: "Index Exchange, Inc.", policyUrl: "https://www.indexexchange.com/privacy/" },
  { id: 3370, name: "Teads", policyUrl: "https://www.teads.com/privacy-policy/" },
  { id: 3052, name: "Sharethrough, Inc.", policyUrl: "https://www.sharethrough.com/privacy-center/" },
];

// ─── Radii Helper ────────────────────────────────────────────────────────────
function getRadii(s) {
  const brNum = Number.parseFloat(s.borderRadius) || 0;
  const brBtnRaw =
    s.buttonBorderRadius != null && String(s.buttonBorderRadius).trim() !== ""
      ? Number.parseFloat(s.buttonBorderRadius)
      : null;
  return {
    br: `${brNum}px`,
    brSm: `${Math.min(brNum, 8)}px`,
    brPill: `999px`,
    brBtn: brBtnRaw != null && Number.isFinite(brBtnRaw) ? `${brBtnRaw}px` : `${Math.min(brNum, 8)}px`,
  };
}

function alignToJustify(textAlign) {
  if (textAlign === "center") return "center";
  if (textAlign === "right") return "flex-end";
  return "flex-start";
}

function footerJustify(textAlign) {
  if (textAlign === "center") return "center";
  if (textAlign === "right") return "flex-start";
  return "flex-end";
}

// ─── Toggle Switch (cb-switch) ───────────────────────────────────────────────
function Switch({ checked, onChange, disabled = false, accent = "#007AFF", size = "md" }) {
  const w = size === "sm" ? 36 : 44;
  const h = size === "sm" ? 20 : 24;
  const knob = size === "sm" ? 14 : 18;
  const inset = 3;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width: `${w}px`,
        height: `${h}px`,
        borderRadius: "999px",
        border: "none",
        padding: 0,
        background: checked ? accent : "#d0d5d2",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background-color 0.2s",
        opacity: disabled ? 0.7 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: `${inset}px`,
          left: `${inset}px`,
          width: `${knob}px`,
          height: `${knob}px`,
          borderRadius: "50%",
          background: "#fff",
          transform: checked ? `translateX(${w - knob - inset * 2}px)` : "translateX(0)",
          transition: "transform 0.2s",
        }}
      />
    </button>
  );
}

// ─── Chevron Right (CSS triangle that rotates) ──────────────────────────────
function ChevronRight({ open, size = 6 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 0,
        height: 0,
        borderTop: `${size - 2}px solid transparent`,
        borderBottom: `${size - 2}px solid transparent`,
        borderLeft: `${size}px solid #999`,
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.2s",
      }}
    />
  );
}

// ─── Cookie Accordion (cb-accordion) ────────────────────────────────────────
function CookieAccordion({ category, s, radii, t }) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(category.alwaysActive);
  return (
    <div
      style={{
        border: "1px solid #ebebeb",
        borderRadius: radii.brSm,
        overflow: "hidden",
        background: s.bannerBg,
      }}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          gap: "12px",
          padding: "14px 16px",
          cursor: "pointer",
          transition: "background-color 0.2s",
        }}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ChevronRight open={open} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: s.headingColor,
                textAlign: s.textAlign,
              }}
            >
              {t(category.nameKey)}
            </span>
            <div onClick={(e) => e.stopPropagation()}>
              {category.alwaysActive ? (
                <span
                  style={{
                    padding: "3px 10px",
                    background: "#DCFCE7",
                    color: "#166534",
                    borderRadius: radii.brPill,
                    fontSize: "11px",
                    fontWeight: 500,
                  }}
                >
                  {t("cat.alwaysActive")}
                </span>
              ) : (
                <Switch checked={enabled} onChange={setEnabled} accent={s.SecButtonColor} />
              )}
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          maxHeight: open ? "2000px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.3s ease",
        }}
      >
        <div
          style={{
            background: "#f4f4f4",
            border: "1px solid #ebebeb",
            borderRadius: radii.brSm,
            padding: "14px",
            margin: "0 14px 14px",
            color: s.textColor,
            fontSize: "12px",
            lineHeight: 1.6,
            fontWeight: s.fontWeight,
          }}
        >
          {t(category.descKey)}
        </div>
      </div>
    </div>
  );
}

// ─── Purpose Child Item (cb-child-accordion) ────────────────────────────────
function PurposeChildItem({ item, s, radii, t, isMobile = false }) {
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [legitimate, setLegitimate] = useState(!!item.hasLegitimate);
  return (
    <div style={{ borderTop: "1px solid #ebebeb" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          gap: "12px",
          padding: "12px 16px",
          cursor: "pointer",
          transition: "background-color 0.2s",
        }}
      >
        <div
          style={{
            width: "16px",
            height: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ChevronRight open={open} size={5} />
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: s.headingColor,
              textAlign: "left",
              flex: 1,
            }}
          >
            {item.title}
          </span>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "flex-start" : "center",
              gap: isMobile ? "6px" : "12px",
              flexShrink: 0,
            }}
          >
            {item.hasLegitimate && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  paddingRight: isMobile ? 0 : "12px",
                  paddingBottom: isMobile ? "6px" : 0,
                  borderRight: isMobile ? "none" : "1px solid #ddd",
                  borderBottom: isMobile ? "1px solid #ddd" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: s.textColor,
                    opacity: 0.6,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("section.legitimateInterest")}
                </span>
                <Switch checked={legitimate} onChange={setLegitimate} accent={s.SecButtonColor} size="sm" />
              </div>
            )}
            {item.hasConsent && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    color: s.textColor,
                    opacity: 0.6,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("label.consent")}
                </span>
                <Switch checked={consent} onChange={setConsent} accent={s.SecButtonColor} size="sm" />
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        style={{
          maxHeight: open ? "1000px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.3s ease",
        }}
      >
        <div
          style={{
            padding: "14px",
            background: "#f9f9f9",
            margin: "0 14px 14px",
            borderRadius: radii.brSm,
          }}
        >
          <p
            style={{
              color: s.textColor,
              fontSize: "12px",
              lineHeight: 1.6,
              fontWeight: s.fontWeight,
              textAlign: s.textAlign,
              margin: "0 0 8px 0",
            }}
          >
            {item.description}
          </p>
          {/* Only shown where the user actually has a choice. Special purposes and
              features are disclosure-only, and the runtime's count line for those
              is English-only — omitting it beats an untranslated line here. */}
          {item.hasConsent && (
            <div
              style={{
                marginTop: "12px",
                fontSize: "12px",
                color: s.textColor,
                opacity: 0.6,
                fontWeight: 500,
              }}
            >
              {t("vendor.consentCount", { count: item.vendorCount })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Purpose Section (parent accordion) ─────────────────────────────────────
function PurposeSection({ section, s, radii, t, isMobile = false }) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  return (
    <div
      style={{
        border: "1px solid #ebebeb",
        borderRadius: radii.brSm,
        overflow: "hidden",
        background: s.bannerBg,
      }}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{ display: "flex", gap: "12px", padding: "14px 16px", cursor: "pointer" }}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ChevronRight open={open} />
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: s.headingColor,
              textAlign: s.textAlign,
            }}
          >
            {section.title}
          </span>
          {section.hasToggle && (
            <div onClick={(e) => e.stopPropagation()}>
              <Switch checked={enabled} onChange={setEnabled} accent={s.SecButtonColor} />
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          maxHeight: open ? "3000px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.35s ease",
        }}
      >
        <div>
          {section.items.map((item) => (
            <PurposeChildItem key={item.id} item={item} s={s} radii={radii} t={t} isMobile={isMobile} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Google Partner Item (GAC ATP card) ─────────────────────────────────────
// Mirrors the runtime ATP card: name, "AC ID", a Consent switch, and an
// optional Privacy policy link. Only rendered when Google AC is enabled.
function GooglePartnerItem({ provider, s, radii, t }) {
  const [consent, setConsent] = useState(false);
  return (
    <div
      style={{
        padding: "16px",
        border: "1px solid #f0f0f0",
        borderRadius: radii.brSm,
        background: "#fafafa",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: "15px", color: s.headingColor, marginBottom: "4px" }}>
            {provider.name}
          </div>
          <div style={{ fontSize: "12px", color: s.textColor, fontFamily: "monospace" }}>
            AC {t("vendor.idPrefix")} {provider.id}
          </div>
        </div>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 500, color: s.textColor }}>{t("label.consent")}</span>
          <Switch checked={consent} onChange={setConsent} accent={s.SecButtonColor} size="sm" />
        </div>
      </div>
      {provider.policyUrl && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", fontSize: "12.5px", marginTop: "8px" }}>
          <a
            href={provider.policyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#007AFF", textDecoration: "none", fontWeight: 500 }}
          >
            {t("link.privacyPolicy")}
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Preference Modal ───────────────────────────────────────────────────────
function PreferenceModal({ open, onClose, onAccept, onReject, s, radii, t, lang, device = "desktop" }) {
  const isMobile = device === "mobile";
  const [activeTab, setActiveTab] = useState("cookie");
  // GAC: which vendor sub-tab is shown (IAB vendor list vs Google Partners list).
  const [vendorSubTab, setVendorSubTab] = useState("iab");
  // Called before the `open` guard below — hooks cannot sit after an early return.
  const purposeSections = useIabPurposeSections(lang);
  const tabs = [
    { id: "cookie", label: t("tab.cookie") },
    { id: "purpose", label: t("tab.purpose") },
    { id: "vendor", label: t("tab.vendor") },
  ];
  if (!open) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1000000,
        background: "rgba(0,0,0,0.5)",
        padding: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: s.bannerBg,
          border: "1px solid #f4f4f4",
          borderRadius: radii.br,
          width: "100%",
          maxWidth: "720px",
          maxHeight: "90%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          animation: "cbIabPopIn 0.25s cubic-bezier(0.34,1.2,0.64,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #f4f4f4",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "18px", fontWeight: 600, color: s.headingColor }}>
            {t("modal.title")}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("btn.close")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              opacity: 0.5,
              display: "flex",
              color: s.textColor,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
          {/* Intro description */}
          <div
            style={{
              color: s.textColor,
              fontSize: "13px",
              lineHeight: 1.6,
              fontWeight: s.fontWeight,
              textAlign: s.textAlign,
              paddingTop: "16px",
            }}
          >
            <p style={{ margin: "0 0 12px 0" }}>{t("modal.intro")}</p>
            <details
              style={{
                fontSize: "12px",
                color: s.textColor,
                background: "#f7f7f7",
                border: "1px solid #ebebeb",
                borderRadius: radii.brSm,
                padding: "10px 12px",
                marginTop: "12px",
              }}
            >
              <summary
                style={{ cursor: "pointer", fontWeight: 600, color: s.headingColor }}
              >
                {t("modal.disclosureSummary")}
              </summary>
              {/* The copy wraps <code> spans around the cookie and storage key names,
                  so it is inserted as markup. Our own literal, never user input. */}
              <p
                className="cbIabRichText"
                style={{ marginTop: "6px", marginBottom: 0 }}
                dangerouslySetInnerHTML={{
                  __html: t("modal.disclosureBodyHtml", { cmpId: CMP_ID }),
                }}
              />
            </details>
          </div>

          {/* Tabs */}
          <div style={{ marginTop: "24px", marginBottom: "24px", borderBottom: "2px solid #f4f4f4" }}>
            <ul
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                listStyle: "none",
                gap: 0,
                padding: 0,
                margin: 0,
              }}
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id} style={{ flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        background: "none",
                        border: "none",
                        borderBottom: `3px solid ${isActive ? s.buttonColor : "transparent"}`,
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: isActive ? 700 : s.fontWeight,
                        color: s.textColor,
                        opacity: isActive ? 1 : 0.6,
                        transition: "all 0.2s",
                      }}
                    >
                      {tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Tab content */}
          {activeTab === "cookie" && (
            <div>
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: s.headingColor,
                  marginBottom: "14px",
                  textAlign: s.textAlign,
                }}
              >
                {t("tab.cookie")}
              </p>
              <div
                style={{
                  color: s.textColor,
                  fontSize: "13px",
                  lineHeight: 1.6,
                  fontWeight: s.fontWeight,
                  textAlign: s.textAlign,
                }}
              >
                <p style={{ margin: "0 0 12px 0" }}>{t("cookie.intro1")}</p>
                <p style={{ margin: 0 }}>{t("cookie.intro2")}</p>
              </div>
              <div style={{ height: "1px", background: "#ebebeb", margin: "20px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {cookieCategories.map((cat) => (
                  <CookieAccordion key={cat.id} category={cat} s={s} radii={radii} t={t} />
                ))}
              </div>
            </div>
          )}

          {activeTab === "purpose" && (
            <div>
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: s.headingColor,
                  marginBottom: "14px",
                  textAlign: s.textAlign,
                }}
              >
                {t("tab.purpose")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {purposeSections.map((section) => (
                  <PurposeSection key={section.id} section={section} s={s} radii={radii} t={t} isMobile={isMobile} />
                ))}
              </div>
            </div>
          )}

          {activeTab === "vendor" && (
            <div>
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: s.headingColor,
                  marginBottom: "14px",
                  textAlign: s.textAlign,
                }}
              >
                {t("tab.vendor")}
              </p>

              {/* GAC: sub-tab switcher — IAB Vendors | Google Partners.
                  Left in English deliberately: the runtime builds these two pill
                  labels from literals too, so translating only here would make the
                  preview disagree with the live banner. */}
              {s.isGAC && (
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                  {[
                    { id: "iab", label: "IAB Vendors" },
                    { id: "google", label: `Google Partners (${sampleAtpProviders.length})` },
                  ].map((tab) => {
                    const active = vendorSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setVendorSubTab(tab.id)}
                        style={{
                          padding: "8px 16px",
                          border: "none",
                          background: "transparent",
                          color: s.textColor,
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: active ? 700 : 500,
                          textDecoration: active ? "underline" : "none",
                          textUnderlineOffset: "3px",
                          transition: "all 0.15s",
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Preview only — vendor list intentionally left empty */}
              <div style={{ position: "relative", marginBottom: "20px" }}>
                <input
                  type="text"
                  placeholder={t("vendor.searchPlaceholder")}
                  readOnly
                  style={{
                    width: "100%",
                    padding: "12px 16px 12px 44px",
                    border: "2px solid #e0e0e0",
                    borderRadius: radii.brSm,
                    fontSize: "14px",
                    background: "#fff",
                    boxSizing: "border-box",
                    outline: "none",
                    color: s.textColor,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "16px",
                    color: s.textColor,
                    pointerEvents: "none",
                  }}
                >
                  🔍
                </div>
              </div>

              {/* GAC Google Partners sub-tab — list of additional ad partners (ATP) */}
              {s.isGAC && vendorSubTab === "google" ? (
                <div>
                  <p
                    style={{
                      fontSize: "12px",
                      color: s.textColor,
                      opacity: 0.85,
                      lineHeight: 1.6,
                      margin: "0 0 12px 0",
                      textAlign: s.textAlign,
                    }}
                  >
                    {t("atp.note")}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    {sampleAtpProviders.map((p) => (
                      <GooglePartnerItem key={p.id} provider={p} s={s} radii={radii} t={t} />
                    ))}
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    textAlign: "center",
                    color: s.textColor,
                    padding: "40px",
                    fontStyle: "italic",
                    fontSize: "13px",
                    opacity: 0.5,
                  }}
                >
                  {t("vendor.loading")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #f4f4f4",
            background: s.bannerBg,
            flexShrink: 0,
            borderRadius: `0 0 ${radii.br} ${radii.br}`,
          }}
        >
          <div
            style={{
              padding: "14px 22px",
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: "10px",
              justifyContent: isMobile ? "stretch" : footerJustify(s.textAlign),
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={onReject}
              style={{
                padding: "9px 20px",
                borderRadius: radii.brBtn,
                fontSize: "13px",
                fontWeight: s.fontWeight,
                cursor: "pointer",
                whiteSpace: "nowrap",
                border: `2px solid ${s.buttonColor}`,
                background: s.buttonColor,
                color: s.buttonTextColor,
                width: isMobile ? "100%" : undefined,
              }}
            >
              {t("btn.rejectAll")}
            </button>
            <button
              type="button"
              onClick={onAccept}
              style={{
                padding: "9px 20px",
                borderRadius: radii.brBtn,
                fontSize: "13px",
                fontWeight: s.fontWeight,
                cursor: "pointer",
                whiteSpace: "nowrap",
                border: `2px solid ${s.buttonColor}`,
                background: s.buttonColor,
                color: s.buttonTextColor,
                width: isMobile ? "100%" : undefined,
              }}
            >
              {t("btn.acceptAll")}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "9px 20px",
                borderRadius: radii.brBtn,
                fontSize: "13px",
                fontWeight: s.fontWeight,
                cursor: "pointer",
                whiteSpace: "nowrap",
                border: `2px solid ${s.SecButtonColor}`,
                background: s.SecButtonColor,
                color: s.SecButtonTextColor,
                width: isMobile ? "100%" : undefined,
              }}
            >
              {t("btn.savePreferences")}
            </button>
          </div>

          {/* Powered by ConsentBit */}
          {!s.hideBranding && <PoweredByFooter radius={radii.br} />}
        </div>
      </div>
      <style>{`@keyframes cbIabPopIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Fill one of the empty spans the notice copy leaves for a generated list.
 * The runtime does the same thing in updateDynamicCounts(); keeping the spans in
 * the translated string is what lets each language put the list where its own
 * grammar needs it.
 */
function fillSpan(html, id, text) {
  return html.replace(
    new RegExp(`(<span id="${id}"[^>]*>)\\s*(</span>)`),
    `$1${escapeHtml(text)}$2`,
  );
}

// ─── Banner Notice Description (shared by all banner layouts) ───────────────
function NoticeDescription({ s, t, purposeSections, onCustomiseAriaId }) {
  void onCustomiseAriaId;

  const namesOf = (sectionId) =>
    (purposeSections.find((section) => section.id === sectionId)?.items || [])
      .map((item) => item.title)
      .filter(Boolean)
      .join(", ");

  let purposesLine = t("banner.purposesLineHtml");
  purposesLine = fillSpan(purposesLine, "consentBitPurposesText", namesOf("purposes"));
  purposesLine = fillSpan(
    purposesLine,
    "consentBitSpecialFeaturesText",
    namesOf("special-features"),
  );

  return (
    <div
      className="cbIabRichText"
      style={{
        flex: 1,
        color: s.textColor,
        lineHeight: 1.6,
        fontSize: "14px",
        fontWeight: s.fontWeight,
        textAlign: s.textAlign,
        // Consumed by the .cbIabRichText rules so markup inside the translated
        // copy can pick up the configured heading colour.
        "--cb-heading": s.headingColor,
      }}
      // The vendors link inside the copy is inert in a preview.
      onClick={(e) => {
        if (e.target.closest("a")) e.preventDefault();
      }}
    >
      {/* Both strings wrap markup — a vendor link, <strong> labels, and the spans
          filled above — so they are inserted as HTML. Our own literals; the only
          interpolated values are IAB purpose names, escaped in fillSpan(). */}
      <p
        style={{ margin: "0 0 12px 0" }}
        dangerouslySetInnerHTML={{ __html: t("banner.bodyHtml") }}
      />
      <p
        style={{ margin: "8px 0 0 0", fontSize: "14px", lineHeight: 1.5, opacity: 0.85 }}
        dangerouslySetInnerHTML={{ __html: purposesLine }}
      />
    </div>
  );
}

// ─── Banner Bar (cb-consent-bar) ────────────────────────────────────────────
function BannerBar({ s, radii, layout, t, purposeSections, onCustomise, onReject, onAccept, device = "desktop" }) {
  const isFullBanner = layout === "banner";
  const isMobile = device === "mobile";
  // On mobile, full-banner stacks like the box layout.
  const horizontalLayout = isFullBanner && !isMobile;
  const btnJustify = isMobile
    ? "stretch"
    : horizontalLayout
      ? "flex-end"
      : alignToJustify(s.textAlign);
  const buttonBase = {
    padding: "11px 20px",
    borderRadius: radii.brBtn,
    fontSize: "14px",
    fontWeight: s.fontWeight,
    cursor: "pointer",
    minHeight: "44px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    transition: "opacity 0.2s ease",
    boxSizing: "border-box",
    width: isMobile ? "100%" : undefined,
  };
  return (
    <div
      style={{
        background: s.bannerBg,
        border: "1px solid #f4f4f4",
        borderRadius: isFullBanner ? "0px" : radii.br,
        padding: isMobile ? "18px" : isFullBanner ? "16px 24px" : "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <p
          style={{
            fontSize: isMobile ? "16px" : "20px",
            fontWeight: 700,
            lineHeight: 1.3,
            margin: "0 0 12px 0",
            color: s.headingColor,
            textAlign: s.textAlign,
          }}
        >
          {t("banner.title")}
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: horizontalLayout ? "row" : "column",
            alignItems: horizontalLayout ? "center" : "stretch",
            gap: "20px",
            flex: 1,
          }}
        >
          <NoticeDescription s={s} t={t} purposeSections={purposeSections} />
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: "8px",
              flexWrap: "wrap",
              paddingTop: horizontalLayout ? 0 : "16px",
              borderTop: horizontalLayout ? "none" : "1px solid #f0f0f0",
              justifyContent: btnJustify,
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={onCustomise}
              style={{
                ...buttonBase,
                border: `2px solid ${s.SecButtonColor}`,
                background: s.SecButtonColor,
                color: s.SecButtonTextColor,
              }}
            >
              {t("btn.customise")}
            </button>
            <button
              type="button"
              onClick={onReject}
              style={{
                ...buttonBase,
                border: `2px solid ${s.buttonColor}`,
                background: s.buttonColor,
                color: s.buttonTextColor,
              }}
            >
              {t("btn.rejectAll")}
            </button>
            <button
              type="button"
              onClick={onAccept}
              style={{
                ...buttonBase,
                border: `2px solid ${s.buttonColor}`,
                background: s.buttonColor,
                color: s.buttonTextColor,
              }}
            >
              {t("btn.acceptAll")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Cookie Consent Component ───────────────────────────────────────────
export function CookieConsentBanner({
  config = {},
  device = "desktop",
  alignment = "bottom-left",
  lang = "en",
}) {
  const s = { ...defaultStyleConfig, ...config };
  const radii = getRadii(s);
  // Narrowed once here so every child sees the same language the strings resolve
  // against, even when the editor hands us a code we have no table for.
  const resolvedLang = resolveIabLang(lang);
  const t = makeT(resolvedLang);
  // The notice lists the purposes by name, so the banner needs this too — not
  // just the modal.
  const purposeSections = useIabPurposeSections(resolvedLang);
  const [visible, setVisible] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const handleAccept = () => {
    setVisible(true);
    setModalOpen(false);
  };
  const handleReject = () => {
    setVisible(true);
    setModalOpen(false);
  };
  const handleCustomise = () => {
    setVisible(false);
    setModalOpen(true);
  };

  const br = radii.br;
  const isMobile = device === "mobile";
  const floatGutterPx = s.floatingButtonEnabled && device !== "mobile" ? 60 : 0;
  const boxEdge = isMobile ? 10 : device === "desktop" ? 20 : 0;
  const positionStyles =
    s.bannerType === "box"
      ? alignment === "bottom-left"
        ? {
            left: `${boxEdge + (s.floatingButtonPosition === "left" ? floatGutterPx : 0)}px`,
            right: isMobile ? `${boxEdge}px` : "auto",
          }
        : alignment === "bottom-right"
        ? {
            right: `${boxEdge + (s.floatingButtonPosition === "right" ? floatGutterPx : 0)}px`,
            left: isMobile ? `${boxEdge}px` : "auto",
          }
        : {}
      : {};

  return (
    <>
      {visible && (
        <>
          {/* BOX — corner card */}
          {s.bannerType === "box" && (
            <div
              style={{
                position: "absolute",
                bottom: isMobile ? "10px" : "20px",
                left: isMobile ? "10px" : "20px",
                zIndex: 9,
                width: isMobile ? undefined : "100%",
                maxWidth: isMobile ? "calc(100% - 20px)" : "600px",
                maxHeight: isMobile ? "calc(100% - 20px)" : "calc(100% - 40px)",
                overflowY: "auto",
                boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                borderRadius: br,
                animation: entranceAnimStyle(s.bannerEntranceAnimation),
                ...positionStyles,
              }}
            >
              <BannerBar
                s={s}
                radii={radii}
                t={t}
                purposeSections={purposeSections}
                layout="box"
                device={device}
                onCustomise={handleCustomise}
                onReject={handleReject}
                onAccept={handleAccept}
              />
            </div>
          )}

          {/* BOTTOM CENTER — centered card */}
          {s.bannerType === "bottom-center" && (
            <div
              style={{
                position: "absolute",
                bottom: isMobile ? "10px" : "20px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 999999,
                width: isMobile ? "calc(100% - 20px)" : "calc(100% - 40px)",
                maxWidth: "600px",
                maxHeight: isMobile ? "calc(100% - 20px)" : "calc(100% - 40px)",
                overflowY: "auto",
                boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                borderRadius: br,
                animation: entranceAnimStyle(s.bannerEntranceAnimation, { isCenter: true }),
              }}
            >
              <BannerBar
                s={s}
                radii={radii}
                t={t}
                purposeSections={purposeSections}
                layout="popup"
                device={device}
                onCustomise={handleCustomise}
                onReject={handleReject}
                onAccept={handleAccept}
              />
            </div>
          )}

          {/* FULL BANNER — bottom edge */}
          {s.bannerType === "banner" && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 999999,
                maxHeight: "100%",
                overflowY: "auto",
                animation: entranceAnimStyle(s.bannerEntranceAnimation),
              }}
            >
              <BannerBar
                s={s}
                radii={radii}
                t={t}
                purposeSections={purposeSections}
                layout="banner"
                device={device}
                onCustomise={handleCustomise}
                onReject={handleReject}
                onAccept={handleAccept}
              />
            </div>
          )}
        </>
      )}

      <PreferenceModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setVisible(true);
        }}
        onAccept={handleAccept}
        onReject={handleReject}
        s={s}
        radii={radii}
        t={t}
        lang={resolvedLang}
        device={device}
      />

      <style>{`
        /* Styling for the markup carried inside the translated copy (the vendors
           link, <strong> labels, <code> storage keys). These strings are inserted
           as HTML, so the elements cannot take inline styles of their own. */
        .cbIabRichText a{color:#007AFF;text-decoration:underline;cursor:pointer;font-weight:600}
        .cbIabRichText strong{color:var(--cb-heading,inherit);font-weight:600}
        .cbIabRichText code{background:#fff;padding:1px 5px;border-radius:3px;font-size:11px;border:1px solid #e0e0e0}
        @keyframes cbIabFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes cbIabSlideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes cbIabSlideDown{from{transform:translateY(-24px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes cbIabZoomIn{from{transform:scale(0.92);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes cbIabCenterSlideUp{from{transform:translateX(-50%) translateY(24px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
        @keyframes cbIabCenterSlideDown{from{transform:translateX(-50%) translateY(-24px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
        @keyframes cbIabCenterZoomIn{from{transform:translateX(-50%) scale(0.92);opacity:0}to{transform:translateX(-50%) scale(1);opacity:1}}
      `}</style>
    </>
  );
}

// ─── Demo / Preview Wrapper ───────────────────────────────────────────────────
export default function App() {
  const [config, setConfig] = useState({ ...defaultStyleConfig });
  const [key, setKey] = useState(0);

  const update = (field, val) => setConfig((prev) => ({ ...prev, [field]: val }));
  const reset = () => { setConfig({ ...defaultStyleConfig }); setKey((k) => k + 1); };

  const ColorField = ({ label, field }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <label style={{ fontSize: "11px", color: "#6B7280", fontWeight: "500" }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="color"
          value={config[field]}
          onChange={(e) => update(field, e.target.value)}
          style={{ width: "30px", height: "30px", borderRadius: "6px", border: "1px solid #E5E7EB", cursor: "pointer", padding: "1px" }}
        />
        <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#374151" }}>{config[field]}</span>
      </div>
    </div>
  );

  const SelectField = ({ label, field, options }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <label style={{ fontSize: "11px", color: "#6B7280", fontWeight: "500" }}>{label}</label>
      <select
        value={config[field]}
        onChange={(e) => update(field, e.target.value)}
        style={{
          fontSize: "12px", padding: "6px 10px", borderRadius: "6px",
          border: "1px solid #E5E7EB", backgroundColor: "#fff",
          color: "#374151", cursor: "pointer", outline: "none",
        }}
      >
        {options.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  );

  const RangeField = ({ label, field, min = 0, max = 24 }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <label style={{ fontSize: "11px", color: "#6B7280", fontWeight: "500" }}>
        {label} <span style={{ fontFamily: "monospace", color: "#374151" }}>{config[field]}px</span>
      </label>
      <input
        type="range" min={min} max={max}
        value={config[field]}
        onChange={(e) => update(field, e.target.value)}
        style={{ accentColor: "#3B82F6", width: "100%" }}
      />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F3F4F6", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Config Panel */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px" }}>
        <div style={{ backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "24px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>Cookie Consent Builder</h1>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6B7280" }}>Customise and preview your consent banner live</p>
            </div>
            <button
              onClick={reset}
              style={{
                fontSize: "12px", padding: "7px 14px", borderRadius: "8px",
                border: "1px solid #E5E7EB", backgroundColor: "#fff", color: "#374151",
                cursor: "pointer",
              }}
            >
              ↺ Reset
            </button>
          </div>

          {/* Colors row */}
          <p style={{ fontSize: "11px", fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>Colors</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "14px", marginBottom: "20px" }}>
            <ColorField label="Background" field="bannerBg" />
            <ColorField label="Text Color" field="textColor" />
            <ColorField label="Heading Color" field="headingColor" />
            <ColorField label="Outline Btn BG" field="buttonColor" />
            <ColorField label="Outline Btn Text" field="buttonTextColor" />
            <ColorField label="Primary Btn BG" field="SecButtonColor" />
            <ColorField label="Primary Btn Text" field="SecButtonTextColor" />
          </div>

          {/* Options row */}
          <p style={{ fontSize: "11px", fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>Options</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "14px", marginBottom: "16px" }}>
            <SelectField
              label="Banner Type"
              field="bannerType"
              options={[
                { value: "box", label: "Box (bottom-left)" },
                { value: "banner", label: "Banner (full width)" },
                { value: "popup", label: "Popup (centered)" },
              ]}
            />
            <SelectField
              label="Text Align"
              field="textAlign"
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" },
              ]}
            />
            <SelectField
              label="Font Weight"
              field="fontWeight"
              options={[
                { value: "300", label: "Light (300)" },
                { value: "400", label: "Normal (400)" },
                { value: "500", label: "Medium (500)" },
                { value: "600", label: "SemiBold (600)" },
                { value: "700", label: "Bold (700)" },
              ]}
            />
          </div>
          <div style={{ maxWidth: "320px" }}>
            <RangeField label="Border Radius:" field="borderRadius" min={0} max={24} />
          </div>
        </div>

        {/* Preview label */}
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <span style={{ fontSize: "11px", color: "#9CA3AF", backgroundColor: "#fff", padding: "4px 14px", borderRadius: "999px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            ↓ Live Preview
          </span>
        </div>

        {/* Spacer so panel doesn't overlap banner */}
        <div style={{ height: config.bannerType === "banner" ? "100px" : "60px" }} />
      </div>

      {/* Live Banner */}
      <CookieConsentBanner key={key} config={config} />
    </div>
  );
}
