/** Locales the site is built for. AR is wired in but hidden until content exists. */
export const LOCALES = ["tr", "en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "tr";
/** Locales visible in the language switcher and sitemap. */
export const PUBLISHED_LOCALES: readonly Locale[] = ["tr", "en"];

export const isLocale = (v: string | undefined): v is Locale => !!v && (LOCALES as readonly string[]).includes(v);
/** Routable today. AR stays a known locale (types, RTL) but is not served until its content exists. */
export const isPublishedLocale = (v: string | undefined): v is Locale => !!v && (PUBLISHED_LOCALES as readonly string[]).includes(v);

export const DIRECTION: Record<Locale, "ltr" | "rtl"> = { tr: "ltr", en: "ltr", ar: "rtl" };

export const HREFLANG: Record<Locale, string> = { tr: "tr", en: "en", ar: "ar" };

const TR_MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };

/** URL slug: lowercase, ASCII, hyphenated. Turkish letters are transliterated (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u). */
export function slugify(input: string): string {
  return input
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => TR_MAP[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Join path segments under a locale prefix: localePath("tr", "subeler", "istanbul") -> "/tr/subeler/istanbul". */
export function localePath(locale: Locale, ...segments: string[]): string {
  const rest = segments.filter(Boolean).join("/");
  return rest ? `/${locale}/${rest}` : `/${locale}`;
}

/** The 14 EU allergens as printed in the brand's PDF (Turkish) -> English. Other languages fall back to the printed name. */
const ALLERGENS_EN: Record<string, string> = {
  Gluten: "Gluten (cereals)",
  Yumurta: "Egg",
  Balık: "Fish",
  "Yer Fıstığı": "Peanut",
  Kabuklular: "Crustaceans",
  "Sert Kabuklu Meyveler": "Tree nuts",
  Soya: "Soy",
  Süt: "Milk",
  Kereviz: "Celery",
  Hardal: "Mustard",
  Susam: "Sesame",
  Sülfitler: "Sulphites",
  "Acı Bakla": "Lupin",
  Yumuşakçalar: "Molluscs",
};
export const allergenLabel = (name: string, locale: Locale) => (locale === "en" ? (ALLERGENS_EN[name] ?? name) : name);

/** Fixed first path segment of each section, per locale (the rest comes from content slugs). */
export const SECTION_SEGMENT = {
  menu: { tr: "menu", en: "menu", ar: "menu" },
  branches: { tr: "subeler", en: "branches", ar: "branches" },
  legal: { tr: "yasal", en: "legal", ar: "legal" },
  investor: { tr: "yatirimci-ol", en: "franchise", ar: "franchise" },
} as const satisfies Record<string, Record<Locale, string>>;
