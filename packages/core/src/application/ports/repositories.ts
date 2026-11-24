import type { Locale } from "@doyuyo/i18n";
import type { BranchDetail, BranchSummary, CityDetail, CitySummary } from "../../domain/branch.ts";
import type { AllergenTable, CategoryDetail, CategorySummary, ProductDetail, ProductSummary } from "../../domain/catalog.ts";
import type { Alternates, EntityRef, EntityType } from "../../domain/content.ts";
import type { SiteSettings, StaticPage } from "../../domain/site.ts";
import type { MediaItem, MediaKind, MediaQuery, MediaTexts, MediaUsage, NewMedia } from "../../domain/media-admin.ts";
import type { AdminCategory, AdminNutrition, AdminProductDetail, AdminProductPatch, AdminProductRow } from "../../domain/catalog-admin.ts";
import type { AdminBranchDetail, AdminBranchPatch, AdminBranchRow, AdminCity, BranchStatus } from "../../domain/branch-admin.ts";
import type { PageEdit, PageListItem, PageTranslationPatch, SiteNav } from "../../domain/page-admin.ts";
import type { SeoKind, SeoPage, SeoQuery, SeoTexts } from "../../domain/seo-admin.ts";
import type { SiteRaw } from "../../domain/site-admin.ts";

/** Path lookup. Paths are stored without trailing slash, e.g. "/tr/subeler/istanbul". */
export interface RouteRepository {
  findByPath(path: string): Promise<(EntityRef & { locale: Locale }) | null>;
  findRedirect(path: string): Promise<{ to: string; status: 301 | 302 | 410 } | null>;
  /** All redirects, for an in-memory lookup table at the edge of the app. */
  listRedirects(): Promise<{ from: string; to: string; status: 301 | 302 | 410 }[]>;
  alternates(ref: EntityRef): Promise<Alternates>;
  pathOf(ref: EntityRef, locale: Locale): Promise<string | null>;
  /** Photos of products and branches, for the image sitemap. */
  listImages(): Promise<{ type: "product" | "branch"; id: number; src: string; titles: Partial<Record<Locale, string>> }[]>;
  /** Every published canonical path (for the sitemap). */
  listCanonical(): Promise<{ locale: Locale; path: string; type: EntityType; id: number; updatedAt: Date }[]>;
}

export interface CatalogRepository {
  listCategories(locale: Locale): Promise<CategorySummary[]>;
  getCategory(id: number, locale: Locale): Promise<CategoryDetail | null>;
  getProduct(id: number, locale: Locale): Promise<ProductDetail | null>;
  featuredProducts(locale: Locale, limit: number): Promise<ProductSummary[]>;
  allergenTable(locale: Locale): Promise<AllergenTable | null>;
}

export interface BranchRepository {
  listBranches(locale: Locale): Promise<BranchSummary[]>;
  listCities(locale: Locale): Promise<CitySummary[]>;
  getCity(id: number, locale: Locale): Promise<CityDetail | null>;
  getBranch(id: number, locale: Locale): Promise<BranchDetail | null>;
}

export interface PageRepository {
  getPage(id: number, locale: Locale): Promise<StaticPage | null>;
  getPageByKey(key: string, locale: Locale): Promise<StaticPage | null>;
}

/** Panel-side page editing (includes unpublished pages). */
export interface PageAdminRepository {
  list(): Promise<PageListItem[]>;
  get(id: number): Promise<PageEdit | null>;
  saveTranslation(id: number, locale: Locale, patch: PageTranslationPatch): Promise<void>;
  setPublished(id: number, published: boolean): Promise<void>;
  /** Free = no route and no redirect uses this path. */
  isPathFree(path: string): Promise<boolean>;
  isKeyFree(key: string): Promise<boolean>;
  create(input: { key: string; locale: Locale; title: string; path: string }): Promise<number>;
  getNav(locale: Locale): Promise<SiteNav>;
  saveNav(locale: Locale, nav: SiteNav): Promise<void>;
  /** Removes the page and its addresses; each old address becomes 410 Gone. */
  deletePage(id: number): Promise<void>;
  pagePaths(id: number): Promise<string[]>;
}

/** Panel-side menu editing (categories, products, assignments, order). */
export interface CatalogAdminRepository {
  listCategories(): Promise<AdminCategory[]>;
  /** Products in one category (ordered), or all products when categoryId is omitted. Optional text search. */
  listProducts(q: { categoryId?: number | "none"; search?: string; limit: number; offset: number }): Promise<{ items: AdminProductRow[]; total: number }>;
  getProduct(id: number): Promise<AdminProductDetail | null>;
  saveProduct(id: number, patch: AdminProductPatch): Promise<void>;
  setCategoryPublished(id: number, published: boolean): Promise<void>;
  saveAllergens(id: number, data: { allergens: string[]; nutrition: AdminNutrition | null }): Promise<void>;
  /** Writes sort order for products inside one category (ids in display order). */
  reorderProducts(categoryId: number, productIds: number[]): Promise<void>;
  reorderCategories(categoryIds: number[]): Promise<void>;
}

/** Panel-side branch editing. */
export interface BranchAdminRepository {
  listCities(): Promise<AdminCity[]>;
  listBranches(): Promise<AdminBranchRow[]>;
  getBranch(id: number): Promise<AdminBranchDetail | null>;
  saveBranch(id: number, patch: AdminBranchPatch): Promise<void>;
  createBranch(patch: AdminBranchPatch & { cityId: number }): Promise<{ ok: true; id: number; key: string } | { ok: false; error: string }>;
  setStatus(id: number, status: BranchStatus): Promise<void>;
  deleteBranch(id: number): Promise<void>;
}

/** Panel-side media library. */
export interface MediaAdminRepository {
  list(q: MediaQuery): Promise<{ items: MediaItem[]; total: number }>;
  counts(): Promise<Record<MediaKind, number>>;
  usageCounts(): Promise<Record<MediaUsage | "unused" | "all", number>>;
  get(id: number): Promise<MediaItem | null>;
  findBySha(sha256: string): Promise<MediaItem | null>;
  create(m: NewMedia): Promise<MediaItem>;
  saveTexts(id: number, texts: Partial<Record<Locale, MediaTexts>>): Promise<void>;
  setFolder(id: number, folder: MediaUsage | null): Promise<void>;
  /** Where the live site uses this file (panel folder not included). */
  siteUsage(id: number): Promise<MediaUsage[]>;
  delete(id: number): Promise<void>;
}

export interface SettingsRepository {
  getSite(locale: Locale): Promise<SiteSettings>;
}

/** Panel-side search texts (seo_title / seo_description on every translation table). */
export interface SeoAdminRepository {
  listPage(q: SeoQuery): Promise<SeoPage>;
  /** false when that entity has no row in that language. */
  saveTexts(kind: SeoKind, id: number, locale: Locale, texts: SeoTexts): Promise<boolean>;
}

/** Panel-side site texts: the `site` settings row per locale. */
export interface SiteAdminRepository {
  getSiteRaw(locale: Locale): Promise<SiteRaw>;
  setSiteText(locale: Locale, path: string[], value: string): Promise<void>;
  /** Shallow merge of top-level site keys (null removes a value). */
  patchSite(locale: Locale, patch: Record<string, unknown>): Promise<void>;
}

