// IAB TCF banner copy (i18n) — the preview's mirror of the runtime banner.
//
// Ported verbatim from the generated banner in iabrefrence/IabcodeNew.js so the
// dashboard preview and the live banner cannot drift. Keys are identical on both
// sides: when a string changes at runtime, change it here under the same key.
//
// Text the GVL supplies (purpose / feature names, descriptions, illustrations) is
// NOT here — IAB translates that, and it is fetched per language from the GVL.
// See iabGvlPurposes.ts. Only copy we author ourselves belongs in this table.
//
// IAB Policy check 32: in every language 'btn.acceptAll' and 'btn.rejectAll' must
// use parallel wording ("Alle akzeptieren" / "Alle ablehnen", never "Alle
// akzeptieren" / "Nur notwendige").
//
// Keys ending in Html carry markup we need to keep (links, <code>, <strong>).
// They are our own literals, never user input.

/** Languages with a full IAB string table. Matches SUPPORTED_LANGUAGES in the runtime TCF manager. */
export const IAB_SUPPORTED_LANGUAGES = ['en', 'nl', 'fr', 'de', 'it', 'pl', 'pt', 'es', 'sv'] as const;

export const IAB_STRINGS: Record<string, Record<string, string>> = {
  en: {
    'banner.regionLabel': 'We value your privacy',
    'banner.title': 'Your privacy matters to us',
    'banner.bodyHtml': 'With your permission, we and <a href="#" id="consentBitVendorsLink" class="consentBit-vendors-link" data-consentBit-tag="vendors-link" aria-label="View the list of third-party vendors and the purposes, special features and stacks they use"><span id="consentBitVendorCountText">third-party vendors</span></a> store and/or access information on your device (such as cookies and device identifiers) and process your personal data (including unique identifiers, IP address, browsing activity and approximate location) for the purposes below. Some processing relies on legitimate interest, which you can object to. Choices apply to this website only and can be updated any time via the cookie icon at the bottom-left.',
    'banner.purposesLineHtml': '<strong>Our partners collect your information for the following purposes:</strong> <span id="consentBitPurposesText" data-consentBit-tag="purposes-list"></span>.<br/> <strong>They also use the following special features:</strong> <span id="consentBitSpecialFeaturesText" data-consentBit-tag="special-features-list"></span>.',

    'btn.customise': 'Customise',
    'btn.rejectAll': 'Reject All',
    'btn.acceptAll': 'Accept All',
    'btn.savePreferences': 'Save My Preferences',
    'btn.close': 'Close',
    'btn.preferencesAria': 'Cookie Preferences',

    'modal.title': 'Customise Consent Preferences',
    'modal.intro': 'Customise your consent preferences for Cookie Categories and advertising tracking preferences for Purposes & Features and Vendors below. You can give granular consent for each Third Party Vendor. Most vendors require explicit consent for personal data processing, while some rely on legitimate interest. However, you have the right to object to their use of legitimate interest.',
    'modal.disclosureSummary': 'How this Consent Management Platform stores your choices',
    'modal.disclosureBodyHtml': 'To remember the choices you make here, this CMP (cmpId {cmpId}) stores a TCF consent string in the <code>euconsent-v2</code> cookie and in your browser\'s <code>localStorage</code> (keys <code>TCF_TC_STRING</code> and <code>cookieConsentPrefs</code>) for up to 365 days. The cookie is refreshed when you update your choices. No personal data is processed by the CMP itself; the consent string is shared with vendors so they can respect your choices.',

    'tab.cookie': 'Cookie Categories',
    'tab.purpose': 'Purposes & Features',
    'tab.vendor': 'Vendors',

    'cookie.intro1': 'We use cookies to help you navigate efficiently and perform certain functions. You will find detailed information about all cookies under each consent category below.',
    'cookie.intro2': 'The cookies that are categorised as "Necessary" are stored on your browser as they are essential for enabling the basic functionalities of the site.',

    'vendor.searchPlaceholder': 'Search vendors by name or ID...',
    'vendor.loading': 'Loading vendors...',
    'vendor.empty': 'No vendors to display.',
    'vendor.error': 'Failed to load vendors. Please try again.',
    'vendor.showDetails': 'Show details ▾',
    'vendor.hideDetails': 'Hide details ▴',
    'vendor.consentCount': 'Number of Vendors seeking consent: {count}',
    'vendor.countLineFull': 'Number of Vendors seeking consent: {consent} • Relying on legitimate interest: {li} • Total: {total}',
    'vendor.unknown': 'Unknown vendor',
    'vendor.idPrefix': 'ID:',
    'vendor.objectAria': 'Object to {name} processing on legitimate interest',
    'vendor.consentAria': 'Enable {name} consent',
    'vendor.objectNoteHtml': '<strong>Right to object:</strong> Toggle "Legitimate Interest" off above to object to this vendor processing your personal data on the legal basis of legitimate interest.',

    'label.consent': 'Consent',
    'link.privacyPolicy': 'Privacy policy',
    'link.legIntClaim': 'Legitimate interest claim',

    'section.purposes': 'Purposes',
    'section.specialPurposes': 'Special Purposes',
    'section.features': 'Features',
    'section.specialFeatures': 'Special Features',
    'section.legitimateInterest': 'Legitimate Interest',

    'vsec.purposesConsent': 'Purposes (consent required)',
    'vsec.purposesLegInt': 'Purposes (legitimate interest)',
    'vsec.flexiblePurposes': 'Flexible purposes',
    'vsec.specialPurposes': 'Special purposes',
    'vsec.features': 'Features',
    'vsec.specialFeatures': 'Special features',
    'vsec.dataCategories': 'Categories of data collected',
    'vsec.storageRetention': 'Storage & retention',
    'vsec.retentionByPurpose': 'Retention by purpose',

    'meta.usesCookies': 'Uses cookies',
    'meta.cookieMaxDuration': 'Cookie max duration',
    'meta.cookieRefreshed': 'Cookie refreshed',
    'meta.usesNonCookieStorage': 'Uses non-cookie storage',
    'meta.standardRetention': 'Standard retention',

    'common.yes': 'Yes',
    'common.no': 'No',
    'common.notDeclared': 'Not declared',
    'common.noneDeclared': 'None declared',
    'common.day': 'day',
    'common.days': 'days',
    'common.year': 'year',
    'common.years': 'years',
    'common.hour': 'hour',
    'common.hours': 'hours',
    'common.second': 'second',
    'common.seconds': 'seconds',
    'common.sessionOnly': 'Session-only',
    'common.purposeN': 'Purpose {id}',

    'atp.note': 'These Google-certified partners are not on the IAB vendor list. Choose whether they may use your data.',

    'cat.alwaysActive': 'Always Active',
    'cat.alwaysActiveAria': '{name} (Always Active)',
    'cat.enableAria': 'Enable {name}',
    'cat.necessary': 'Necessary',
    'cat.necessaryDesc': 'Necessary cookies are required to enable the basic features of this site, such as providing secure log-in or adjusting your consent preferences. These cookies do not store any personally identifiable data.',
    'cat.functional': 'Functional',
    'cat.functionalDesc': 'Functional cookies help perform certain functionalities like sharing the content of the website on social media platforms, collecting feedback, and other third-party features.',
    'cat.analytics': 'Analytics',
    'cat.analyticsDesc': 'Analytical cookies are used to understand how visitors interact with the website. These cookies help provide information on metrics such as the number of visitors, bounce rate, traffic source, etc.',
    'cat.performance': 'Performance',
    'cat.performanceDesc': 'Performance cookies are used to understand and analyse the key performance indexes of the website which helps in delivering a better user experience for the visitors.',
    'cat.advertisement': 'Advertisement',
    'cat.advertisementDesc': 'Advertisement cookies are used to provide visitors with customised advertisements based on the pages you visited previously and to analyse the effectiveness of the ad campaigns.'
  },

  de: {
    'banner.regionLabel': 'Ihre Privatsphäre ist uns wichtig',
    'banner.title': 'Ihre Privatsphäre ist uns wichtig',
    'banner.bodyHtml': 'Mit Ihrer Einwilligung speichern wir und <a href="#" id="consentBitVendorsLink" class="consentBit-vendors-link" data-consentBit-tag="vendors-link" aria-label="Liste der Drittanbieter sowie der von ihnen genutzten Zwecke, besonderen Merkmale und Stapel anzeigen"><span id="consentBitVendorCountText">Drittanbieter</span></a> Informationen auf Ihrem Gerät (etwa Cookies und Gerätekennungen) beziehungsweise greifen darauf zu und verarbeiten Ihre personenbezogenen Daten (einschließlich eindeutiger Kennungen, IP-Adresse, Surfverhalten und ungefährem Standort) für die unten genannten Zwecke. Ein Teil der Verarbeitung stützt sich auf berechtigtes Interesse, dem Sie widersprechen können. Ihre Auswahl gilt nur für diese Website und kann jederzeit über das Cookie-Symbol unten links geändert werden.',
    'banner.purposesLineHtml': '<strong>Unsere Partner erheben Ihre Informationen für die folgenden Zwecke:</strong> <span id="consentBitPurposesText" data-consentBit-tag="purposes-list"></span>.<br/> <strong>Sie nutzen außerdem die folgenden besonderen Merkmale:</strong> <span id="consentBitSpecialFeaturesText" data-consentBit-tag="special-features-list"></span>.',

    'btn.customise': 'Anpassen',
    'btn.rejectAll': 'Alle ablehnen',
    'btn.acceptAll': 'Alle akzeptieren',
    'btn.savePreferences': 'Meine Einstellungen speichern',
    'btn.close': 'Schließen',
    'btn.preferencesAria': 'Cookie-Einstellungen',

    'modal.title': 'Einwilligungseinstellungen anpassen',
    'modal.intro': 'Passen Sie unten Ihre Einwilligungseinstellungen für Cookie-Kategorien sowie Ihre Werbe-Tracking-Einstellungen für Zwecke & Merkmale und Anbieter an. Sie können jedem Drittanbieter einzeln zustimmen. Die meisten Anbieter benötigen eine ausdrückliche Einwilligung zur Verarbeitung personenbezogener Daten, andere stützen sich auf berechtigtes Interesse. Sie haben jedoch das Recht, deren Nutzung des berechtigten Interesses zu widersprechen.',
    'modal.disclosureSummary': 'Wie diese Consent-Management-Plattform Ihre Auswahl speichert',
    'modal.disclosureBodyHtml': 'Um Ihre hier getroffene Auswahl zu speichern, legt diese CMP (cmpId {cmpId}) einen TCF-Einwilligungsstring im Cookie <code>euconsent-v2</code> sowie im <code>localStorage</code> Ihres Browsers ab (Schlüssel <code>TCF_TC_STRING</code> und <code>cookieConsentPrefs</code>), und zwar für bis zu 365 Tage. Das Cookie wird erneuert, wenn Sie Ihre Auswahl ändern. Die CMP selbst verarbeitet keine personenbezogenen Daten; der Einwilligungsstring wird an Anbieter weitergegeben, damit diese Ihre Auswahl beachten können.',

    'tab.cookie': 'Cookie-Kategorien',
    'tab.purpose': 'Zwecke & Merkmale',
    'tab.vendor': 'Anbieter',

    'cookie.intro1': 'Wir verwenden Cookies, damit Sie effizient navigieren und bestimmte Funktionen nutzen können. Ausführliche Informationen zu allen Cookies finden Sie unten unter der jeweiligen Einwilligungskategorie.',
    'cookie.intro2': 'Die als "Notwendig" eingestuften Cookies werden in Ihrem Browser gespeichert, da sie für die Grundfunktionen der Website unerlässlich sind.',

    'vendor.searchPlaceholder': 'Anbieter nach Name oder ID suchen ...',
    'vendor.loading': 'Anbieter werden geladen ...',
    'vendor.empty': 'Keine Anbieter vorhanden.',
    'vendor.error': 'Anbieter konnten nicht geladen werden. Bitte versuchen Sie es erneut.',
    'vendor.showDetails': 'Details anzeigen ▾',
    'vendor.hideDetails': 'Details ausblenden ▴',
    'vendor.consentCount': 'Anzahl der Anbieter, die eine Einwilligung einholen: {count}',
    'vendor.countLineFull': 'Anzahl der Anbieter, die eine Einwilligung einholen: {consent} • Auf berechtigtes Interesse gestützt: {li} • Gesamt: {total}',
    'vendor.unknown': 'Unbekannter Anbieter',
    'vendor.idPrefix': 'ID:',
    'vendor.objectAria': 'Der Verarbeitung durch {name} auf Grundlage des berechtigten Interesses widersprechen',
    'vendor.consentAria': 'Einwilligung für {name} aktivieren',
    'vendor.objectNoteHtml': '<strong>Widerspruchsrecht:</strong> Schalten Sie oben "Berechtigtes Interesse" aus, um der Verarbeitung Ihrer personenbezogenen Daten durch diesen Anbieter auf Grundlage des berechtigten Interesses zu widersprechen.',

    'label.consent': 'Einwilligung',
    'link.privacyPolicy': 'Datenschutzerklärung',
    'link.legIntClaim': 'Erklärung zum berechtigten Interesse',

    'section.purposes': 'Zwecke',
    'section.specialPurposes': 'Besondere Zwecke',
    'section.features': 'Merkmale',
    'section.specialFeatures': 'Besondere Merkmale',
    'section.legitimateInterest': 'Berechtigtes Interesse',

    'vsec.purposesConsent': 'Zwecke (Einwilligung erforderlich)',
    'vsec.purposesLegInt': 'Zwecke (berechtigtes Interesse)',
    'vsec.flexiblePurposes': 'Flexible Zwecke',
    'vsec.specialPurposes': 'Besondere Zwecke',
    'vsec.features': 'Merkmale',
    'vsec.specialFeatures': 'Besondere Merkmale',
    'vsec.dataCategories': 'Kategorien der erhobenen Daten',
    'vsec.storageRetention': 'Speicherung & Aufbewahrung',
    'vsec.retentionByPurpose': 'Aufbewahrung nach Zweck',

    'meta.usesCookies': 'Verwendet Cookies',
    'meta.cookieMaxDuration': 'Maximale Cookie-Laufzeit',
    'meta.cookieRefreshed': 'Cookie wird erneuert',
    'meta.usesNonCookieStorage': 'Verwendet Speicher ohne Cookies',
    'meta.standardRetention': 'Standard-Aufbewahrung',

    'common.yes': 'Ja',
    'common.no': 'Nein',
    'common.notDeclared': 'Nicht angegeben',
    'common.noneDeclared': 'Keine angegeben',
    'common.day': 'Tag',
    'common.days': 'Tage',
    'common.year': 'Jahr',
    'common.years': 'Jahre',
    'common.hour': 'Stunde',
    'common.hours': 'Stunden',
    'common.second': 'Sekunde',
    'common.seconds': 'Sekunden',
    'common.sessionOnly': 'Nur für die Sitzung',
    'common.purposeN': 'Zweck {id}',

    'atp.note': 'Diese von Google zertifizierten Partner sind nicht in der IAB-Anbieterliste enthalten. Entscheiden Sie, ob sie Ihre Daten verwenden dürfen.',

    'cat.alwaysActive': 'Immer aktiv',
    'cat.alwaysActiveAria': '{name} (immer aktiv)',
    'cat.enableAria': '{name} aktivieren',
    'cat.necessary': 'Notwendig',
    'cat.necessaryDesc': 'Notwendige Cookies sind erforderlich, um die Grundfunktionen dieser Website zu ermöglichen, etwa die sichere Anmeldung oder das Anpassen Ihrer Einwilligungseinstellungen. Diese Cookies speichern keine personenbezogenen Daten.',
    'cat.functional': 'Funktional',
    'cat.functionalDesc': 'Funktionale Cookies ermöglichen bestimmte Funktionen, etwa das Teilen von Website-Inhalten auf Social-Media-Plattformen, das Sammeln von Feedback und andere Funktionen von Drittanbietern.',
    'cat.analytics': 'Analyse',
    'cat.analyticsDesc': 'Analyse-Cookies werden verwendet, um zu verstehen, wie Besucher mit der Website interagieren. Diese Cookies liefern Informationen zu Kennzahlen wie Besucherzahl, Absprungrate und Traffic-Quelle.',
    'cat.performance': 'Leistung',
    'cat.performanceDesc': 'Leistungs-Cookies werden verwendet, um die wichtigsten Leistungskennzahlen der Website zu verstehen und zu analysieren, was zu einer besseren Nutzererfahrung für die Besucher beiträgt.',
    'cat.advertisement': 'Werbung',
    'cat.advertisementDesc': 'Werbe-Cookies werden verwendet, um Besuchern personalisierte Werbung auf Grundlage der zuvor besuchten Seiten bereitzustellen und die Wirksamkeit von Werbekampagnen zu analysieren.'
  },

  nl: {
    'banner.regionLabel': 'Wij hechten waarde aan uw privacy',
    'banner.title': 'Uw privacy is belangrijk voor ons',
    'banner.bodyHtml': 'Met uw toestemming slaan wij en <a href="#" id="consentBitVendorsLink" class="consentBit-vendors-link" data-consentBit-tag="vendors-link" aria-label="Bekijk de lijst met externe leveranciers en de doeleinden, speciale functies en stapels die zij gebruiken"><span id="consentBitVendorCountText">externe leveranciers</span></a> informatie op uw apparaat op (zoals cookies en apparaat-identificatoren) of raadplegen wij deze, en verwerken wij uw persoonsgegevens (waaronder unieke identificatoren, IP-adres, surfgedrag en locatie bij benadering) voor de onderstaande doeleinden. Een deel van de verwerking berust op gerechtvaardigd belang, waartegen u bezwaar kunt maken. Uw keuzes gelden alleen voor deze website en kunnen op elk moment worden gewijzigd via het cookiepictogram linksonder.',
    'banner.purposesLineHtml': '<strong>Onze partners verzamelen uw gegevens voor de volgende doeleinden:</strong> <span id="consentBitPurposesText" data-consentBit-tag="purposes-list"></span>.<br/> <strong>Zij gebruiken ook de volgende speciale functies:</strong> <span id="consentBitSpecialFeaturesText" data-consentBit-tag="special-features-list"></span>.',

    'btn.customise': 'Aanpassen',
    'btn.rejectAll': 'Alles weigeren',
    'btn.acceptAll': 'Alles accepteren',
    'btn.savePreferences': 'Mijn voorkeuren opslaan',
    'btn.close': 'Sluiten',
    'btn.preferencesAria': 'Cookievoorkeuren',

    'modal.title': 'Toestemmingsvoorkeuren aanpassen',
    'modal.intro': 'Pas hieronder uw toestemmingsvoorkeuren aan voor cookiecategorieën en uw voorkeuren voor advertentietracking voor Doeleinden & functies en Leveranciers. U kunt per externe leverancier afzonderlijk toestemming geven. De meeste leveranciers hebben uitdrukkelijke toestemming nodig voor de verwerking van persoonsgegevens, andere berusten op gerechtvaardigd belang. U hebt echter het recht bezwaar te maken tegen hun gebruik van gerechtvaardigd belang.',
    'modal.disclosureSummary': 'Hoe dit Consent Management Platform uw keuzes opslaat',
    'modal.disclosureBodyHtml': 'Om de keuzes die u hier maakt te onthouden, slaat deze CMP (cmpId {cmpId}) een TCF-toestemmingsstring op in de cookie <code>euconsent-v2</code> en in de <code>localStorage</code> van uw browser (sleutels <code>TCF_TC_STRING</code> en <code>cookieConsentPrefs</code>), gedurende maximaal 365 dagen. De cookie wordt vernieuwd wanneer u uw keuzes bijwerkt. De CMP zelf verwerkt geen persoonsgegevens; de toestemmingsstring wordt gedeeld met leveranciers zodat zij uw keuzes kunnen respecteren.',

    'tab.cookie': 'Cookiecategorieën',
    'tab.purpose': 'Doeleinden & functies',
    'tab.vendor': 'Leveranciers',

    'cookie.intro1': 'Wij gebruiken cookies zodat u efficiënt kunt navigeren en bepaalde functies kunt gebruiken. Gedetailleerde informatie over alle cookies vindt u hieronder onder elke toestemmingscategorie.',
    'cookie.intro2': 'De cookies die als "Noodzakelijk" zijn ingedeeld, worden in uw browser opgeslagen omdat ze essentieel zijn voor de basisfuncties van de site.',

    'vendor.searchPlaceholder': 'Zoek leveranciers op naam of ID ...',
    'vendor.loading': 'Leveranciers worden geladen ...',
    'vendor.empty': 'Geen leveranciers om weer te geven.',
    'vendor.error': 'Leveranciers konden niet worden geladen. Probeer het opnieuw.',
    'vendor.showDetails': 'Details tonen ▾',
    'vendor.hideDetails': 'Details verbergen ▴',
    'vendor.consentCount': 'Aantal leveranciers dat toestemming vraagt: {count}',
    'vendor.countLineFull': 'Aantal leveranciers dat toestemming vraagt: {consent} • Berust op gerechtvaardigd belang: {li} • Totaal: {total}',
    'vendor.unknown': 'Onbekende leverancier',
    'vendor.idPrefix': 'ID:',
    'vendor.objectAria': 'Bezwaar maken tegen verwerking door {name} op basis van gerechtvaardigd belang',
    'vendor.consentAria': 'Toestemming voor {name} inschakelen',
    'vendor.objectNoteHtml': '<strong>Recht van bezwaar:</strong> Schakel hierboven "Gerechtvaardigd belang" uit om bezwaar te maken tegen de verwerking van uw persoonsgegevens door deze leverancier op basis van gerechtvaardigd belang.',

    'label.consent': 'Toestemming',
    'link.privacyPolicy': 'Privacybeleid',
    'link.legIntClaim': 'Verklaring gerechtvaardigd belang',

    'section.purposes': 'Doeleinden',
    'section.specialPurposes': 'Speciale doeleinden',
    'section.features': 'Functies',
    'section.specialFeatures': 'Speciale functies',
    'section.legitimateInterest': 'Gerechtvaardigd belang',

    'vsec.purposesConsent': 'Doeleinden (toestemming vereist)',
    'vsec.purposesLegInt': 'Doeleinden (gerechtvaardigd belang)',
    'vsec.flexiblePurposes': 'Flexibele doeleinden',
    'vsec.specialPurposes': 'Speciale doeleinden',
    'vsec.features': 'Functies',
    'vsec.specialFeatures': 'Speciale functies',
    'vsec.dataCategories': 'Categorieën verzamelde gegevens',
    'vsec.storageRetention': 'Opslag & bewaring',
    'vsec.retentionByPurpose': 'Bewaring per doeleinde',

    'meta.usesCookies': 'Gebruikt cookies',
    'meta.cookieMaxDuration': 'Maximale cookieduur',
    'meta.cookieRefreshed': 'Cookie wordt vernieuwd',
    'meta.usesNonCookieStorage': 'Gebruikt opslag zonder cookies',
    'meta.standardRetention': 'Standaardbewaring',

    'common.yes': 'Ja',
    'common.no': 'Nee',
    'common.notDeclared': 'Niet opgegeven',
    'common.noneDeclared': 'Geen opgegeven',
    'common.day': 'dag',
    'common.days': 'dagen',
    'common.year': 'jaar',
    'common.years': 'jaar',
    'common.hour': 'uur',
    'common.hours': 'uur',
    'common.second': 'seconde',
    'common.seconds': 'seconden',
    'common.sessionOnly': 'Alleen sessie',
    'common.purposeN': 'Doeleinde {id}',

    'atp.note': 'Deze door Google gecertificeerde partners staan niet op de IAB-leverancierslijst. Kies of zij uw gegevens mogen gebruiken.',

    'cat.alwaysActive': 'Altijd actief',
    'cat.alwaysActiveAria': '{name} (altijd actief)',
    'cat.enableAria': '{name} inschakelen',
    'cat.necessary': 'Noodzakelijk',
    'cat.necessaryDesc': 'Noodzakelijke cookies zijn vereist om de basisfuncties van deze site mogelijk te maken, zoals veilig inloggen of het aanpassen van uw toestemmingsvoorkeuren. Deze cookies slaan geen persoonlijk identificeerbare gegevens op.',
    'cat.functional': 'Functioneel',
    'cat.functionalDesc': 'Functionele cookies helpen bepaalde functionaliteiten uit te voeren, zoals het delen van website-inhoud op sociale media, het verzamelen van feedback en andere functies van derden.',
    'cat.analytics': 'Analytisch',
    'cat.analyticsDesc': 'Analytische cookies worden gebruikt om te begrijpen hoe bezoekers met de website omgaan. Deze cookies geven informatie over statistieken zoals het aantal bezoekers, het bouncepercentage en de verkeersbron.',
    'cat.performance': 'Prestaties',
    'cat.performanceDesc': 'Prestatiecookies worden gebruikt om de belangrijkste prestatie-indicatoren van de website te begrijpen en te analyseren, wat bijdraagt aan een betere gebruikerservaring voor de bezoekers.',
    'cat.advertisement': 'Advertenties',
    'cat.advertisementDesc': 'Advertentiecookies worden gebruikt om bezoekers gepersonaliseerde advertenties te tonen op basis van eerder bezochte pagina’s en om de effectiviteit van advertentiecampagnes te analyseren.'
  },

  fr: {
    'banner.regionLabel': 'Nous respectons votre vie privée',
    'banner.title': 'Votre vie privée nous tient à cœur',
    'banner.bodyHtml': 'Avec votre autorisation, nous et <a href="#" id="consentBitVendorsLink" class="consentBit-vendors-link" data-consentBit-tag="vendors-link" aria-label="Voir la liste des fournisseurs tiers ainsi que les finalités, fonctionnalités spéciales et piles qu’ils utilisent"><span id="consentBitVendorCountText">des fournisseurs tiers</span></a> stockons des informations sur votre appareil (telles que des cookies et des identifiants d’appareil) ou y accédons, et traitons vos données personnelles (y compris des identifiants uniques, l’adresse IP, l’activité de navigation et la localisation approximative) aux finalités indiquées ci-dessous. Certains traitements reposent sur l’intérêt légitime, auquel vous pouvez vous opposer. Vos choix s’appliquent uniquement à ce site web et peuvent être modifiés à tout moment via l’icône de cookie en bas à gauche.',
    'banner.purposesLineHtml': '<strong>Nos partenaires collectent vos informations aux finalités suivantes :</strong> <span id="consentBitPurposesText" data-consentBit-tag="purposes-list"></span>.<br/> <strong>Ils utilisent également les fonctionnalités spéciales suivantes :</strong> <span id="consentBitSpecialFeaturesText" data-consentBit-tag="special-features-list"></span>.',

    'btn.customise': 'Personnaliser',
    'btn.rejectAll': 'Tout refuser',
    'btn.acceptAll': 'Tout accepter',
    'btn.savePreferences': 'Enregistrer mes préférences',
    'btn.close': 'Fermer',
    'btn.preferencesAria': 'Préférences en matière de cookies',

    'modal.title': 'Personnaliser les préférences de consentement',
    'modal.intro': 'Personnalisez ci-dessous vos préférences de consentement pour les catégories de cookies ainsi que vos préférences de suivi publicitaire pour les Finalités & fonctionnalités et les Fournisseurs. Vous pouvez donner un consentement granulaire à chaque fournisseur tiers. La plupart des fournisseurs exigent un consentement explicite pour le traitement des données personnelles, tandis que d’autres se fondent sur l’intérêt légitime. Vous avez toutefois le droit de vous opposer à leur utilisation de l’intérêt légitime.',
    'modal.disclosureSummary': 'Comment cette plateforme de gestion du consentement enregistre vos choix',
    'modal.disclosureBodyHtml': 'Pour mémoriser les choix que vous faites ici, cette CMP (cmpId {cmpId}) enregistre une chaîne de consentement TCF dans le cookie <code>euconsent-v2</code> et dans le <code>localStorage</code> de votre navigateur (clés <code>TCF_TC_STRING</code> et <code>cookieConsentPrefs</code>), pendant 365 jours au maximum. Le cookie est actualisé lorsque vous modifiez vos choix. La CMP elle-même ne traite aucune donnée personnelle ; la chaîne de consentement est partagée avec les fournisseurs afin qu’ils puissent respecter vos choix.',

    'tab.cookie': 'Catégories de cookies',
    'tab.purpose': 'Finalités & fonctionnalités',
    'tab.vendor': 'Fournisseurs',

    'cookie.intro1': 'Nous utilisons des cookies pour vous aider à naviguer efficacement et à exécuter certaines fonctions. Vous trouverez des informations détaillées sur tous les cookies sous chaque catégorie de consentement ci-dessous.',
    'cookie.intro2': 'Les cookies classés comme « Nécessaires » sont stockés dans votre navigateur car ils sont essentiels au fonctionnement de base du site.',

    'vendor.searchPlaceholder': 'Rechercher un fournisseur par nom ou ID ...',
    'vendor.loading': 'Chargement des fournisseurs ...',
    'vendor.empty': 'Aucun fournisseur à afficher.',
    'vendor.error': 'Échec du chargement des fournisseurs. Veuillez réessayer.',
    'vendor.showDetails': 'Afficher les détails ▾',
    'vendor.hideDetails': 'Masquer les détails ▴',
    'vendor.consentCount': 'Nombre de fournisseurs demandant un consentement : {count}',
    'vendor.countLineFull': 'Nombre de fournisseurs demandant un consentement : {consent} • Se fondant sur l’intérêt légitime : {li} • Total : {total}',
    'vendor.unknown': 'Fournisseur inconnu',
    'vendor.idPrefix': 'ID :',
    'vendor.objectAria': 'S’opposer au traitement par {name} fondé sur l’intérêt légitime',
    'vendor.consentAria': 'Activer le consentement pour {name}',
    'vendor.objectNoteHtml': '<strong>Droit d’opposition :</strong> Désactivez « Intérêt légitime » ci-dessus pour vous opposer au traitement de vos données personnelles par ce fournisseur sur la base de l’intérêt légitime.',

    'label.consent': 'Consentement',
    'link.privacyPolicy': 'Politique de confidentialité',
    'link.legIntClaim': 'Déclaration d’intérêt légitime',

    'section.purposes': 'Finalités',
    'section.specialPurposes': 'Finalités spéciales',
    'section.features': 'Fonctionnalités',
    'section.specialFeatures': 'Fonctionnalités spéciales',
    'section.legitimateInterest': 'Intérêt légitime',

    'vsec.purposesConsent': 'Finalités (consentement requis)',
    'vsec.purposesLegInt': 'Finalités (intérêt légitime)',
    'vsec.flexiblePurposes': 'Finalités flexibles',
    'vsec.specialPurposes': 'Finalités spéciales',
    'vsec.features': 'Fonctionnalités',
    'vsec.specialFeatures': 'Fonctionnalités spéciales',
    'vsec.dataCategories': 'Catégories de données collectées',
    'vsec.storageRetention': 'Stockage & conservation',
    'vsec.retentionByPurpose': 'Conservation par finalité',

    'meta.usesCookies': 'Utilise des cookies',
    'meta.cookieMaxDuration': 'Durée maximale du cookie',
    'meta.cookieRefreshed': 'Cookie actualisé',
    'meta.usesNonCookieStorage': 'Utilise un stockage sans cookie',
    'meta.standardRetention': 'Conservation standard',

    'common.yes': 'Oui',
    'common.no': 'Non',
    'common.notDeclared': 'Non déclaré',
    'common.noneDeclared': 'Aucune déclarée',
    'common.day': 'jour',
    'common.days': 'jours',
    'common.year': 'an',
    'common.years': 'ans',
    'common.hour': 'heure',
    'common.hours': 'heures',
    'common.second': 'seconde',
    'common.seconds': 'secondes',
    'common.sessionOnly': 'Session uniquement',
    'common.purposeN': 'Finalité {id}',

    'atp.note': 'Ces partenaires certifiés par Google ne figurent pas sur la liste des fournisseurs de l’IAB. Choisissez s’ils peuvent utiliser vos données.',

    'cat.alwaysActive': 'Toujours actif',
    'cat.alwaysActiveAria': '{name} (toujours actif)',
    'cat.enableAria': 'Activer {name}',
    'cat.necessary': 'Nécessaires',
    'cat.necessaryDesc': 'Les cookies nécessaires sont requis pour activer les fonctionnalités de base de ce site, comme la connexion sécurisée ou l’ajustement de vos préférences de consentement. Ces cookies ne stockent aucune donnée personnelle identifiable.',
    'cat.functional': 'Fonctionnels',
    'cat.functionalDesc': 'Les cookies fonctionnels permettent d’exécuter certaines fonctionnalités, comme le partage du contenu du site sur les réseaux sociaux, la collecte de commentaires et d’autres fonctionnalités de tiers.',
    'cat.analytics': 'Analytiques',
    'cat.analyticsDesc': 'Les cookies analytiques servent à comprendre comment les visiteurs interagissent avec le site web. Ces cookies fournissent des informations sur des indicateurs tels que le nombre de visiteurs, le taux de rebond et la source de trafic.',
    'cat.performance': 'Performance',
    'cat.performanceDesc': 'Les cookies de performance servent à comprendre et à analyser les principaux indicateurs de performance du site web, ce qui contribue à offrir une meilleure expérience aux visiteurs.',
    'cat.advertisement': 'Publicité',
    'cat.advertisementDesc': 'Les cookies publicitaires servent à proposer aux visiteurs des publicités personnalisées en fonction des pages consultées précédemment et à analyser l’efficacité des campagnes publicitaires.'
  },

  it: {
    'banner.regionLabel': 'Teniamo alla tua privacy',
    'banner.title': 'La tua privacy è importante per noi',
    'banner.bodyHtml': 'Con il tuo consenso, noi e <a href="#" id="consentBitVendorsLink" class="consentBit-vendors-link" data-consentBit-tag="vendors-link" aria-label="Visualizza l’elenco dei fornitori terzi e le finalità, le funzionalità speciali e gli stack che utilizzano"><span id="consentBitVendorCountText">fornitori terzi</span></a> archiviamo informazioni sul tuo dispositivo (come cookie e identificatori del dispositivo) o vi accediamo, e trattiamo i tuoi dati personali (inclusi identificatori univoci, indirizzo IP, attività di navigazione e posizione approssimativa) per le finalità indicate di seguito. Alcuni trattamenti si basano sul legittimo interesse, al quale puoi opporti. Le tue scelte valgono solo per questo sito web e possono essere modificate in qualsiasi momento tramite l’icona dei cookie in basso a sinistra.',
    'banner.purposesLineHtml': '<strong>I nostri partner raccolgono le tue informazioni per le seguenti finalità:</strong> <span id="consentBitPurposesText" data-consentBit-tag="purposes-list"></span>.<br/> <strong>Utilizzano inoltre le seguenti funzionalità speciali:</strong> <span id="consentBitSpecialFeaturesText" data-consentBit-tag="special-features-list"></span>.',

    'btn.customise': 'Personalizza',
    'btn.rejectAll': 'Rifiuta tutto',
    'btn.acceptAll': 'Accetta tutto',
    'btn.savePreferences': 'Salva le mie preferenze',
    'btn.close': 'Chiudi',
    'btn.preferencesAria': 'Preferenze sui cookie',

    'modal.title': 'Personalizza le preferenze di consenso',
    'modal.intro': 'Personalizza di seguito le tue preferenze di consenso per le categorie di cookie e le preferenze di tracciamento pubblicitario per Finalità & funzionalità e Fornitori. Puoi fornire un consenso granulare per ciascun fornitore terzo. La maggior parte dei fornitori richiede un consenso esplicito per il trattamento dei dati personali, mentre altri si basano sul legittimo interesse. Hai comunque il diritto di opporti al loro utilizzo del legittimo interesse.',
    'modal.disclosureSummary': 'Come questa piattaforma di gestione del consenso memorizza le tue scelte',
    'modal.disclosureBodyHtml': 'Per ricordare le scelte che effettui qui, questa CMP (cmpId {cmpId}) memorizza una stringa di consenso TCF nel cookie <code>euconsent-v2</code> e nel <code>localStorage</code> del tuo browser (chiavi <code>TCF_TC_STRING</code> e <code>cookieConsentPrefs</code>) per un massimo di 365 giorni. Il cookie viene aggiornato quando modifichi le tue scelte. La CMP stessa non tratta dati personali; la stringa di consenso viene condivisa con i fornitori affinché possano rispettare le tue scelte.',

    'tab.cookie': 'Categorie di cookie',
    'tab.purpose': 'Finalità & funzionalità',
    'tab.vendor': 'Fornitori',

    'cookie.intro1': 'Utilizziamo i cookie per aiutarti a navigare in modo efficiente e a utilizzare determinate funzioni. Trovi informazioni dettagliate su tutti i cookie sotto ciascuna categoria di consenso qui sotto.',
    'cookie.intro2': 'I cookie classificati come "Necessari" vengono memorizzati nel tuo browser in quanto essenziali per abilitare le funzionalità di base del sito.',

    'vendor.searchPlaceholder': 'Cerca fornitori per nome o ID ...',
    'vendor.loading': 'Caricamento dei fornitori ...',
    'vendor.empty': 'Nessun fornitore da visualizzare.',
    'vendor.error': 'Impossibile caricare i fornitori. Riprova.',
    'vendor.showDetails': 'Mostra dettagli ▾',
    'vendor.hideDetails': 'Nascondi dettagli ▴',
    'vendor.consentCount': 'Numero di fornitori che richiedono il consenso: {count}',
    'vendor.countLineFull': 'Numero di fornitori che richiedono il consenso: {consent} • Basati sul legittimo interesse: {li} • Totale: {total}',
    'vendor.unknown': 'Fornitore sconosciuto',
    'vendor.idPrefix': 'ID:',
    'vendor.objectAria': 'Opporsi al trattamento da parte di {name} basato sul legittimo interesse',
    'vendor.consentAria': 'Attiva il consenso per {name}',
    'vendor.objectNoteHtml': '<strong>Diritto di opposizione:</strong> Disattiva "Legittimo interesse" qui sopra per opporti al trattamento dei tuoi dati personali da parte di questo fornitore sulla base del legittimo interesse.',

    'label.consent': 'Consenso',
    'link.privacyPolicy': 'Informativa sulla privacy',
    'link.legIntClaim': 'Dichiarazione di legittimo interesse',

    'section.purposes': 'Finalità',
    'section.specialPurposes': 'Finalità speciali',
    'section.features': 'Funzionalità',
    'section.specialFeatures': 'Funzionalità speciali',
    'section.legitimateInterest': 'Legittimo interesse',

    'vsec.purposesConsent': 'Finalità (consenso richiesto)',
    'vsec.purposesLegInt': 'Finalità (legittimo interesse)',
    'vsec.flexiblePurposes': 'Finalità flessibili',
    'vsec.specialPurposes': 'Finalità speciali',
    'vsec.features': 'Funzionalità',
    'vsec.specialFeatures': 'Funzionalità speciali',
    'vsec.dataCategories': 'Categorie di dati raccolti',
    'vsec.storageRetention': 'Archiviazione & conservazione',
    'vsec.retentionByPurpose': 'Conservazione per finalità',

    'meta.usesCookies': 'Utilizza cookie',
    'meta.cookieMaxDuration': 'Durata massima del cookie',
    'meta.cookieRefreshed': 'Cookie aggiornato',
    'meta.usesNonCookieStorage': 'Utilizza archiviazione senza cookie',
    'meta.standardRetention': 'Conservazione standard',

    'common.yes': 'Sì',
    'common.no': 'No',
    'common.notDeclared': 'Non dichiarato',
    'common.noneDeclared': 'Nessuna dichiarata',
    'common.day': 'giorno',
    'common.days': 'giorni',
    'common.year': 'anno',
    'common.years': 'anni',
    'common.hour': 'ora',
    'common.hours': 'ore',
    'common.second': 'secondo',
    'common.seconds': 'secondi',
    'common.sessionOnly': 'Solo sessione',
    'common.purposeN': 'Finalità {id}',

    'atp.note': 'Questi partner certificati da Google non sono presenti nell’elenco dei fornitori IAB. Scegli se possono utilizzare i tuoi dati.',

    'cat.alwaysActive': 'Sempre attivo',
    'cat.alwaysActiveAria': '{name} (sempre attivo)',
    'cat.enableAria': 'Attiva {name}',
    'cat.necessary': 'Necessari',
    'cat.necessaryDesc': 'I cookie necessari sono richiesti per abilitare le funzionalità di base di questo sito, come l’accesso sicuro o la modifica delle preferenze di consenso. Questi cookie non memorizzano alcun dato personale identificabile.',
    'cat.functional': 'Funzionali',
    'cat.functionalDesc': 'I cookie funzionali contribuiscono a eseguire determinate funzionalità, come la condivisione dei contenuti del sito sui social media, la raccolta di feedback e altre funzionalità di terze parti.',
    'cat.analytics': 'Analitici',
    'cat.analyticsDesc': 'I cookie analitici sono utilizzati per capire come i visitatori interagiscono con il sito web. Questi cookie forniscono informazioni su metriche quali numero di visitatori, frequenza di rimbalzo e sorgente di traffico.',
    'cat.performance': 'Prestazioni',
    'cat.performanceDesc': 'I cookie di prestazione sono utilizzati per comprendere e analizzare i principali indici di prestazione del sito web, contribuendo a offrire una migliore esperienza ai visitatori.',
    'cat.advertisement': 'Pubblicità',
    'cat.advertisementDesc': 'I cookie pubblicitari sono utilizzati per proporre ai visitatori annunci personalizzati in base alle pagine visitate in precedenza e per analizzare l’efficacia delle campagne pubblicitarie.'
  },

  pl: {
    'banner.regionLabel': 'Cenimy Twoją prywatność',
    'banner.title': 'Twoja prywatność jest dla nas ważna',
    'banner.bodyHtml': 'Za Twoją zgodą my oraz <a href="#" id="consentBitVendorsLink" class="consentBit-vendors-link" data-consentBit-tag="vendors-link" aria-label="Zobacz listę dostawców zewnętrznych oraz cele, funkcje specjalne i stosy, z których korzystają"><span id="consentBitVendorCountText">dostawcy zewnętrzni</span></a> przechowujemy informacje na Twoim urządzeniu (takie jak pliki cookie i identyfikatory urządzenia) lub uzyskujemy do nich dostęp oraz przetwarzamy Twoje dane osobowe (w tym unikalne identyfikatory, adres IP, aktywność przeglądania i przybliżoną lokalizację) w celach wskazanych poniżej. Część przetwarzania opiera się na prawnie uzasadnionym interesie, wobec którego możesz wnieść sprzeciw. Twoje wybory dotyczą wyłącznie tej witryny i można je zmienić w dowolnym momencie za pomocą ikony plików cookie w lewym dolnym rogu.',
    'banner.purposesLineHtml': '<strong>Nasi partnerzy zbierają Twoje informacje w następujących celach:</strong> <span id="consentBitPurposesText" data-consentBit-tag="purposes-list"></span>.<br/> <strong>Korzystają również z następujących funkcji specjalnych:</strong> <span id="consentBitSpecialFeaturesText" data-consentBit-tag="special-features-list"></span>.',

    'btn.customise': 'Dostosuj',
    'btn.rejectAll': 'Odrzuć wszystko',
    'btn.acceptAll': 'Zaakceptuj wszystko',
    'btn.savePreferences': 'Zapisz moje preferencje',
    'btn.close': 'Zamknij',
    'btn.preferencesAria': 'Preferencje plików cookie',

    'modal.title': 'Dostosuj preferencje zgody',
    'modal.intro': 'Dostosuj poniżej swoje preferencje zgody dla kategorii plików cookie oraz preferencje śledzenia reklam dla Celów & funkcji oraz Dostawców. Możesz wyrazić szczegółową zgodę dla każdego dostawcy zewnętrznego. Większość dostawców wymaga wyraźnej zgody na przetwarzanie danych osobowych, inni opierają się na prawnie uzasadnionym interesie. Masz jednak prawo wnieść sprzeciw wobec korzystania przez nich z prawnie uzasadnionego interesu.',
    'modal.disclosureSummary': 'Jak ta platforma zarządzania zgodami przechowuje Twoje wybory',
    'modal.disclosureBodyHtml': 'Aby zapamiętać dokonane tutaj wybory, ta CMP (cmpId {cmpId}) zapisuje ciąg zgody TCF w pliku cookie <code>euconsent-v2</code> oraz w <code>localStorage</code> Twojej przeglądarki (klucze <code>TCF_TC_STRING</code> i <code>cookieConsentPrefs</code>) przez maksymalnie 365 dni. Plik cookie jest odświeżany po zaktualizowaniu wyborów. Sama CMP nie przetwarza danych osobowych; ciąg zgody jest udostępniany dostawcom, aby mogli respektować Twoje wybory.',

    'tab.cookie': 'Kategorie plików cookie',
    'tab.purpose': 'Cele & funkcje',
    'tab.vendor': 'Dostawcy',

    'cookie.intro1': 'Używamy plików cookie, aby umożliwić Ci sprawną nawigację i korzystanie z określonych funkcji. Szczegółowe informacje o wszystkich plikach cookie znajdziesz poniżej w każdej kategorii zgody.',
    'cookie.intro2': 'Pliki cookie zaklasyfikowane jako „Niezbędne” są przechowywane w Twojej przeglądarce, ponieważ są niezbędne do działania podstawowych funkcji witryny.',

    'vendor.searchPlaceholder': 'Szukaj dostawców według nazwy lub identyfikatora ...',
    'vendor.loading': 'Ładowanie dostawców ...',
    'vendor.empty': 'Brak dostawców do wyświetlenia.',
    'vendor.error': 'Nie udało się załadować dostawców. Spróbuj ponownie.',
    'vendor.showDetails': 'Pokaż szczegóły ▾',
    'vendor.hideDetails': 'Ukryj szczegóły ▴',
    'vendor.consentCount': 'Liczba dostawców proszących o zgodę: {count}',
    'vendor.countLineFull': 'Liczba dostawców proszących o zgodę: {consent} • Opierających się na prawnie uzasadnionym interesie: {li} • Łącznie: {total}',
    'vendor.unknown': 'Nieznany dostawca',
    'vendor.idPrefix': 'ID:',
    'vendor.objectAria': 'Wnieś sprzeciw wobec przetwarzania przez {name} na podstawie prawnie uzasadnionego interesu',
    'vendor.consentAria': 'Włącz zgodę dla {name}',
    'vendor.objectNoteHtml': '<strong>Prawo do sprzeciwu:</strong> Wyłącz powyżej opcję „Prawnie uzasadniony interes”, aby wnieść sprzeciw wobec przetwarzania Twoich danych osobowych przez tego dostawcę na podstawie prawnie uzasadnionego interesu.',

    'label.consent': 'Zgoda',
    'link.privacyPolicy': 'Polityka prywatności',
    'link.legIntClaim': 'Oświadczenie o prawnie uzasadnionym interesie',

    'section.purposes': 'Cele',
    'section.specialPurposes': 'Cele specjalne',
    'section.features': 'Funkcje',
    'section.specialFeatures': 'Funkcje specjalne',
    'section.legitimateInterest': 'Prawnie uzasadniony interes',

    'vsec.purposesConsent': 'Cele (wymagana zgoda)',
    'vsec.purposesLegInt': 'Cele (prawnie uzasadniony interes)',
    'vsec.flexiblePurposes': 'Cele elastyczne',
    'vsec.specialPurposes': 'Cele specjalne',
    'vsec.features': 'Funkcje',
    'vsec.specialFeatures': 'Funkcje specjalne',
    'vsec.dataCategories': 'Kategorie gromadzonych danych',
    'vsec.storageRetention': 'Przechowywanie & retencja',
    'vsec.retentionByPurpose': 'Retencja według celu',

    'meta.usesCookies': 'Używa plików cookie',
    'meta.cookieMaxDuration': 'Maksymalny czas życia pliku cookie',
    'meta.cookieRefreshed': 'Plik cookie odświeżany',
    'meta.usesNonCookieStorage': 'Używa pamięci innej niż cookie',
    'meta.standardRetention': 'Standardowa retencja',

    'common.yes': 'Tak',
    'common.no': 'Nie',
    'common.notDeclared': 'Nie zadeklarowano',
    'common.noneDeclared': 'Nie zadeklarowano żadnych',
    'common.day': 'dzień',
    'common.days': 'dni',
    'common.year': 'rok',
    'common.years': 'lat',
    'common.hour': 'godzina',
    'common.hours': 'godzin',
    'common.second': 'sekunda',
    'common.seconds': 'sekund',
    'common.sessionOnly': 'Tylko sesja',
    'common.purposeN': 'Cel {id}',

    'atp.note': 'Ci partnerzy certyfikowani przez Google nie znajdują się na liście dostawców IAB. Zdecyduj, czy mogą korzystać z Twoich danych.',

    'cat.alwaysActive': 'Zawsze aktywne',
    'cat.alwaysActiveAria': '{name} (zawsze aktywne)',
    'cat.enableAria': 'Włącz {name}',
    'cat.necessary': 'Niezbędne',
    'cat.necessaryDesc': 'Niezbędne pliki cookie są wymagane do działania podstawowych funkcji tej witryny, takich jak bezpieczne logowanie czy zmiana preferencji zgody. Te pliki cookie nie przechowują żadnych danych umożliwiających identyfikację osoby.',
    'cat.functional': 'Funkcjonalne',
    'cat.functionalDesc': 'Funkcjonalne pliki cookie pomagają realizować określone funkcje, takie jak udostępnianie treści witryny w mediach społecznościowych, zbieranie opinii i inne funkcje podmiotów zewnętrznych.',
    'cat.analytics': 'Analityczne',
    'cat.analyticsDesc': 'Analityczne pliki cookie służą do zrozumienia, w jaki sposób odwiedzający korzystają z witryny. Dostarczają informacji o wskaźnikach takich jak liczba odwiedzających, współczynnik odrzuceń czy źródło ruchu.',
    'cat.performance': 'Wydajnościowe',
    'cat.performanceDesc': 'Wydajnościowe pliki cookie służą do zrozumienia i analizy kluczowych wskaźników wydajności witryny, co pomaga zapewnić odwiedzającym lepsze doświadczenia.',
    'cat.advertisement': 'Reklamowe',
    'cat.advertisementDesc': 'Reklamowe pliki cookie służą do wyświetlania odwiedzającym spersonalizowanych reklam na podstawie wcześniej odwiedzonych stron oraz do analizy skuteczności kampanii reklamowych.'
  },

  es: {
    'banner.regionLabel': 'Valoramos tu privacidad',
    'banner.title': 'Tu privacidad nos importa',
    'banner.bodyHtml': 'Con tu permiso, nosotros y <a href="#" id="consentBitVendorsLink" class="consentBit-vendors-link" data-consentBit-tag="vendors-link" aria-label="Ver la lista de proveedores externos y las finalidades, funciones especiales y pilas que utilizan"><span id="consentBitVendorCountText">proveedores externos</span></a> almacenamos información en tu dispositivo (como cookies e identificadores de dispositivo) o accedemos a ella, y tratamos tus datos personales (incluidos identificadores únicos, dirección IP, actividad de navegación y ubicación aproximada) para las finalidades que se indican a continuación. Parte del tratamiento se basa en el interés legítimo, al que puedes oponerte. Tus elecciones se aplican únicamente a este sitio web y pueden modificarse en cualquier momento mediante el icono de cookies situado abajo a la izquierda.',
    'banner.purposesLineHtml': '<strong>Nuestros socios recopilan tu información para las siguientes finalidades:</strong> <span id="consentBitPurposesText" data-consentBit-tag="purposes-list"></span>.<br/> <strong>También utilizan las siguientes funciones especiales:</strong> <span id="consentBitSpecialFeaturesText" data-consentBit-tag="special-features-list"></span>.',

    'btn.customise': 'Personalizar',
    'btn.rejectAll': 'Rechazar todo',
    'btn.acceptAll': 'Aceptar todo',
    'btn.savePreferences': 'Guardar mis preferencias',
    'btn.close': 'Cerrar',
    'btn.preferencesAria': 'Preferencias de cookies',

    'modal.title': 'Personalizar las preferencias de consentimiento',
    'modal.intro': 'Personaliza a continuación tus preferencias de consentimiento para las categorías de cookies y tus preferencias de seguimiento publicitario para Finalidades & funciones y Proveedores. Puedes otorgar un consentimiento granular a cada proveedor externo. La mayoría de los proveedores exige un consentimiento explícito para el tratamiento de datos personales, mientras que otros se basan en el interés legítimo. No obstante, tienes derecho a oponerte a su uso del interés legítimo.',
    'modal.disclosureSummary': 'Cómo esta plataforma de gestión del consentimiento almacena tus elecciones',
    'modal.disclosureBodyHtml': 'Para recordar las elecciones que realizas aquí, esta CMP (cmpId {cmpId}) almacena una cadena de consentimiento TCF en la cookie <code>euconsent-v2</code> y en el <code>localStorage</code> de tu navegador (claves <code>TCF_TC_STRING</code> y <code>cookieConsentPrefs</code>) durante un máximo de 365 días. La cookie se actualiza cuando modificas tus elecciones. La propia CMP no trata datos personales; la cadena de consentimiento se comparte con los proveedores para que puedan respetar tus elecciones.',

    'tab.cookie': 'Categorías de cookies',
    'tab.purpose': 'Finalidades & funciones',
    'tab.vendor': 'Proveedores',

    'cookie.intro1': 'Utilizamos cookies para ayudarte a navegar de forma eficiente y a realizar determinadas funciones. Encontrarás información detallada sobre todas las cookies en cada categoría de consentimiento que aparece a continuación.',
    'cookie.intro2': 'Las cookies clasificadas como "Necesarias" se almacenan en tu navegador, ya que son esenciales para habilitar las funcionalidades básicas del sitio.',

    'vendor.searchPlaceholder': 'Buscar proveedores por nombre o ID ...',
    'vendor.loading': 'Cargando proveedores ...',
    'vendor.empty': 'No hay proveedores que mostrar.',
    'vendor.error': 'No se han podido cargar los proveedores. Inténtalo de nuevo.',
    'vendor.showDetails': 'Mostrar detalles ▾',
    'vendor.hideDetails': 'Ocultar detalles ▴',
    'vendor.consentCount': 'Número de proveedores que solicitan consentimiento: {count}',
    'vendor.countLineFull': 'Número de proveedores que solicitan consentimiento: {consent} • Basados en el interés legítimo: {li} • Total: {total}',
    'vendor.unknown': 'Proveedor desconocido',
    'vendor.idPrefix': 'ID:',
    'vendor.objectAria': 'Oponerse al tratamiento por parte de {name} basado en el interés legítimo',
    'vendor.consentAria': 'Activar el consentimiento para {name}',
    'vendor.objectNoteHtml': '<strong>Derecho de oposición:</strong> Desactiva "Interés legítimo" más arriba para oponerte al tratamiento de tus datos personales por parte de este proveedor sobre la base del interés legítimo.',

    'label.consent': 'Consentimiento',
    'link.privacyPolicy': 'Política de privacidad',
    'link.legIntClaim': 'Declaración de interés legítimo',

    'section.purposes': 'Finalidades',
    'section.specialPurposes': 'Finalidades especiales',
    'section.features': 'Funciones',
    'section.specialFeatures': 'Funciones especiales',
    'section.legitimateInterest': 'Interés legítimo',

    'vsec.purposesConsent': 'Finalidades (consentimiento requerido)',
    'vsec.purposesLegInt': 'Finalidades (interés legítimo)',
    'vsec.flexiblePurposes': 'Finalidades flexibles',
    'vsec.specialPurposes': 'Finalidades especiales',
    'vsec.features': 'Funciones',
    'vsec.specialFeatures': 'Funciones especiales',
    'vsec.dataCategories': 'Categorías de datos recopilados',
    'vsec.storageRetention': 'Almacenamiento & conservación',
    'vsec.retentionByPurpose': 'Conservación por finalidad',

    'meta.usesCookies': 'Utiliza cookies',
    'meta.cookieMaxDuration': 'Duración máxima de la cookie',
    'meta.cookieRefreshed': 'Cookie actualizada',
    'meta.usesNonCookieStorage': 'Utiliza almacenamiento sin cookies',
    'meta.standardRetention': 'Conservación estándar',

    'common.yes': 'Sí',
    'common.no': 'No',
    'common.notDeclared': 'No declarado',
    'common.noneDeclared': 'Ninguna declarada',
    'common.day': 'día',
    'common.days': 'días',
    'common.year': 'año',
    'common.years': 'años',
    'common.hour': 'hora',
    'common.hours': 'horas',
    'common.second': 'segundo',
    'common.seconds': 'segundos',
    'common.sessionOnly': 'Solo sesión',
    'common.purposeN': 'Finalidad {id}',

    'atp.note': 'Estos socios certificados por Google no figuran en la lista de proveedores del IAB. Decide si pueden utilizar tus datos.',

    'cat.alwaysActive': 'Siempre activas',
    'cat.alwaysActiveAria': '{name} (siempre activas)',
    'cat.enableAria': 'Activar {name}',
    'cat.necessary': 'Necesarias',
    'cat.necessaryDesc': 'Las cookies necesarias son imprescindibles para habilitar las funciones básicas de este sitio, como el inicio de sesión seguro o el ajuste de tus preferencias de consentimiento. Estas cookies no almacenan ningún dato de identificación personal.',
    'cat.functional': 'Funcionales',
    'cat.functionalDesc': 'Las cookies funcionales ayudan a realizar determinadas funcionalidades, como compartir el contenido del sitio web en redes sociales, recoger comentarios y otras funciones de terceros.',
    'cat.analytics': 'Analíticas',
    'cat.analyticsDesc': 'Las cookies analíticas se utilizan para comprender cómo interactúan los visitantes con el sitio web. Estas cookies aportan información sobre métricas como el número de visitantes, la tasa de rebote o la fuente de tráfico.',
    'cat.performance': 'Rendimiento',
    'cat.performanceDesc': 'Las cookies de rendimiento se utilizan para comprender y analizar los índices clave de rendimiento del sitio web, lo que contribuye a ofrecer una mejor experiencia a los visitantes.',
    'cat.advertisement': 'Publicidad',
    'cat.advertisementDesc': 'Las cookies publicitarias se utilizan para ofrecer a los visitantes anuncios personalizados en función de las páginas visitadas previamente y para analizar la eficacia de las campañas publicitarias.'
  },

  // European Portuguese — matches the worker's pt -> pt-pt alias, so the GVL text
  // and our own copy stay in the same variant ("aceder", not "acessar").
  pt: {
    'banner.regionLabel': 'Valorizamos a sua privacidade',
    'banner.title': 'A sua privacidade é importante para nós',
    'banner.bodyHtml': 'Com a sua autorização, nós e <a href="#" id="consentBitVendorsLink" class="consentBit-vendors-link" data-consentBit-tag="vendors-link" aria-label="Ver a lista de fornecedores terceiros e as finalidades, funcionalidades especiais e pilhas que utilizam"><span id="consentBitVendorCountText">fornecedores terceiros</span></a> armazenamos informações no seu dispositivo (como cookies e identificadores de dispositivo) ou acedemos às mesmas, e tratamos os seus dados pessoais (incluindo identificadores únicos, endereço IP, atividade de navegação e localização aproximada) para as finalidades indicadas abaixo. Parte do tratamento baseia-se no interesse legítimo, ao qual pode opor-se. As suas escolhas aplicam-se apenas a este site e podem ser alteradas a qualquer momento através do ícone de cookies no canto inferior esquerdo.',
    'banner.purposesLineHtml': '<strong>Os nossos parceiros recolhem as suas informações para as seguintes finalidades:</strong> <span id="consentBitPurposesText" data-consentBit-tag="purposes-list"></span>.<br/> <strong>Utilizam também as seguintes funcionalidades especiais:</strong> <span id="consentBitSpecialFeaturesText" data-consentBit-tag="special-features-list"></span>.',

    'btn.customise': 'Personalizar',
    'btn.rejectAll': 'Rejeitar tudo',
    'btn.acceptAll': 'Aceitar tudo',
    'btn.savePreferences': 'Guardar as minhas preferências',
    'btn.close': 'Fechar',
    'btn.preferencesAria': 'Preferências de cookies',

    'modal.title': 'Personalizar as preferências de consentimento',
    'modal.intro': 'Personalize abaixo as suas preferências de consentimento para as categorias de cookies e as suas preferências de rastreio publicitário para Finalidades & funcionalidades e Fornecedores. Pode dar um consentimento granular a cada fornecedor terceiro. A maioria dos fornecedores exige consentimento explícito para o tratamento de dados pessoais, enquanto outros se baseiam no interesse legítimo. Tem, no entanto, o direito de se opor à utilização que fazem do interesse legítimo.',
    'modal.disclosureSummary': 'Como esta plataforma de gestão de consentimento armazena as suas escolhas',
    'modal.disclosureBodyHtml': 'Para memorizar as escolhas que faz aqui, esta CMP (cmpId {cmpId}) armazena uma cadeia de consentimento TCF no cookie <code>euconsent-v2</code> e no <code>localStorage</code> do seu navegador (chaves <code>TCF_TC_STRING</code> e <code>cookieConsentPrefs</code>) durante um máximo de 365 dias. O cookie é renovado quando atualiza as suas escolhas. A própria CMP não trata dados pessoais; a cadeia de consentimento é partilhada com os fornecedores para que possam respeitar as suas escolhas.',

    'tab.cookie': 'Categorias de cookies',
    'tab.purpose': 'Finalidades & funcionalidades',
    'tab.vendor': 'Fornecedores',

    'cookie.intro1': 'Utilizamos cookies para o ajudar a navegar de forma eficiente e a executar determinadas funções. Encontrará informações detalhadas sobre todos os cookies em cada categoria de consentimento abaixo.',
    'cookie.intro2': 'Os cookies classificados como "Necessários" são armazenados no seu navegador, uma vez que são essenciais para ativar as funcionalidades básicas do site.',

    'vendor.searchPlaceholder': 'Procurar fornecedores por nome ou ID ...',
    'vendor.loading': 'A carregar fornecedores ...',
    'vendor.empty': 'Não há fornecedores para apresentar.',
    'vendor.error': 'Não foi possível carregar os fornecedores. Tente novamente.',
    'vendor.showDetails': 'Mostrar detalhes ▾',
    'vendor.hideDetails': 'Ocultar detalhes ▴',
    'vendor.consentCount': 'Número de fornecedores que solicitam consentimento: {count}',
    'vendor.countLineFull': 'Número de fornecedores que solicitam consentimento: {consent} • Baseados no interesse legítimo: {li} • Total: {total}',
    'vendor.unknown': 'Fornecedor desconhecido',
    'vendor.idPrefix': 'ID:',
    'vendor.objectAria': 'Opor-se ao tratamento por {name} baseado no interesse legítimo',
    'vendor.consentAria': 'Ativar o consentimento para {name}',
    'vendor.objectNoteHtml': '<strong>Direito de oposição:</strong> Desative "Interesse legítimo" acima para se opor ao tratamento dos seus dados pessoais por este fornecedor com base no interesse legítimo.',

    'label.consent': 'Consentimento',
    'link.privacyPolicy': 'Política de privacidade',
    'link.legIntClaim': 'Declaração de interesse legítimo',

    'section.purposes': 'Finalidades',
    'section.specialPurposes': 'Finalidades especiais',
    'section.features': 'Funcionalidades',
    'section.specialFeatures': 'Funcionalidades especiais',
    'section.legitimateInterest': 'Interesse legítimo',

    'vsec.purposesConsent': 'Finalidades (consentimento necessário)',
    'vsec.purposesLegInt': 'Finalidades (interesse legítimo)',
    'vsec.flexiblePurposes': 'Finalidades flexíveis',
    'vsec.specialPurposes': 'Finalidades especiais',
    'vsec.features': 'Funcionalidades',
    'vsec.specialFeatures': 'Funcionalidades especiais',
    'vsec.dataCategories': 'Categorias de dados recolhidos',
    'vsec.storageRetention': 'Armazenamento & conservação',
    'vsec.retentionByPurpose': 'Conservação por finalidade',

    'meta.usesCookies': 'Utiliza cookies',
    'meta.cookieMaxDuration': 'Duração máxima do cookie',
    'meta.cookieRefreshed': 'Cookie renovado',
    'meta.usesNonCookieStorage': 'Utiliza armazenamento sem cookies',
    'meta.standardRetention': 'Conservação padrão',

    'common.yes': 'Sim',
    'common.no': 'Não',
    'common.notDeclared': 'Não declarado',
    'common.noneDeclared': 'Nenhuma declarada',
    'common.day': 'dia',
    'common.days': 'dias',
    'common.year': 'ano',
    'common.years': 'anos',
    'common.hour': 'hora',
    'common.hours': 'horas',
    'common.second': 'segundo',
    'common.seconds': 'segundos',
    'common.sessionOnly': 'Apenas sessão',
    'common.purposeN': 'Finalidade {id}',

    'atp.note': 'Estes parceiros certificados pela Google não constam da lista de fornecedores do IAB. Decida se podem utilizar os seus dados.',

    'cat.alwaysActive': 'Sempre ativos',
    'cat.alwaysActiveAria': '{name} (sempre ativos)',
    'cat.enableAria': 'Ativar {name}',
    'cat.necessary': 'Necessários',
    'cat.necessaryDesc': 'Os cookies necessários são exigidos para ativar as funcionalidades básicas deste site, como o início de sessão seguro ou o ajuste das suas preferências de consentimento. Estes cookies não armazenam quaisquer dados de identificação pessoal.',
    'cat.functional': 'Funcionais',
    'cat.functionalDesc': 'Os cookies funcionais ajudam a executar determinadas funcionalidades, como a partilha do conteúdo do site nas redes sociais, a recolha de comentários e outras funcionalidades de terceiros.',
    'cat.analytics': 'Analíticos',
    'cat.analyticsDesc': 'Os cookies analíticos são utilizados para compreender como os visitantes interagem com o site. Estes cookies fornecem informações sobre métricas como o número de visitantes, a taxa de rejeição e a origem do tráfego.',
    'cat.performance': 'Desempenho',
    'cat.performanceDesc': 'Os cookies de desempenho são utilizados para compreender e analisar os principais índices de desempenho do site, o que contribui para uma melhor experiência para os visitantes.',
    'cat.advertisement': 'Publicidade',
    'cat.advertisementDesc': 'Os cookies de publicidade são utilizados para apresentar aos visitantes anúncios personalizados com base nas páginas visitadas anteriormente e para analisar a eficácia das campanhas publicitárias.'
  },

  sv: {
    'banner.regionLabel': 'Vi värnar om din integritet',
    'banner.title': 'Din integritet är viktig för oss',
    'banner.bodyHtml': 'Med ditt samtycke lagrar vi och <a href="#" id="consentBitVendorsLink" class="consentBit-vendors-link" data-consentBit-tag="vendors-link" aria-label="Visa listan över tredjepartsleverantörer samt de ändamål, särskilda funktioner och staplar som de använder"><span id="consentBitVendorCountText">tredjepartsleverantörer</span></a> information på din enhet (såsom cookies och enhetsidentifierare) eller får åtkomst till den, och behandlar dina personuppgifter (inklusive unika identifierare, IP-adress, surfaktivitet och ungefärlig plats) för ändamålen nedan. En del av behandlingen grundar sig på berättigat intresse, som du kan invända mot. Dina val gäller endast denna webbplats och kan när som helst ändras via cookieikonen längst ned till vänster.',
    'banner.purposesLineHtml': '<strong>Våra partner samlar in dina uppgifter för följande ändamål:</strong> <span id="consentBitPurposesText" data-consentBit-tag="purposes-list"></span>.<br/> <strong>De använder även följande särskilda funktioner:</strong> <span id="consentBitSpecialFeaturesText" data-consentBit-tag="special-features-list"></span>.',

    'btn.customise': 'Anpassa',
    'btn.rejectAll': 'Neka alla',
    'btn.acceptAll': 'Acceptera alla',
    'btn.savePreferences': 'Spara mina inställningar',
    'btn.close': 'Stäng',
    'btn.preferencesAria': 'Cookie-inställningar',

    'modal.title': 'Anpassa samtyckesinställningar',
    'modal.intro': 'Anpassa dina samtyckesinställningar för cookiekategorier och dina inställningar för annonsspårning för Ändamål & funktioner och Leverantörer nedan. Du kan lämna detaljerat samtycke för varje tredjepartsleverantör. De flesta leverantörer kräver uttryckligt samtycke för behandling av personuppgifter, medan andra grundar sig på berättigat intresse. Du har dock rätt att invända mot deras användning av berättigat intresse.',
    'modal.disclosureSummary': 'Så lagrar denna samtyckeshanteringsplattform dina val',
    'modal.disclosureBodyHtml': 'För att komma ihåg de val du gör här lagrar denna CMP (cmpId {cmpId}) en TCF-samtyckessträng i cookien <code>euconsent-v2</code> och i webbläsarens <code>localStorage</code> (nycklarna <code>TCF_TC_STRING</code> och <code>cookieConsentPrefs</code>) i upp till 365 dagar. Cookien uppdateras när du ändrar dina val. Själva CMP:en behandlar inga personuppgifter; samtyckessträngen delas med leverantörer så att de kan respektera dina val.',

    'tab.cookie': 'Cookiekategorier',
    'tab.purpose': 'Ändamål & funktioner',
    'tab.vendor': 'Leverantörer',

    'cookie.intro1': 'Vi använder cookies för att hjälpa dig att navigera effektivt och utföra vissa funktioner. Detaljerad information om alla cookies finns under varje samtyckeskategori nedan.',
    'cookie.intro2': 'De cookies som klassificeras som "Nödvändiga" lagras i din webbläsare eftersom de är avgörande för webbplatsens grundläggande funktioner.',

    'vendor.searchPlaceholder': 'Sök leverantörer efter namn eller ID ...',
    'vendor.loading': 'Leverantörer läses in ...',
    'vendor.empty': 'Inga leverantörer att visa.',
    'vendor.error': 'Det gick inte att läsa in leverantörerna. Försök igen.',
    'vendor.showDetails': 'Visa detaljer ▾',
    'vendor.hideDetails': 'Dölj detaljer ▴',
    'vendor.consentCount': 'Antal leverantörer som begär samtycke: {count}',
    'vendor.countLineFull': 'Antal leverantörer som begär samtycke: {consent} • Grundar sig på berättigat intresse: {li} • Totalt: {total}',
    'vendor.unknown': 'Okänd leverantör',
    'vendor.idPrefix': 'ID:',
    'vendor.objectAria': 'Invänd mot behandling av {name} som grundar sig på berättigat intresse',
    'vendor.consentAria': 'Aktivera samtycke för {name}',
    'vendor.objectNoteHtml': '<strong>Rätt att invända:</strong> Stäng av "Berättigat intresse" ovan för att invända mot att denna leverantör behandlar dina personuppgifter med stöd av berättigat intresse.',

    'label.consent': 'Samtycke',
    'link.privacyPolicy': 'Integritetspolicy',
    'link.legIntClaim': 'Redogörelse för berättigat intresse',

    'section.purposes': 'Ändamål',
    'section.specialPurposes': 'Särskilda ändamål',
    'section.features': 'Funktioner',
    'section.specialFeatures': 'Särskilda funktioner',
    'section.legitimateInterest': 'Berättigat intresse',

    'vsec.purposesConsent': 'Ändamål (samtycke krävs)',
    'vsec.purposesLegInt': 'Ändamål (berättigat intresse)',
    'vsec.flexiblePurposes': 'Flexibla ändamål',
    'vsec.specialPurposes': 'Särskilda ändamål',
    'vsec.features': 'Funktioner',
    'vsec.specialFeatures': 'Särskilda funktioner',
    'vsec.dataCategories': 'Kategorier av insamlade uppgifter',
    'vsec.storageRetention': 'Lagring & bevarande',
    'vsec.retentionByPurpose': 'Bevarande per ändamål',

    'meta.usesCookies': 'Använder cookies',
    'meta.cookieMaxDuration': 'Cookiens maximala varaktighet',
    'meta.cookieRefreshed': 'Cookien förnyas',
    'meta.usesNonCookieStorage': 'Använder lagring utan cookies',
    'meta.standardRetention': 'Standardbevarande',

    'common.yes': 'Ja',
    'common.no': 'Nej',
    'common.notDeclared': 'Ej angivet',
    'common.noneDeclared': 'Inga angivna',
    'common.day': 'dag',
    'common.days': 'dagar',
    'common.year': 'år',
    'common.years': 'år',
    'common.hour': 'timme',
    'common.hours': 'timmar',
    'common.second': 'sekund',
    'common.seconds': 'sekunder',
    'common.sessionOnly': 'Endast session',
    'common.purposeN': 'Ändamål {id}',

    'atp.note': 'Dessa Google-certifierade partner finns inte med på IAB:s leverantörslista. Välj om de får använda dina uppgifter.',

    'cat.alwaysActive': 'Alltid aktiva',
    'cat.alwaysActiveAria': '{name} (alltid aktiva)',
    'cat.enableAria': 'Aktivera {name}',
    'cat.necessary': 'Nödvändiga',
    'cat.necessaryDesc': 'Nödvändiga cookies krävs för att aktivera webbplatsens grundläggande funktioner, såsom säker inloggning eller justering av dina samtyckesinställningar. Dessa cookies lagrar inga personligt identifierbara uppgifter.',
    'cat.functional': 'Funktionella',
    'cat.functionalDesc': 'Funktionella cookies bidrar till att utföra vissa funktioner, såsom att dela webbplatsens innehåll på sociala medier, samla in återkoppling och andra funktioner från tredje part.',
    'cat.analytics': 'Analys',
    'cat.analyticsDesc': 'Analyscookies används för att förstå hur besökare interagerar med webbplatsen. Dessa cookies ger information om mätvärden såsom antal besökare, avvisningsfrekvens och trafikkälla.',
    'cat.performance': 'Prestanda',
    'cat.performanceDesc': 'Prestandacookies används för att förstå och analysera webbplatsens viktigaste prestandamått, vilket bidrar till en bättre användarupplevelse för besökarna.',
    'cat.advertisement': 'Annonsering',
    'cat.advertisementDesc': 'Annonscookies används för att ge besökare anpassade annonser baserat på tidigare besökta sidor och för att analysera annonskampanjernas effektivitet.'
  }
};

/**
 * Normalise any input to a language we have a table for, falling back to English.
 * Accepts browser-style tags too ('de-AT' -> 'de', 'pt-BR' -> 'pt').
 */
export function resolveIabLang(input?: string | null): string {
  const raw = String(input || '').trim().toLowerCase();
  if (raw in IAB_STRINGS) return raw;
  const base = raw.split(/[-_]/)[0];
  if (base in IAB_STRINGS) return base;
  return 'en';
}

/**
 * Look up a string, falling back to English for any key a translation is missing —
 * a partial translation degrades per string rather than blanking the banner.
 * {placeholder} tokens are replaced from `vars`.
 */
export function iabT(
  lang: string,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const table = IAB_STRINGS[resolveIabLang(lang)] || IAB_STRINGS.en;
  let out = table[key];
  if (out === undefined) out = IAB_STRINGS.en[key];
  if (out === undefined) return '';
  if (vars) {
    for (const name of Object.keys(vars)) {
      out = out.split('{' + name + '}').join(String(vars[name]));
    }
  }
  return out;
}
