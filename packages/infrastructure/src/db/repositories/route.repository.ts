import { and, eq, sql } from "drizzle-orm";
import type { Locale } from "@doyuyo/i18n";
import type { EntityRef, EntityType, RouteRepository } from "@doyuyo/core";
import type { Db } from "../client.ts";
import { branches, branchTranslations, media, productTranslations, products, redirects, routes } from "../schema/index.ts";
import { alternatesOf } from "./shared.ts";

export class DrizzleRouteRepository implements RouteRepository {
  constructor(private readonly db: Db) {}

  async findByPath(path: string) {
    const [r] = await this.db.select().from(routes).where(eq(routes.path, path)).limit(1);
    return r ? { type: r.entityType as EntityType, id: r.entityId, locale: r.locale as Locale } : null;
  }

  async findRedirect(path: string) {
    const [r] = await this.db.select().from(redirects).where(eq(redirects.fromPath, path)).limit(1);
    if (!r) return null;
    // Fire-and-forget hit counter for the panel's redirect report.
    void this.db
      .update(redirects)
      .set({ hits: sql`${redirects.hits} + 1` })
      .where(eq(redirects.id, r.id))
      .catch(() => {});
    return { to: r.toPath, status: r.status as 301 | 302 | 410 };
  }

  async listRedirects() {
    const rows = await this.db.select({ from: redirects.fromPath, to: redirects.toPath, status: redirects.status }).from(redirects);
    return rows.map((r) => ({ ...r, status: r.status as 301 | 302 | 410 }));
  }

  async listImages() {
    const prod = await this.db
      .select({ id: products.id, src: media.path, locale: productTranslations.locale, name: productTranslations.name })
      .from(products)
      .innerJoin(media, eq(media.id, products.imageId))
      .innerJoin(productTranslations, eq(productTranslations.productId, products.id));
    const br = await this.db
      .select({ id: branches.id, src: media.path, locale: branchTranslations.locale, name: branchTranslations.name })
      .from(branches)
      .innerJoin(media, eq(media.id, branches.imageId))
      .innerJoin(branchTranslations, eq(branchTranslations.branchId, branches.id));
    const out = new Map<string, { type: "product" | "branch"; id: number; src: string; titles: Partial<Record<Locale, string>> }>();
    for (const [type, rows] of [["product", prod], ["branch", br]] as const) {
      for (const r of rows) {
        const k = `${type}:${r.id}`;
        const e = out.get(k) ?? { type, id: r.id, src: r.src, titles: {} };
        e.titles[r.locale as Locale] = r.name;
        out.set(k, e);
      }
    }
    return [...out.values()];
  }

  alternates(ref: EntityRef) {
    return alternatesOf(this.db, ref.type, ref.id);
  }

  async pathOf(ref: EntityRef, locale: Locale) {
    const [r] = await this.db
      .select({ path: routes.path })
      .from(routes)
      .where(and(eq(routes.entityType, ref.type), eq(routes.entityId, ref.id), eq(routes.locale, locale)))
      .limit(1);
    return r?.path ?? null;
  }

  async listCanonical() {
    const rows = await this.db.select().from(routes);
    return rows.map((r) => ({ locale: r.locale as Locale, path: r.path, type: r.entityType as EntityType, id: r.entityId, updatedAt: r.updatedAt }));
  }
}
