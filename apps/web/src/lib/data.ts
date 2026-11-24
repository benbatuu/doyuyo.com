import "server-only";
import { cache } from "react";
import { container } from "@doyuyo/infrastructure";
import type { Locale } from "@doyuyo/i18n";

/** Request-scoped memoized reads shared by layout, header and footer. */
export const getSite = cache((locale: Locale) => container().getSiteSettings.execute(locale));
export const getCategories = cache(async (locale: Locale) => (await container().getMenu.execute(locale)).categories);

export const getPagePath = cache(async (key: string, locale: Locale) => (await container().getStaticPage.byKey(key, locale))?.path ?? `/${locale}`);

/** Photo used for Open Graph / Twitter cards when a page has none: the home page hero. */
export const getDefaultOg = cache(async (locale: Locale) => {
  const home = await container().getStaticPage.byKey("home", locale);
  const hero = home?.sections.find((s) => s.key === "homepage-hero")?.nodes.find((n) => n.type === "image");
  return hero && hero.type === "image" ? hero.src : null;
});

export const app = () => container();
