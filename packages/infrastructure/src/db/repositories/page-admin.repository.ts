import { and, eq, inArray, sql } from "drizzle-orm";
import type { Locale } from "@doyuyo/i18n";
import type { ContentSection, NavLink, PageAdminRepository, PageEdit, PageListItem, PageTranslationPatch, SiteNav } from "@doyuyo/core";
import type { Db } from "../client.ts";
import { pages, pageTranslations, redirects, routes, settings } from "../schema/index.ts";

const ROUTE_TYPES = ["page", "home", "menu", "branches"] as const;
const routeTypeOf = (template: string) => (template === "home" || template === "menu" || template === "branches" ? template : "page");

export class DrizzlePageAdminRepository implements PageAdminRepository {
  constructor(private readonly db: Db) {}

  private async paths(ids: number[]) {
    if (!ids.length) return new Map<string, string>();
    const rows = await this.db
      .select({ id: routes.entityId, type: routes.entityType, locale: routes.locale, path: routes.path })
      .from(routes)
      .where(and(inArray(routes.entityId, ids), inArray(routes.entityType, [...ROUTE_TYPES])));
    return new Map(rows.map((r) => [`${r.type}:${r.id}:${r.locale}`, r.path]));
  }

  async list(): Promise<PageListItem[]> {
    const [rows, trs] = await Promise.all([
      this.db.select().from(pages).orderBy(pages.id),
      this.db.select({ pageId: pageTranslations.pageId, locale: pageTranslations.locale, title: pageTranslations.title }).from(pageTranslations),
    ]);
    const paths = await this.paths(rows.map((r) => r.id));
    return rows.map((p) => ({
      id: p.id,
      key: p.key,
      template: p.template,
      published: p.published,
      updatedAt: p.updatedAt,
      locales: Object.fromEntries(
        trs
          .filter((t) => t.pageId === p.id)
          .map((t) => [t.locale, { title: t.title, path: paths.get(`${routeTypeOf(p.template)}:${p.id}:${t.locale}`) ?? null }]),
      ),
    }));
  }

  async get(id: number): Promise<PageEdit | null> {
    const [p] = await this.db.select().from(pages).where(eq(pages.id, id));
    if (!p) return null;
    const [trs, paths] = await Promise.all([this.db.select().from(pageTranslations).where(eq(pageTranslations.pageId, id)), this.paths([id])]);
    return {
      id: p.id,
      key: p.key,
      template: p.template,
      published: p.published,
      updatedAt: p.updatedAt,
      translations: Object.fromEntries(
        trs.map((t) => [
          t.locale,
          {
            title: t.title,
            seoTitle: t.seoTitle,
            seoDescription: t.seoDescription,
            sections: t.sections as ContentSection[],
            path: paths.get(`${routeTypeOf(p.template)}:${id}:${t.locale}`) ?? null,
          },
        ]),
      ),
    };
  }

  async saveTranslation(id: number, locale: Locale, patch: PageTranslationPatch) {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(pageTranslations)
        .values({ pageId: id, locale, ...patch })
        .onConflictDoUpdate({ target: [pageTranslations.pageId, pageTranslations.locale], set: patch });
      await tx.update(pages).set({ updatedAt: new Date() }).where(eq(pages.id, id));
    });
  }

  async setPublished(id: number, published: boolean) {
    await this.db.update(pages).set({ published, updatedAt: new Date() }).where(eq(pages.id, id));
  }

  async isPathFree(path: string) {
    const [r] = await this.db.select({ id: routes.id }).from(routes).where(eq(routes.path, path)).limit(1);
    const [d] = await this.db.select({ id: redirects.id }).from(redirects).where(eq(redirects.fromPath, path)).limit(1);
    return !r && !d;
  }

  async isKeyFree(key: string) {
    const [p] = await this.db.select({ id: pages.id }).from(pages).where(eq(pages.key, key)).limit(1);
    return !p;
  }

  /** New pages start as drafts with one empty content section. */
  async create({ key, locale, title, path }: { key: string; locale: Locale; title: string; path: string }) {
    return this.db.transaction(async (tx) => {
      const [p] = await tx.insert(pages).values({ key, template: "static", published: false }).returning({ id: pages.id });
      await tx.insert(pageTranslations).values({ pageId: p!.id, locale, title, sections: [] });
      await tx.insert(routes).values({ locale, path, entityType: "page", entityId: p!.id });
      return p!.id;
    });
  }

  async pagePaths(id: number) {
    const rows = await this.db.select({ path: routes.path }).from(routes).where(and(eq(routes.entityType, "page"), eq(routes.entityId, id)));
    return rows.map((r) => r.path);
  }

  async deletePage(id: number) {
    await this.db.transaction(async (tx) => {
      const paths = await tx.select({ path: routes.path }).from(routes).where(and(eq(routes.entityType, "page"), eq(routes.entityId, id)));
      for (const { path } of paths) {
        await tx.insert(redirects).values({ fromPath: path, toPath: "", status: 410, source: "deleted-page" }).onConflictDoUpdate({ target: redirects.fromPath, set: { toPath: "", status: 410, source: "deleted-page" } });
      }
      await tx.delete(routes).where(and(eq(routes.entityType, "page"), eq(routes.entityId, id)));
      await tx.delete(pages).where(eq(pages.id, id));
    });
  }

  async getNav(locale: Locale): Promise<SiteNav> {
    const [row] = await this.db.select({ value: settings.value }).from(settings).where(and(eq(settings.key, "site"), eq(settings.locale, locale)));
    const v = (row?.value ?? {}) as { headerNav?: NavLink[]; footerNav?: NavLink[]; legalNav?: NavLink[] };
    return { header: v.headerNav ?? [], footer: v.footerNav ?? [], legal: v.legalNav ?? [] };
  }

  /** Only the three nav arrays change; the rest of the site settings stay as they are. */
  async saveNav(locale: Locale, nav: SiteNav) {
    const patch = { headerNav: nav.header, footerNav: nav.footer, legalNav: nav.legal };
    const updated = await this.db
      .update(settings)
      .set({ value: sql`${settings.value} || ${JSON.stringify(patch)}::jsonb`, updatedAt: new Date() })
      .where(and(eq(settings.key, "site"), eq(settings.locale, locale)))
      .returning({ key: settings.key });
    if (!updated.length) throw new Error(`site settings missing for ${locale}`);
  }
}
