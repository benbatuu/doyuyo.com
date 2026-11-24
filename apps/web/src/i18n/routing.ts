import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, PUBLISHED_LOCALES } from "@doyuyo/i18n";

// Locale prefix + UI messages only. Content paths are localized in the database (routes table),
// so there is no `pathnames` map here.
export const routing = defineRouting({
  locales: [...PUBLISHED_LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
  localeDetection: true,
  // hreflang comes from the routes table (localized slugs); next-intl would assume identical paths.
  alternateLinks: false,
});
