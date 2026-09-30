// Google's "How Google uses data when you use our partners' sites or apps" link.
//
// Google's CMP Partner banner requirements (Consent Mode without TCF) say the banner
// template must link to this page from INSIDE the banner. The live banner renders it in
// the Marketing row of the preferences panel when translations.config.googlePrivacyLink
// is "1" — see gPL()/gPT() in consent-manager/src/handlers/cdnM.js. The strings below
// must stay identical to the runtime's copy so the preview matches the live banner.

export const GOOGLE_PRIVACY_URL = "https://business.safety.google/privacy/";

const LINK_TEXT: Record<string, string> = {
  en: "How Google uses data when you use our partners' sites or apps",
  de: "Wie Google Daten verwendet, wenn Sie Websites oder Apps unserer Partner nutzen",
  es: "Cómo utiliza Google los datos cuando usas sitios web o aplicaciones de nuestros partners",
  fr: "Comment Google utilise les données lorsque vous utilisez les sites ou applications de nos partenaires",
  it: "In che modo Google utilizza i dati quando utilizzi siti o app dei nostri partner",
  nl: "Hoe Google gegevens gebruikt wanneer je sites of apps van onze partners gebruikt",
  pl: "Jak Google wykorzystuje dane podczas korzystania z witryn lub aplikacji partnerów",
  pt: "Como o Google usa dados quando você usa sites ou apps dos nossos parceiros",
  sv: "Hur Google använder data när du använder våra partners webbplatser eller appar",
};

export function googlePrivacyLinkText(lang?: string): string {
  const code = String(lang || "en").toLowerCase().split("-")[0];
  return LINK_TEXT[code] || LINK_TEXT.en;
}
