import type { Metadata } from "next";
import type { Alternates, Seo } from "@doyuyo/core";
import { DEFAULT_LOCALE, HREFLANG, PUBLISHED_LOCALES, type Locale } from "@doyuyo/i18n";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SITE_NAME = "Doyuyo!";

/** Only the real domain is indexable. Local, staging and preview hosts are noindex so they never leak into search. */
export const IS_PRODUCTION_SITE = (() => {
  try {
    const h = new URL(SITE_URL).hostname;
    return h === "doyuyo.com" || h === "www.doyuyo.com";
  } catch {
    return false;
  }
})();

export const ROBOTS_META: Metadata["robots"] = IS_PRODUCTION_SITE
  ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
  : { index: false, follow: false };

const abs = (p?: string | null) => (p ? (p.startsWith("http") ? p : `${SITE_URL}${p}`) : undefined);

/**
 * Page metadata: title/description from the panel (or generated from real fields), canonical = own path,
 * hreflang only for languages that really have this page, x-default -> TR version, Open Graph + Twitter
 * with a photo (page photo, else the site's default), llms.txt discovery link.
 */
export function buildMetadata(opts: {
  locale: Locale;
  path: string;
  title: string;
  seo?: Seo;
  alternates?: Alternates;
  noindex?: boolean;
  /** Fallback photo when the page has none. */
  defaultImage?: string | null;
  type?: "website" | "article";
}): Metadata {
  const { locale, path, title, seo, alternates = {}, noindex, defaultImage, type = "website" } = opts;
  const languages: Record<string, string> = {};
  for (const l of PUBLISHED_LOCALES) if (alternates[l]) languages[HREFLANG[l]] = `${SITE_URL}${alternates[l]}`;
  const xDefault = alternates[DEFAULT_LOCALE];
  if (xDefault) languages["x-default"] = `${SITE_URL}${xDefault}`;
  // Keep an existing title only when it is a sensible length (the old site had "• Doyuyo" and 80-character titles).
  const given = seo?.title?.trim() ?? "";
  const fullTitle = given.length >= 15 && given.length <= 65 ? given : `${title} | ${SITE_NAME}`;
  const description = seo?.description?.trim() || undefined;
  // Own photo -> caller-supplied default (home hero) -> generated brand card.
  const image = abs(seo?.ogImage) ?? abs(defaultImage) ?? `${SITE_URL}/api/og?title=${encodeURIComponent(title)}`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: `${SITE_URL}${path}`, languages, types: { "text/plain": `${SITE_URL}/llms.txt` } },
    openGraph: {
      title: fullTitle,
      description,
      url: `${SITE_URL}${path}`,
      siteName: SITE_NAME,
      locale: locale === "tr" ? "tr_TR" : locale === "ar" ? "ar_AE" : "en_US",
      alternateLocale: PUBLISHED_LOCALES.filter((l) => l !== locale && alternates[l]).map((l) => (l === "tr" ? "tr_TR" : "en_US")),
      type,
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: image ? [image] : undefined },
    robots: noindex ? { index: false, follow: true } : ROBOTS_META,
  };
}
