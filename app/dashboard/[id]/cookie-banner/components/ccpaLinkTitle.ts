// CCPA opt-out link title. CPRA requires the exact title "Do Not Sell or Share My
// Personal Information" (Civ. Code §1798.135(a)(1)). Every app shipped "Do Not Share…"
// and its translations, and that text is saved in each site's translations, so the
// editor would otherwise load (and re-save) the old wording.
//
// Mirrors CCPA_LINK_TITLE_FIXES in consent-manager/src/handlers/cdnM.js, which applies
// the same swap at serve time. Keep the two lists in step.
// Only known shipped defaults are swapped, so customer-written text is never touched.
// No new phrase contains its old one, so applying this twice is harmless.
const CCPA_LINK_TITLE_FIXES: Record<string, string> = {
  "Do Not Share My Personal Information": "Do Not Sell or Share My Personal Information",
  "Do Not Sell My Personal Information": "Do Not Sell or Share My Personal Information", // pre-CPRA
  "No compartir mi información personal": "No vender ni compartir mi información personal",
  "Ne pas partager mes informations personnelles": "Ne pas vendre ni partager mes informations personnelles",
  "Meine personenbezogenen Daten nicht weitergeben": "Meine personenbezogenen Daten nicht verkaufen oder weitergeben",
  "Non condividere le mie informazioni personali": "Non vendere né condividere le mie informazioni personali",
  "Não partilhar as minhas informações pessoais": "Não vender nem partilhar as minhas informações pessoais",
  "Não compartilhar minhas informações pessoais": "Não vender nem compartilhar minhas informações pessoais",
  "Mijn persoonlijke gegevens niet delen": "Mijn persoonlijke gegevens niet verkopen of delen",
  "Dela inte mina personuppgifter": "Sälj eller dela inte mina personuppgifter",
  "Nie udostępniaj moich danych osobowych": "Nie sprzedawaj ani nie udostępniaj moich danych osobowych",
};

/** The saved opt-out label, with a known old default swapped for the statutory title. */
export function fixCcpaLinkLabel(label: string | undefined | null): string | undefined {
  if (label == null) return undefined;
  return CCPA_LINK_TITLE_FIXES[String(label).trim()] ?? label;
}

/** Text that names the checkbox (the opt-out intro), with old default labels swapped. */
export function fixCcpaLinkLabelInText(text: string | undefined | null): string | undefined {
  if (text == null) return undefined;
  let out = String(text);
  for (const [oldLabel, newLabel] of Object.entries(CCPA_LINK_TITLE_FIXES)) {
    if (out.includes(oldLabel)) out = out.split(oldLabel).join(newLabel);
  }
  return out;
}
