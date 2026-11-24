import type { Locale } from "@doyuyo/i18n";
import { isBuilderPage } from "./content.ts";
import type { ContentSection } from "./content.ts";
import type { NavLink } from "./site.ts";

/** One row in the admin page list. */
export interface PageListItem {
  id: number;
  key: string;
  template: string;
  published: boolean;
  updatedAt: Date;
  /** Per-locale title and public path; missing locale = no translation yet. */
  locales: Partial<Record<Locale, { title: string; path: string | null }>>;
}

/** Everything the page editor needs for one locale. */
export interface PageTranslationEdit {
  title: string;
  seoTitle: string;
  seoDescription: string;
  sections: ContentSection[];
  path: string | null;
}

export interface PageEdit {
  id: number;
  key: string;
  template: string;
  published: boolean;
  updatedAt: Date;
  translations: Partial<Record<Locale, PageTranslationEdit>>;
}

export interface PageTranslationPatch {
  title: string;
  seoTitle: string;
  seoDescription: string;
  sections: ContentSection[];
}

/** Templates whose layout is code-driven; their sections hold copy only. */
export const PAGE_TEMPLATE_LABEL: Record<string, string> = {
  home: "Anasayfa",
  static: "İçerik sayfası",
  menu: "Menü",
  branches: "Şubeler",
  allergens: "Alerjen tablosu",
};

export interface NewPageInput {
  locale: Locale;
  title: string;
  /** URL segment; derived from the title when empty. */
  slug?: string;
}

export const NAV_MENUS = ["header", "footer", "legal"] as const;
export type NavMenu = (typeof NAV_MENUS)[number];
export type SiteNav = Record<NavMenu, NavLink[]>;
