import type { Locale } from "@doyuyo/i18n";
import { parseTimeRange, type BranchSummary, type OpeningHours } from "../../domain/branch.ts";
import type { BranchRepository, CatalogRepository, MediaAdminRepository, PageAdminRepository, PageRepository, SettingsRepository } from "../ports/repositories.ts";
import { isBuilderPage } from "../../domain/content.ts";
import { NAV_MENUS, type NewPageInput, type PageTranslationPatch, type SiteNav } from "../../domain/page-admin.ts";
import { slugify } from "@doyuyo/i18n";
import { isMediaUsage, type MediaItem, type MediaQuery, type MediaTexts, type MediaUsage, type NewMedia } from "../../domain/media-admin.ts";

/** Read-side use cases. They stay thin: composition and rules, no storage details. */
export class GetHome {
  constructor(
    private readonly pages: PageRepository,
    private readonly catalog: CatalogRepository,
    private readonly branches: BranchRepository,
  ) {}

  async execute(locale: Locale) {
    const [page, categories, featured, branches, cities] = await Promise.all([
      this.pages.getPageByKey("home", locale),
      this.catalog.listCategories(locale),
      this.catalog.featuredProducts(locale, 8),
      this.branches.listBranches(locale),
      this.branches.listCities(locale),
    ]);
    return {
      page,
      categories,
      featured,
      stats: {
        branches: branches.length,
        cities: cities.length,
        countries: new Set(cities.map((c) => c.country)).size,
      },
      branches,
    };
  }
}

export class GetMenu {
  constructor(private readonly catalog: CatalogRepository, private readonly pages: PageRepository) {}
  async execute(locale: Locale) {
    const [categories, page] = await Promise.all([this.catalog.listCategories(locale), this.pages.getPageByKey("menu", locale)]);
    return { categories, page };
  }
}

export class GetCategory {
  constructor(private readonly catalog: CatalogRepository) {}
  execute(id: number, locale: Locale) {
    return this.catalog.getCategory(id, locale);
  }
}

export class GetProduct {
  constructor(private readonly catalog: CatalogRepository) {}
  execute(id: number, locale: Locale) {
    return this.catalog.getProduct(id, locale);
  }
}

export class GetAllergenTable {
  constructor(private readonly catalog: CatalogRepository) {}
  execute(locale: Locale) {
    return this.catalog.allergenTable(locale);
  }
}

export class ListBranches {
  constructor(private readonly branches: BranchRepository, private readonly pages: PageRepository) {}
  async execute(locale: Locale) {
    const [branches, cities, page] = await Promise.all([
      this.branches.listBranches(locale),
      this.branches.listCities(locale),
      this.pages.getPageByKey("branches", locale),
    ]);
    return { branches, cities, page };
  }
}

export class GetCity {
  constructor(private readonly branches: BranchRepository) {}
  execute(id: number, locale: Locale) {
    return this.branches.getCity(id, locale);
  }
}

export class GetBranch {
  constructor(private readonly branches: BranchRepository) {}
  execute(id: number, locale: Locale) {
    return this.branches.getBranch(id, locale);
  }
}

export class GetStaticPage {
  constructor(private readonly pages: PageRepository) {}
  execute(id: number, locale: Locale) {
    return this.pages.getPage(id, locale);
  }
  byKey(key: string, locale: Locale) {
    return this.pages.getPageByKey(key, locale);
  }
}

export class GetSiteSettings {
  constructor(private readonly settings: SettingsRepository) {}
  execute(locale: Locale) {
    return this.settings.getSite(locale);
  }
}

/**
 * Is the branch open at `now` (Europe/Istanbul wall-clock minutes)?
 * Only answers for "every day" style rows with a simple time range; otherwise null (unknown).
 */
export function isOpenNow(hours: OpeningHours[], minutesOfDay: number): boolean | null {
  if (hours.length !== 1) return null;
  const range = parseTimeRange(hours[0]!.time);
  if (!range) return null;
  const m = minutesOfDay < range.open && range.close > 24 * 60 ? minutesOfDay + 24 * 60 : minutesOfDay;
  return m >= range.open && m < range.close;
}

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function nearestBranches(branches: BranchSummary[], from: { lat: number; lng: number }, limit = 5) {
  return branches
    .filter((b) => b.geo)
    .map((b) => ({ branch: b, km: distanceKm(from, b.geo!) }))
    .sort((x, y) => x.km - y.km)
    .slice(0, limit);
}

/** Admin: list, read and edit pages. */
export class ManagePages {
  constructor(private readonly pages: PageAdminRepository) {}
  list() {
    return this.pages.list();
  }
  get(id: number) {
    return this.pages.get(id);
  }
  saveTranslation(id: number, locale: Locale, patch: PageTranslationPatch) {
    const clean: PageTranslationPatch = {
      title: patch.title.trim().slice(0, 200),
      seoTitle: patch.seoTitle.trim().slice(0, 200),
      seoDescription: patch.seoDescription.trim().slice(0, 500),
      sections: patch.sections,
    };
    if (!clean.title) throw new Error("Başlık boş olamaz");
    return this.pages.saveTranslation(id, locale, clean);
  }
  setPublished(id: number, published: boolean) {
    return this.pages.setPublished(id, published);
  }

  /** New content page, saved as a draft. Its address is /{locale}/{slug}. */
  async create(input: NewPageInput): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
    const title = input.title.trim().slice(0, 200);
    if (!title) return { ok: false, error: "Başlık boş olamaz" };
    const slug = slugify(input.slug?.trim() || title).slice(0, 80);
    if (!slug) return { ok: false, error: "Geçerli bir adres oluşturulamadı" };
    const path = `/${input.locale}/${slug}`;
    if (!(await this.pages.isPathFree(path))) return { ok: false, error: `${path} adresi zaten kullanılıyor` };
    let key = `page-${slug}`;
    for (let i = 2; !(await this.pages.isKeyFree(key)); i++) key = `page-${slug}-${i}`;
    return { ok: true, id: await this.pages.create({ key, locale: input.locale, title, path }) };
  }

  getNav(locale: Locale) {
    return this.pages.getNav(locale);
  }

  /**
   * Deletes a content page. Refused for layout-fixed pages, legal texts,
   * and pages still linked from a site menu (menu first, then delete).
   */
  async delete(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
    const page = await this.pages.get(id);
    if (!page) return { ok: false, error: "Sayfa bulunamadı" };
    if (!isBuilderPage(page)) return { ok: false, error: "Bu sayfa sistem sayfası, silinemez. Yayından kaldırabilirsin." };
    const paths = new Set(await this.pages.pagePaths(id));
    for (const locale of Object.keys(page.translations) as Locale[]) {
      const nav = await this.pages.getNav(locale);
      const used = NAV_MENUS.flatMap((m) => nav[m]).some((l) => paths.has(l.href));
      if (used) return { ok: false, error: "Sayfa menülerde kullanılıyor. Önce Site menüleri ekranından linki kaldır." };
    }
    await this.pages.deletePage(id);
    return { ok: true };
  }

  saveNav(locale: Locale, nav: SiteNav) {
    const safe = (h: string) => /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(h);
    const clean = Object.fromEntries(
      NAV_MENUS.map((m) => [
        m,
        (nav[m] ?? [])
          .map((l) => ({ label: String(l.label ?? "").trim().slice(0, 80), href: String(l.href ?? "").trim().slice(0, 300) }))
          .filter((l) => l.label && safe(l.href))
          .slice(0, 30),
      ]),
    ) as SiteNav;
    return this.pages.saveNav(locale, clean);
  }
}

/** Admin: media library (upload, browse, edit texts). */
export class ManageMedia {
  constructor(private readonly media: MediaAdminRepository) {}
  list(q: MediaQuery) {
    return this.media.list({ ...q, limit: Math.min(Math.max(q.limit, 1), 200), offset: Math.max(q.offset, 0) });
  }
  counts() {
    return this.media.counts();
  }
  usageCounts() {
    return this.media.usageCounts();
  }
  get(id: number) {
    return this.media.get(id);
  }
  /** Same bytes uploaded twice reuse the first file. */
  async register(m: NewMedia) {
    const folder = isMediaUsage(m.folder) ? m.folder : null;
    const existing = await this.media.findBySha(m.sha256);
    if (!existing) return this.media.create({ ...m, folder });
    // Re-upload of the same file: keep it, but file it under the chosen group if it had none.
    if (folder && !existing.folder) {
      await this.media.setFolder(existing.id, folder);
      return (await this.media.get(existing.id)) ?? existing;
    }
    return existing;
  }
  /**
   * Deletes a file record only when the site does not use it.
   * Returns the removed item (the caller deletes the stored file) or the places that still use it.
   */
  async delete(id: number): Promise<{ ok: true; item: MediaItem } | { ok: false; usedIn: MediaUsage[] }> {
    const item = await this.media.get(id);
    if (!item) throw new Error("Dosya bulunamadı");
    const usedIn = await this.media.siteUsage(id);
    if (usedIn.length) return { ok: false, usedIn };
    await this.media.delete(id);
    return { ok: true, item };
  }

  setFolder(id: number, folder: MediaUsage | null) {
    return this.media.setFolder(id, isMediaUsage(folder) ? folder : null);
  }
  saveTexts(id: number, texts: Partial<Record<Locale, MediaTexts>>) {
    const clean = Object.fromEntries(
      Object.entries(texts).map(([l, t]) => [l, { alt: (t?.alt ?? "").trim().slice(0, 300), title: (t?.title ?? "").trim().slice(0, 200), caption: (t?.caption ?? "").trim().slice(0, 1000) }]),
    ) as Partial<Record<Locale, MediaTexts>>;
    return this.media.saveTexts(id, clean);
  }
}
