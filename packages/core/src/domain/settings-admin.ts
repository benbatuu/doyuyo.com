export type MaintenanceLocale = "tr" | "en";
export interface MaintenanceTexts {
  title: string;
  message: string;
}

/** Maintenance page. enabled = whole public site shows the maintenance page instead. */
export interface MaintenanceSettings {
  enabled: boolean;
  texts: Record<MaintenanceLocale, MaintenanceTexts>;
}

export const DEFAULT_MAINTENANCE_TEXTS: Record<MaintenanceLocale, MaintenanceTexts> = {
  tr: { title: "Kısa bir bakımdayız", message: "Sitemiz şu an bakımda. Kısa süre içinde tekrar açılacağız." },
  en: { title: "We are under maintenance", message: "Our website is currently under maintenance. We will be back shortly." },
};

export const DEFAULT_MAINTENANCE: MaintenanceSettings = { enabled: false, texts: DEFAULT_MAINTENANCE_TEXTS };

export const SOCIAL_NETWORKS = ["instagram", "youtube", "twitter", "linkedin", "facebook", "tiktok"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

/** Contact data shown on the contact page, footer and structured data. */
export interface ContactSettings {
  email: string;
  phoneLabel: string;
  addressTr: string;
  addressEn: string;
  mapsUrl: string;
  social: { network: SocialNetwork; href: string }[];
}

/** "444 39 55" -> "tel:4443955". */
export const telHref = (label: string) => `tel:${label.replace(/[^\d+]/g, "")}`;
