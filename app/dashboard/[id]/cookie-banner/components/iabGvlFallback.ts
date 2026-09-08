// Bundled English GVL declaration text (vendor list v175, 2026-09-03T16:00:24Z).
//
// GENERATED — do not hand-edit. Regenerate from the worker's GVL endpoint:
//   curl ${GVL_BASE_URL}/purposes-en.json
//
// Why this is bundled rather than always fetched: English is the default banner
// language, and the preview must render the moment the tab opens. This is also
// the fallback for every other language when the GVL fetch fails, so a network
// blip degrades the preview to English rather than to an empty list.
//
// Illustrations are deliberately dropped — the preview renders name + description
// only, matching the runtime banner's purpose accordions.

export type GvlEntry = { name: string; description: string };
export type GvlDeclarations = {
  purposes: Record<number, GvlEntry>;
  specialPurposes: Record<number, GvlEntry>;
  features: Record<number, GvlEntry>;
  specialFeatures: Record<number, GvlEntry>;
};

export const GVL_EN_FALLBACK: GvlDeclarations = {
  purposes: {
    1: { name: "Store and/or access information on a device", description: "Cookies, device or similar online identifiers (e.g. login-based identifiers, randomly assigned identifiers, network based identifiers) together with other information (e.g. browser type and information, language, screen size, supported technologies etc.) can be stored or read on your device to recognise it each time it connects to an app or to a website, for one or several of the purposes presented here." },
    2: { name: "Use limited data to select advertising", description: "Advertising presented to you on this service can be based on limited data, such as the website or app you are using, your non-precise location, your device type or which content you are (or have been) interacting with (for example, to limit the number of times an ad is presented to you)." },
    3: { name: "Create profiles for personalised advertising", description: "Information about your activity on this service (such as forms you submit, content you look at) can be stored and combined with other information about you (for example, information from your previous activity on this service and other websites or apps) or similar users. This is then used to build or improve a profile about you (that might include possible interests and personal aspects). Your profile can be used (also later) to present advertising that appears more relevant based on your possible interests by this and other entities." },
    4: { name: "Use profiles to select personalised advertising", description: "Advertising presented to you on this service can be based on your advertising profiles, which can reflect your activity on this service or other websites or apps (like the forms you submit, content you look at), possible interests and personal aspects." },
    5: { name: "Create profiles to personalise content", description: "Information about your activity on this service (for instance, forms you submit, non-advertising content you look at) can be stored and combined with other information about you (such as your previous activity on this service or other websites or apps) or similar users. This is then used to build or improve a profile about you (which might for example include possible interests and personal aspects). Your profile can be used (also later) to present content that appears more relevant based on your possible interests, such as by adapting the order in which content is shown to you, so that it is even easier for you to find content that matches your interests." },
    6: { name: "Use profiles to select personalised content", description: "Content presented to you on this service can be based on your content personalisation profiles, which can reflect your activity on this or other services (for instance, the forms you submit, content you look at), possible interests and personal aspects. This can for example be used to adapt the order in which content is shown to you, so that it is even easier for you to find (non-advertising) content that matches your interests." },
    7: { name: "Measure advertising performance", description: "Information regarding which advertising is presented to you and how you interact with it can be used to determine how well an advert has worked for you or other users and whether the goals of the advertising were reached. For instance, whether you saw an ad, whether you clicked on it, whether it led you to buy a product or visit a website, etc. This is very helpful to understand the relevance of advertising campaigns." },
    8: { name: "Measure content performance", description: "Information regarding which content is presented to you and how you interact with it can be used to determine whether the (non-advertising) content e.g. reached its intended audience and matched your interests. For instance, whether you read an article, watch a video, listen to a podcast or look at a product description, how long you spent on this service and the web pages you visit etc. This is very helpful to understand the relevance of (non-advertising) content that is shown to you." },
    9: { name: "Understand audiences through statistics or combinations of data from different sources", description: "Reports can be generated based on the combination of data sets (like user profiles, statistics, market research, analytics data) regarding your interactions and those of other users with advertising or (non-advertising) content to identify common characteristics (for instance, to determine which target audiences are more receptive to an ad campaign or to certain contents)." },
    10: { name: "Develop and improve services", description: "Information about your activity on this service, such as your interaction with ads or content, can be very helpful to improve products and services and to build new products and services based on user interactions, the type of audience, etc. This specific purpose does not include the development or improvement of user profiles and identifiers." },
    11: { name: "Use limited data to select content", description: "Content presented to you on this service can be based on limited data, such as the website or app you are using, your non-precise location, your device type, or which content you are (or have been) interacting with (for example, to limit the number of times a video or an article is presented to you)." },
  },
  specialPurposes: {
    1: { name: "Ensure security, prevent and detect fraud, and fix errors", description: "Your data can be used to monitor for and prevent unusual and possibly fraudulent activity (for example, regarding advertising, ad clicks by bots), and ensure systems and processes work properly and securely. It can also be used to correct any problems you, the publisher or the advertiser may encounter in the delivery of content and ads and in your interaction with them." },
    2: { name: "Deliver and present advertising and content", description: "Certain information (like an IP address or device capabilities) is used to ensure the technical compatibility of the content or advertising, and to facilitate the transmission of the content or ad to your device." },
    3: { name: "Save and communicate privacy choices", description: "The choices you make regarding the purposes and entities listed in this notice are saved and made available to those entities in the form of digital signals (such as a string of characters). This is necessary in order to enable both this service and those entities to respect such choices." },
  },
  features: {
    1: { name: "Match and combine data from other data sources", description: "Information about your activity on this service may be matched and combined with other information relating to you and originating from various sources (for instance your activity on a separate online service, your use of a loyalty card in-store, or your answers to a survey), in support of the purposes explained in this notice." },
    2: { name: "Link different devices", description: "In support of the purposes explained in this notice, your device might be considered as likely linked to other devices that belong to you or your household (for instance because you are logged in to the same service on both your phone and your computer, or because you may use the same Internet connection on both devices)." },
    3: { name: "Identify devices based on information transmitted automatically", description: "Your device might be distinguished from other devices based on information it automatically sends when accessing the Internet (for instance, the IP address of your Internet connection or the type of browser you are using) in support of the purposes exposed in this notice." },
  },
  specialFeatures: {
    1: { name: "Use precise geolocation data", description: "With your acceptance, your precise location (within a radius of less than 500 metres) may be used in support of the purposes explained in this notice." },
    2: { name: "Identify devices based on information actively requested", description: "With your acceptance, certain characteristics specific to your device might be requested and used to distinguish it from other devices (such as the installed fonts or plugins, the resolution of your screen) in support of the purposes explained in this notice." },
  },
};
