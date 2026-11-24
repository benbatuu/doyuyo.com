import { and, eq } from "drizzle-orm";
import type { Locale } from "@doyuyo/i18n";
import type { ContentSection, EntityType, OrderPlatform, PageRepository, SettingsRepository, SiteSettings, StaticPage } from "@doyuyo/core";
import type { Db } from "../client.ts";
import { pages, pageTranslations, routes, settings } from "../schema/index.ts";
import { alternatesOf, loadMedia } from "./shared.ts";

export class DrizzlePageRepository implements PageRepository {
  constructor(private readonly db: Db) {}

  private async load(where: ReturnType<typeof eq>, locale: Locale): Promise<StaticPage | null> {
    const [row] = await this.db
      .select({ p: pages, t: pageTranslations })
      .from(pages)
      .innerJoin(pageTranslations, and(eq(pageTranslations.pageId, pages.id), eq(pageTranslations.locale, locale)))
      .where(and(where, eq(pages.published, true)))
      .limit(1);
    if (!row) return null;
    const type: EntityType = row.p.template === "home" || row.p.template === "menu" || row.p.template === "branches" ? row.p.template : "page";
    const [r] = await this.db
      .select({ path: routes.path })
      .from(routes)
      .where(and(eq(routes.entityType, type), eq(routes.entityId, row.p.id), eq(routes.locale, locale)));
    const banner = row.p.bannerId ? ((await loadMedia(this.db, [row.p.bannerId], locale)).get(row.p.bannerId) ?? null) : null;
    return {
      id: row.p.id,
      key: row.p.key,
      title: row.t.title,
      path: r?.path ?? "",
      banner,
      sections: row.t.sections as ContentSection[],
      seo: { title: row.t.seoTitle, description: row.t.seoDescription, ogImage: banner?.src ?? null },
      alternates: await alternatesOf(this.db, type, row.p.id),
    };
  }

  getPage(id: number, locale: Locale) {
    return this.load(eq(pages.id, id), locale);
  }
  getPageByKey(key: string, locale: Locale) {
    return this.load(eq(pages.key, key), locale);
  }
}

interface StoredSite {
  logoMediaId: number | null;
  partnerLogoMediaId: number | null;
  headerNav: { label: string; href: string }[];
  footerNav: { label: string; href: string }[];
  legalNav: { label: string; href: string }[];
  social: { network: string; href: string }[];
  phone: { label: string; href: string } | null;
  headOffice: { address: string; mapsUrl: string | null } | null;
  orderPlatforms: { title: string; text: string; items: { name: string; href: string; logoMediaId: number | null }[] };
  cookie: { text: string; button: string };
  copyright: string;
  email?: string;
}

export class DrizzleSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Db) {}

  async getSite(locale: Locale): Promise<SiteSettings> {
    const [row] = await this.db.select().from(settings).where(and(eq(settings.key, "site"), eq(settings.locale, locale)));
    if (!row) throw new Error(`site settings missing for ${locale}`);
    const v = row.value as StoredSite;
    const media = await loadMedia(this.db, [v.logoMediaId, v.partnerLogoMediaId, ...v.orderPlatforms.items.map((i) => i.logoMediaId)], locale);
    const m = (id: number | null, alt: string) => (id && media.get(id) ? { ...media.get(id)!, alt } : null);
    return {
      logo: m(v.logoMediaId, "Doyuyo!"),
      partnerLogo: m(v.partnerLogoMediaId, "PardoFood"),
      headerNav: v.headerNav,
      footerNav: v.footerNav,
      legalNav: v.legalNav,
      social: v.social,
      phone: v.phone,
      headOffice: v.headOffice,
      orderPlatforms: {
        title: v.orderPlatforms.title,
        text: v.orderPlatforms.text,
        items: v.orderPlatforms.items.map((i): OrderPlatform => ({ name: i.name, href: i.href, logo: m(i.logoMediaId, i.name) })),
      },
      cookie: v.cookie,
      copyright: v.copyright,
      email: v.email || null,
    };
  }
}
