import { useState } from "react";

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
  bannerType: "banner", // "box" | "banner" | "popup"
};

// ─── Cookie Categories Data ──────────────────────────────────────────────────
const cookieCategories = [
  {
    id: "necessary",
    name: "Necessary",
    alwaysActive: true,
    description:
      "Necessary cookies are required to enable the basic features of this site, such as providing secure log-in or adjusting your consent preferences. These cookies do not store any personally identifiable data.",
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
    name: "Functional",
    alwaysActive: false,
    description:
      "Functional cookies help perform certain functionalities like sharing the content of the website on social media platforms, collecting feedback, and other third-party features.",
    cookies: [],
  },
  {
    id: "analytics",
    name: "Analytics",
    alwaysActive: false,
    description:
      "Analytical cookies are used to understand how visitors interact with the website. These cookies help provide information on metrics such as the number of visitors, bounce rate, traffic source, etc.",
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
    name: "Performance",
    alwaysActive: false,
    description:
      "Performance cookies are used to understand and analyse the key performance indexes of the website which helps in delivering a better user experience for the visitors.",
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
    name: "Advertisement",
    alwaysActive: false,
    description:
      "Advertisement cookies are used to provide visitors with customised advertisements based on the pages you visited previously and to analyse the effectiveness of the ad campaigns.",
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
const purposesData = [
  {
    id: "purposes",
    title: "Purposes (11)",
    hasToggle: true,
    items: [
      {
        id: "purpose1",
        title: "Store and/or access information on a device",
        description:
          "Cookies, device or similar online identifiers together with other information can be stored or read on your device to recognise it each time it connects to an app or to a website.",
        vendorCount: 777,
        hasConsent: true,
        hasLegitimate: false,
      },
      {
        id: "purpose2",
        title: "Use limited data to select advertising",
        description:
          "Advertising presented to you on this service can be based on limited data, such as the website or app you are using, your non-precise location, your device type.",
        vendorCount: 734,
        hasConsent: true,
        hasLegitimate: true,
      },
      {
        id: "purpose3",
        title: "Create profiles for personalised advertising",
        description:
          "Information about your activity on this service can be stored and combined with other information about you to build advertising profiles.",
        vendorCount: 594,
        hasConsent: true,
        hasLegitimate: false,
      },
      {
        id: "purpose4",
        title: "Measure advertising performance",
        description:
          "Information regarding which advertising is presented to you and how you interact with it can be used to determine how well an advert has worked.",
        vendorCount: 847,
        hasConsent: true,
        hasLegitimate: true,
      },
    ],
  },
  {
    id: "special_purposes",
    title: "Special Purposes (3)",
    hasToggle: false,
    items: [
      {
        id: "specialPurpose1",
        title: "Ensure security, prevent and detect fraud, and fix errors",
        description:
          "Your data can be used to monitor for and prevent unusual and possibly fraudulent activity and ensure systems and processes work properly and securely.",
        vendorCount: 595,
        hasConsent: false,
        hasLegitimate: false,
      },
      {
        id: "specialPurpose2",
        title: "Deliver and present advertising and content",
        description:
          "Certain information is used to ensure the technical compatibility of the content or advertising, and to facilitate the transmission of the content or ad to your device.",
        vendorCount: 594,
        hasConsent: false,
        hasLegitimate: false,
      },
    ],
  },
  {
    id: "features",
    title: "Features (3)",
    hasToggle: false,
    items: [
      {
        id: "feature1",
        title: "Match and combine data from other data sources",
        description:
          "Information about your activity on this service may be matched and combined with other information relating to you and originating from various sources.",
        vendorCount: 436,
        hasConsent: false,
        hasLegitimate: false,
      },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function alignClass(textAlign) {
  if (textAlign === "center") return "text-center";
  if (textAlign === "right") return "text-right";
  return "text-left";
}

function btnJustify(textAlign) {
  if (textAlign === "center") return "justify-center";
  if (textAlign === "right") return "justify-end";
  return "justify-start";
}

// ─── Toggle Switch ───────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled, accentColor }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        backgroundColor: checked ? accentColor : "#D1D5DB",
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width: "38px",
        height: "22px",
        borderRadius: "999px",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        transition: "background-color 0.2s",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "16px",
          height: "16px",
          backgroundColor: "#fff",
          borderRadius: "999px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transform: checked ? "translateX(19px)" : "translateX(3px)",
          transition: "transform 0.2s",
        }}
      />
    </button>
  );
}

// ─── Chevron Icon ─────────────────────────────────────────────────────────────
function Chevron({ open }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      style={{
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.2s",
        flexShrink: 0,
        color: "#9CA3AF",
      }}
    >
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Cookie Accordion Item ────────────────────────────────────────────────────
function CookieAccordion({ category, s }) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(category.alwaysActive);
  const smallBr = `${Math.min(Number(s.borderRadius), 10)}px`;
  const br = `${s.borderRadius}px`;

  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: br,
        backgroundColor: s.bannerBg,
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <div
        style={{ padding: "14px 16px", cursor: "pointer", userSelect: "none" }}
        onClick={() => setOpen(!open)}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div style={{ marginTop: "3px" }}>
            <Chevron open={open} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <span style={{ color: s.headingColor, fontWeight: "600", fontSize: "13px" }}>
                {category.name}
              </span>
              <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {category.alwaysActive ? (
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 10px",
                      borderRadius: "999px",
                      backgroundColor: "#DCFCE7",
                      color: "#166534",
                      fontWeight: "500",
                    }}
                  >
                    Always Active
                  </span>
                ) : (
                  <Toggle checked={enabled} onChange={setEnabled} disabled={false} accentColor={s.SecButtonColor} />
                )}
              </div>
            </div>
            <p
              style={{
                color: s.textColor,
                fontSize: "12px",
                lineHeight: "1.6",
                marginTop: "4px",
                textAlign: s.textAlign,
                fontWeight: s.fontWeight,
              }}
            >
              {/* {category.description} */}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded body */}
      <div
        style={{
          maxHeight: open ? "500px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.3s ease",
        }}
      >
        <div
          style={{
            margin: "0 14px 14px",
            padding: "12px",
            backgroundColor: "#F9FAFB",
            borderRadius: smallBr,
              fontWeight: s.fontWeight,
              fontSize: "12px",
          }}
        >
         {category.description}
        </div>
      </div>
    </div>
  );
}

// ─── Purpose Item ─────────────────────────────────────────────────────────────
function PurposeItem({ item, s }) {
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [legitimate, setLegitimate] = useState(!!item.hasLegitimate);

  return (
    <div style={{ borderBottom: "1px solid #F3F4F6" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", cursor: "pointer" }}
        onClick={() => setOpen(!open)}
      >
        <Chevron open={open} />
        <span style={{ flex: 1, fontSize: "13px", color: s.headingColor, fontWeight: "500" }}>{item.title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }} onClick={(e) => e.stopPropagation()}>
          {item.hasLegitimate && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", color: s.textColor, opacity: 0.55 }}>Legitimate</span>
              <Toggle checked={legitimate} onChange={setLegitimate} accentColor={s.SecButtonColor} />
            </div>
          )}
          {item.hasConsent && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", color: s.textColor, opacity: 0.55 }}>Consent</span>
              <Toggle checked={consent} onChange={setConsent} accentColor={s.SecButtonColor} />
            </div>
          )}
        </div>
      </div>
      <div style={{ maxHeight: open ? "300px" : "0", overflow: "hidden", transition: "max-height 0.3s ease" }}>
        <div style={{ margin: "0 16px 12px 30px", padding: "10px 12px", backgroundColor: "#F9FAFB", borderRadius: "6px" }}>
          <p style={{ color: s.textColor, fontSize: "12px", lineHeight: "1.6", margin: 0 }}>{item.description}</p>
          <p style={{ color: s.textColor, fontSize: "11px", marginTop: "8px", opacity: 0.55, margin: "8px 0 0" }}>
            Vendors seeking consent: <strong>{item.vendorCount}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Purpose Accordion ────────────────────────────────────────────────────────
function PurposeAccordion({ section, s }) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const br = `${s.borderRadius}px`;

  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: br, backgroundColor: s.bannerBg, overflow: "hidden" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", cursor: "pointer" }}
        onClick={() => setOpen(!open)}
      >
        <Chevron open={open} />
        <span style={{ flex: 1, fontSize: "13px", fontWeight: "600", color: s.headingColor }}>{section.title}</span>
        {section.hasToggle && (
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle checked={enabled} onChange={setEnabled} accentColor={s.SecButtonColor} />
          </div>
        )}
      </div>
      <div style={{ maxHeight: open ? "1000px" : "0", overflow: "hidden", transition: "max-height 0.35s ease" }}>
        <div style={{ borderTop: "1px solid #F3F4F6" }}>
          {section.items.map((item) => (
            <PurposeItem key={item.id} item={item} s={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Preference Modal ─────────────────────────────────────────────────────────
function PreferenceModal({ open, onClose, onAccept, onReject, s }) {
  const [activeTab, setActiveTab] = useState("cookie");
  const br = `${s.borderRadius}px`;

  const tabs = [
    { id: "cookie", label: "Cookie Categories" },
    { id: "purpose", label: "Purposes & Features" },
    { id: "vendor", label: "Vendors" },
  ];

  const outlineBtn = {
    borderRadius: `${Math.min(Number(s.borderRadius), 8)}px`,
    fontWeight: s.fontWeight,
    fontSize: "13px",
    padding: "9px 18px",
    border: `2px solid ${s.buttonTextColor}`,
    cursor: "pointer",
    backgroundColor: s.buttonColor,
    color: s.buttonTextColor,
    whiteSpace: "nowrap",
  };
  const solidBtn = {
    ...outlineBtn,
    backgroundColor: s.SecButtonColor,
    color: s.SecButtonTextColor,
    border: `2px solid ${s.SecButtonColor}`,
  };

  const footerJustify = s.textAlign === "center" ? "center" : s.textAlign === "right" ? "flex-start" : "flex-end";

  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 1000001,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px", backgroundColor: "rgba(0,0,0,0.5)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: s.bannerBg,
          borderRadius: br,
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
          border: "1px solid #F4F4F4",
          animation: "popIn 0.25s cubic-bezier(0.34,1.2,0.64,1)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ color: s.headingColor, fontWeight: "700", fontSize: "15px" }}>Customise Consent Preferences</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "50%", display: "flex", color: s.textColor, opacity: 0.5 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Description */}
        <div style={{ padding: "14px 22px 0", flexShrink: 0 }}>
          <p style={{ color: s.textColor, fontSize: "12px", lineHeight: "1.7", textAlign: s.textAlign, fontWeight: s.fontWeight, margin: 0 }}>
            Customise your consent preferences for Cookie Categories and advertising tracking preferences for Purposes & Features and Vendors below. You can give granular consent for each Third Party Vendor.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ padding: "0 22px", borderBottom: "1px solid #F0F0F0", flexShrink: 0, marginTop: "12px" }}>
          <div style={{ display: "flex" }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 16px",
                  fontSize: "12px",
                  fontWeight: activeTab === tab.id ? "600" : s.fontWeight,
                  borderBottom: `2px solid ${activeTab === tab.id ? s.SecButtonColor : "transparent"}`,
                  color: activeTab === tab.id ? s.SecButtonColor : s.textColor,
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${activeTab === tab.id ? s.SecButtonColor : "transparent"}`,
                  cursor: "pointer",
                  opacity: activeTab === tab.id ? 1 : 0.6,
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
          {activeTab === "cookie" && (
            <div>
              <p style={{ color: s.headingColor, fontWeight: "600", fontSize: "14px", textAlign: s.textAlign, marginBottom: "6px" }}>
                Cookie Categories
              </p>
              <p style={{ color: s.textColor, fontSize: "12px", lineHeight: "1.6", textAlign: s.textAlign, fontWeight: s.fontWeight, marginBottom: "16px" }}>
                We use cookies to help you navigate efficiently. Cookies categorised as "Necessary" are stored on your browser as they are essential for basic functionalities of the site.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {cookieCategories.map((cat) => (
                  <CookieAccordion key={cat.id} category={cat} s={s} />
                ))}
              </div>
            </div>
          )}
          {activeTab === "purpose" && (
            <div>
              <p style={{ color: s.headingColor, fontWeight: "600", fontSize: "14px", textAlign: s.textAlign, marginBottom: "16px" }}>
                Purposes & Features
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {purposesData.map((section) => (
                  <PurposeAccordion key={section.id} section={section} s={s} />
                ))}
              </div>
            </div>
          )}
          {activeTab === "vendor" && (
            <div>
              <p style={{ color: s.headingColor, fontWeight: "600", fontSize: "14px", textAlign: s.textAlign, marginBottom: "14px" }}>
                Vendors
              </p>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "9px 12px",
                  border: "1px solid #E5E7EB",
                  borderRadius: `${Math.min(Number(s.borderRadius), 8)}px`,
                  marginBottom: "14px",
                  backgroundColor: "#FAFAFA",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={s.textColor} strokeWidth="2" opacity="0.4">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search vendors by name or ID..."
                  style={{ flex: 1, fontSize: "12px", outline: "none", background: "transparent", border: "none", color: s.textColor, fontWeight: s.fontWeight }}
                />
              </div>
              <p style={{ color: s.textColor, fontSize: "12px", textAlign: "center", opacity: 0.4, fontStyle: "italic" }}>
                Vendor list loads when connected to the GVL endpoint.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid #F0F0F0",
            backgroundColor: s.bannerBg,
            flexShrink: 0,
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            justifyContent: footerJustify,
          }}
        >
          <button style={outlineBtn} onClick={onReject}>Reject All</button>
          <button style={outlineBtn} onClick={onClose}>Save My Preferences</button>
          <button style={solidBtn} onClick={onAccept}>Accept All</button>
        </div>
      </div>
      <style>{`@keyframes popIn{from{transform:scale(0.92);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ─── Banner Content (shared across box & popup) ───────────────────────────────
function BannerContent({ s, onCustomise, onReject, onAccept, layout = "vertical" }) {
  const br = `${s.borderRadius}px`;
  const btnSmallBr = `${Math.min(Number(s.borderRadius), 8)}px`;

  const outlineBtn = {
    borderRadius: btnSmallBr,
    fontWeight: s.fontWeight,
    fontSize: "11px",
    padding: "10px 18px",
    border: `2px solid ${s.buttonTextColor}`,
    cursor: "pointer",
    backgroundColor: s.buttonColor,
    color: s.buttonTextColor,
    whiteSpace: "nowrap",
    transition: "opacity 0.15s",
  };
  const solidBtn = {
    ...outlineBtn,
    backgroundColor: s.SecButtonColor,
    color: s.SecButtonTextColor,
    border: `2px solid ${s.SecButtonColor}`,
  };

  return (
    <div style={{ backgroundColor: s.bannerBg, borderRadius: br, border: "1px solid #F0F0F0", padding: "20px" }}>
      <p
        style={{
          color: s.headingColor,
          fontWeight: "700",
          fontSize: "11px",
          textAlign: s.textAlign,
          marginBottom: "10px",
        }}
      >
        We value your privacy
      </p>
      <p
        style={{
          color: s.textColor,
          fontSize: "11px",
          lineHeight: "1.7",
          textAlign: s.textAlign,
          fontWeight: s.fontWeight,
          marginBottom: "16px",
        }}
      >
        We and{" "}
        <button
          onClick={onCustomise}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            color: s.SecButtonColor, fontWeight: "600", textDecoration: "underline",
          }}
        >
          our 969 partners
        </button>{" "}
        use cookies and other tracking technologies to improve your experience on our website. We may store and/or
        access information on a device and process personal data, such as your IP address and browsing data, for
        personalised advertising and content, advertising and content measurement, audience research and services development.
        Additionally, we may utilize precise geolocation data and identification through device scanning.
      </p>

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          flexDirection:"column",
          gap: "8px",
          justifyContent: s.textAlign === "center" ? "center" : s.textAlign === "right" ? "flex-end" : "flex-start",
        }}
      >
        {/* Customise spans full width only in vertical box/popup layout */}
        <button
          style={{
            ...outlineBtn,
            ...(layout === "vertical" ? {  justifyContent: "center" } : {}),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={onCustomise}
        >
          Customise
        </button>
        <button style={outlineBtn} onClick={onReject}>Reject All</button>
        <button style={solidBtn} onClick={onAccept}>Accept All</button>
      </div>
    </div>
  );
}

// ─── Full-Width Banner Layout ─────────────────────────────────────────────────
function FullBanner({ s, onCustomise, onReject, onAccept }) {
  const outlineBtn = {
    borderRadius: `${Math.min(Number(s.borderRadius), 8)}px`,
    fontWeight: s.fontWeight,
    fontSize: "13px",
    padding: "9px 16px",
    border: `2px solid ${s.buttonTextColor}`,
    cursor: "pointer",
    backgroundColor: s.buttonColor,
    color: s.buttonTextColor,
    whiteSpace: "nowrap",
  };
  const solidBtn = {
    ...outlineBtn,
    backgroundColor: s.SecButtonColor,
    color: s.SecButtonTextColor,
    border: `2px solid ${s.SecButtonColor}`,
  };
  const btnJustifyVal = s.textAlign === "center" ? "center" : s.textAlign === "right" ? "flex-end" : "flex-start";
console.log("btnJustifyVal:", btnJustifyVal);
  return (
    <div
      style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 999999,
        backgroundColor: s.bannerBg,
        borderTop: "1px solid #F0F0F0",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.08)",
        animation: "slideUpBanner 0.3s ease",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div style={{ flex: 1, minWidth: "220px" }}>
          <p style={{ color: s.headingColor, fontWeight: "700", fontSize: "14px", textAlign: s.textAlign, marginBottom: "4px" }}>
            We value your privacy
          </p>
          <p style={{ color: s.textColor, fontSize: "12px", lineHeight: "1.6", textAlign: s.textAlign, fontWeight: s.fontWeight, margin: 0 }}>
            We and{" "}
            <button onClick={onCustomise} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: s.SecButtonColor, fontWeight: "600", textDecoration: "underline" }}>
              our 969 partners
            </button>{" "}
            use cookies and other tracking technologies to personalise advertising and content, and improve your experience.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: btnJustifyVal, flexShrink: 0 }}>
          <button style={outlineBtn} onClick={onCustomise}>Customise</button>
          <button style={outlineBtn} onClick={onReject}>Reject All</button>
          <button style={solidBtn} onClick={onAccept}>Accept All</button>
        </div>
      </div>
      <style>{`@keyframes slideUpBanner{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

// ─── Main Cookie Consent Component ───────────────────────────────────────────
export function CookieConsentBanner({ config = {},device="desktop",alignment="bottom-left",}) {
  const s = { ...defaultStyleConfig, ...config };
  const [visible, setVisible] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  
console.log(modalOpen)
  const handleAccept = () => { setVisible(true);setModalOpen(false)  };
  const handleReject = () => { setVisible(true); setModalOpen(false)  };
  const handleCustomise = () => {
    setVisible(false);
    setModalOpen(true); 

  };

  const br = `${s.borderRadius}px`;
const positionStyles =
  s.bannerType === "box"
    ? alignment === "bottom-left"
      ? {
          left: device === "desktop" ? "20px" : "0px",
          right: "auto",
        }
      : alignment === "bottom-right"
      ? {
          right: device === "desktop" ? "20px" : "0px",
          left: "auto",
        }
      : {}
    : {};
  return (
    <>
   {visible &&   <>
      {/* BOX — bottom-left card */}
      {s.bannerType === "box" && (
        <div
          style={{
            position: "absolute", bottom: "20px", left: `${device === "desktop" ? "20px" : "0px"}`, zIndex: 999999,
            width: "100%", maxWidth: "420px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            borderRadius: br,
            animation: "slideUp 0.4s cubic-bezier(0.25,0.46,0.45,0.94)",
             ...positionStyles,
          }}
        >
          <BannerContent s={s} onCustomise={handleCustomise} onReject={handleReject} onAccept={handleAccept} layout="vertical" />
        </div>
      )}

      {/* BANNER — full width bottom */}
      {s.bannerType === "banner" && (
        <FullBanner s={s} onCustomise={handleCustomise} onReject={handleReject} onAccept={handleAccept} />
      )}

      {/* POPUP — centered overlay */}
      {s.bannerType === "popup" && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 999999,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px", backgroundColor: "rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              width: "100%", maxWidth: "480px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
              borderRadius: br,
              animation: "popIn 0.3s cubic-bezier(0.34,1.2,0.64,1)",
            }}
          >
            <BannerContent s={s} onCustomise={handleCustomise} onReject={handleReject} onAccept={handleAccept} layout="vertical" />
          </div>
        </div>
      )}
</>}
      <PreferenceModal
        open={modalOpen}
        onClose={() =>{ setModalOpen(false); setVisible(true);}}
        onAccept={handleAccept}
        onReject={handleReject}
        s={s}
      />

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes popIn {
          from { transform: scale(0.88); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
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