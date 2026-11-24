import type { Locale } from "@doyuyo/i18n";

/** Kinds of public page whose search texts the panel edits. */
export const SEO_KINDS = ["page", "category", "product", "city", "branch"] as const;
export type SeoKind = (typeof SEO_KINDS)[number];

/** Same limits the website uses when it builds <title> and the meta description. */
export const SEO_TITLE_RANGE = { min: 15, max: 65 } as const;
export const SEO_DESC_RANGE = { min: 50, max: 160 } as const;
export const SEO_SITE_NAME = "Doyuyo!";

/** One public URL (an entity in one language). */
export interface SeoRow {
  kind: SeoKind;
  id: number;
  locale: Locale;
  name: string;
  path: string;
  seoTitle: string;
  seoDescription: string;
  /** Hidden from the site (unpublished page, closed branch…). */
  hidden: boolean;
}

export interface SeoTexts {
  seoTitle: string;
  seoDescription: string;
}

export type SeoIssue = "title-empty" | "title-length" | "desc-empty" | "desc-length";

/** What the site will actually show, so the panel can preview it. */
export function seoEffectiveTitle(name: string, seoTitle: string) {
  const t = seoTitle.trim();
  return t.length >= SEO_TITLE_RANGE.min && t.length <= SEO_TITLE_RANGE.max ? t : `${name} | ${SEO_SITE_NAME}`;
}

export function seoIssues(r: SeoTexts): SeoIssue[] {
  const out: SeoIssue[] = [];
  const t = r.seoTitle.trim().length;
  const d = r.seoDescription.trim().length;
  if (!t) out.push("title-empty");
  else if (t < SEO_TITLE_RANGE.min || t > SEO_TITLE_RANGE.max) out.push("title-length");
  if (!d) out.push("desc-empty");
  else if (d < SEO_DESC_RANGE.min || d > SEO_DESC_RANGE.max) out.push("desc-length");
  return out;
}

export const SEO_PAGE_SIZE = 50;

export interface SeoQuery {
  locale: Locale;
  kind?: SeoKind;
  /** Only rows with a length problem (title or description). */
  issues: boolean;
  q: string;
  page: number;
  pageSize: number;
}

export interface SeoStats {
  /** Rows in the chosen language. */
  total: number;
  live: number;
  titleBad: number;
  descBad: number;
  issues: number;
  kinds: Record<SeoKind, number>;
}

export interface SeoPage {
  items: SeoRow[];
  /** Matching rows after filters (for the pager). */
  total: number;
  stats: SeoStats;
}
