import { and, asc, eq } from "drizzle-orm";
import type { Locale } from "@doyuyo/i18n";
import { distanceKm, type BranchDetail, type BranchRepository, type BranchSummary, type CityDetail, type CitySummary, type ContentNode, type OpeningHours } from "@doyuyo/core";
import type { Db } from "../client.ts";
import { branches, branchTranslations, cities, cityTranslations } from "../schema/index.ts";
import { alternatesOf, loadMedia, pathsOf, withAlt } from "./shared.ts";

export class DrizzleBranchRepository implements BranchRepository {
  constructor(private readonly db: Db) {}

  private async summaries(locale: Locale, where?: ReturnType<typeof eq>): Promise<(BranchSummary & { cityId: number })[]> {
    const rows = await this.db
      .select({ b: branches, t: branchTranslations, cityName: cityTranslations.name, country: cities.country })
      .from(branches)
      .innerJoin(branchTranslations, and(eq(branchTranslations.branchId, branches.id), eq(branchTranslations.locale, locale)))
      .innerJoin(cityTranslations, and(eq(cityTranslations.cityId, branches.cityId), eq(cityTranslations.locale, locale)))
      .innerJoin(cities, eq(cities.id, branches.cityId))
      .where(where ? and(eq(branches.status, "open"), where) : eq(branches.status, "open"))
      .orderBy(asc(cityTranslations.name), asc(branchTranslations.name));
    const [paths, cityPaths, media] = await Promise.all([
      pathsOf(this.db, "branch", rows.map((r) => r.b.id), locale),
      pathsOf(this.db, "city", [...new Set(rows.map((r) => r.b.cityId))], locale),
      loadMedia(this.db, rows.map((r) => r.b.imageId), locale),
    ]);
    return rows.map(({ b, t, cityName, country }) => ({
      id: b.id,
      key: b.key,
      country,
      cityId: b.cityId,
      name: t.name,
      path: paths.get(b.id) ?? "",
      address: t.address,
      hours: t.hours as OpeningHours[],
      city: { name: cityName, path: cityPaths.get(b.cityId) ?? "" },
      district: b.district,
      geo: b.lat != null && b.lng != null ? { lat: b.lat, lng: b.lng, precise: b.geoPrecise } : null,
      mapsUrl: b.mapsUrl,
      image: withAlt(b.imageId ? media.get(b.imageId) : null, t.name),
    }));
  }

  async listBranches(locale: Locale): Promise<BranchSummary[]> {
    return (await this.summaries(locale)).map(({ cityId: _c, ...b }) => b);
  }

  async listCities(locale: Locale): Promise<CitySummary[]> {
    const rows = await this.db
      .select({ c: cities, name: cityTranslations.name })
      .from(cities)
      .innerJoin(cityTranslations, and(eq(cityTranslations.cityId, cities.id), eq(cityTranslations.locale, locale)))
      .orderBy(asc(cityTranslations.name));
    const all = await this.summaries(locale);
    const paths = await pathsOf(this.db, "city", rows.map((r) => r.c.id), locale);
    return rows
      .map(({ c, name }) => ({ id: c.id, key: c.key, name, path: paths.get(c.id) ?? "", country: c.country, branchCount: all.filter((b) => b.cityId === c.id).length }))
      .filter((c) => c.branchCount > 0);
  }

  async getCity(id: number, locale: Locale): Promise<CityDetail | null> {
    const city = (await this.listCities(locale)).find((c) => c.id === id);
    if (!city) return null;
    const [t] = await this.db.select().from(cityTranslations).where(and(eq(cityTranslations.cityId, id), eq(cityTranslations.locale, locale)));
    return {
      ...city,
      branches: (await this.summaries(locale, eq(branches.cityId, id))).map(({ cityId: _c, ...b }) => b),
      seo: { title: t?.seoTitle ?? "", description: t?.seoDescription ?? "", ogImage: null },
      alternates: await alternatesOf(this.db, "city", id),
    };
  }

  async getBranch(id: number, locale: Locale): Promise<BranchDetail | null> {
    const [row] = await this.db
      .select()
      .from(branchTranslations)
      .where(and(eq(branchTranslations.branchId, id), eq(branchTranslations.locale, locale)));
    if (!row) return null;
    const all = await this.summaries(locale);
    const me = all.find((b) => b.id === id);
    if (!me) return null;
    const nearby = me.geo
      ? all
          .filter((b) => b.id !== id && b.geo)
          .sort((a, b) => distanceKm(me.geo!, a.geo!) - distanceKm(me.geo!, b.geo!))
          .slice(0, 3)
      : all.filter((b) => b.id !== id && b.cityId === me.cityId).slice(0, 3);
    const { cityId: _c, ...summary } = me;
    return {
      ...summary,
      description: row.description as ContentNode[],
      nearby: nearby.map(({ cityId: _x, ...b }) => b),
      seo: { title: row.seoTitle, description: row.seoDescription, ogImage: me.image?.src ?? null },
      alternates: await alternatesOf(this.db, "branch", id),
    };
  }
}


