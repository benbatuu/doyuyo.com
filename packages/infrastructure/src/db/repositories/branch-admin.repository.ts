import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { localePath, SECTION_SEGMENT, slugify, type Locale } from "@doyuyo/i18n";
import type { AdminBranchDetail, AdminBranchPatch, AdminBranchRow, AdminCity, BranchAdminRepository, BranchStatus, OpeningHours } from "@doyuyo/core";
import type { Db } from "../client.ts";
import { branches, branchTranslations, cities, cityTranslations, media, routes } from "../schema/index.ts";

const LOCALES: Locale[] = ["tr", "en"];

const hoursOf = (v: unknown): OpeningHours[] => (Array.isArray(v) ? v.filter((h) => h && typeof h === "object").map((h) => ({ day: String(h.day ?? ""), time: String(h.time ?? "") })) : []);

export class DrizzleBranchAdminRepository implements BranchAdminRepository {
  constructor(private readonly db: Db) {}

  async listCities(): Promise<AdminCity[]> {
    const [rows, counts] = await Promise.all([
      this.db
        .select({ id: cities.id, key: cities.key, country: cities.country, name: cityTranslations.name })
        .from(cities)
        .leftJoin(cityTranslations, and(eq(cityTranslations.cityId, cities.id), eq(cityTranslations.locale, "tr")))
        .orderBy(asc(cityTranslations.name)),
      this.db.execute<{ city_id: number; n: string }>(sql`select city_id, count(*) as n from branches group by city_id`),
    ]);
    const countBy = new Map([...counts].map((c) => [Number(c.city_id), Number(c.n)]));
    return rows.map((r) => ({ id: r.id, key: r.key, country: r.country, name: r.name ?? r.key, branchCount: countBy.get(r.id) ?? 0 }));
  }

  async listBranches(): Promise<AdminBranchRow[]> {
    const [rows, en] = await Promise.all([
      this.db
        .select({ b: branches, name: branchTranslations.name, address: branchTranslations.address, hours: branchTranslations.hours, cityName: cityTranslations.name, country: cities.country, path: media.path })
        .from(branches)
        .innerJoin(cities, eq(cities.id, branches.cityId))
        .leftJoin(branchTranslations, and(eq(branchTranslations.branchId, branches.id), eq(branchTranslations.locale, "tr")))
        .leftJoin(cityTranslations, and(eq(cityTranslations.cityId, branches.cityId), eq(cityTranslations.locale, "tr")))
        .leftJoin(media, eq(media.id, branches.imageId))
        .orderBy(asc(cityTranslations.name), asc(branchTranslations.name)),
      this.db.select({ id: branchTranslations.branchId }).from(branchTranslations).where(eq(branchTranslations.locale, "en")),
    ]);
    const hasEn = new Set(en.map((r) => r.id));
    return rows.map(({ b, name, address, hours, cityName, country, path }) => ({
      id: b.id,
      key: b.key,
      name: name ?? b.key,
      address: address ?? "",
      district: b.district,
      cityId: b.cityId,
      cityName: cityName ?? "—",
      country,
      status: b.status as BranchStatus,
      hasGeo: b.lat != null && b.lng != null,
      hasEn: hasEn.has(b.id),
      phone: b.phone,
      imagePath: path ?? null,
      hours: hoursOf(hours),
      updatedAt: b.updatedAt.toISOString(),
    }));
  }

  async getBranch(id: number): Promise<AdminBranchDetail | null> {
    const [row] = await this.db
      .select({ b: branches, path: media.path, cityName: cityTranslations.name })
      .from(branches)
      .leftJoin(media, eq(media.id, branches.imageId))
      .leftJoin(cityTranslations, and(eq(cityTranslations.cityId, branches.cityId), eq(cityTranslations.locale, "tr")))
      .where(eq(branches.id, id));
    if (!row) return null;
    const { b } = row;
    const [trs, paths] = await Promise.all([
      this.db.select().from(branchTranslations).where(eq(branchTranslations.branchId, id)),
      this.db.select({ locale: routes.locale, path: routes.path }).from(routes).where(and(eq(routes.entityType, "branch"), inArray(routes.entityId, [id]))),
    ]);
    return {
      id: b.id,
      key: b.key,
      cityId: b.cityId,
      cityName: row.cityName ?? "—",
      status: b.status as BranchStatus,
      district: b.district,
      phone: b.phone,
      lat: b.lat,
      lng: b.lng,
      mapsUrl: b.mapsUrl,
      imageId: b.imageId,
      imagePath: row.path ?? null,
      translations: Object.fromEntries(trs.map((t) => [t.locale, { name: t.name, address: t.address, hours: hoursOf(t.hours) }])),
      paths: Object.fromEntries(paths.map((p) => [p.locale, p.path])) as Partial<Record<Locale, string>>,
    };
  }

  async saveBranch(id: number, patch: AdminBranchPatch) {
    await this.db.transaction(async (tx) => {
      const [cur] = await tx.select({ lat: branches.lat, lng: branches.lng, precise: branches.geoPrecise }).from(branches).where(eq(branches.id, id));
      // Coordinates typed in the panel count as precise; unchanged ones keep their flag.
      const moved = cur?.lat !== patch.lat || cur?.lng !== patch.lng;
      await tx
        .update(branches)
        .set({
          status: patch.status,
          district: patch.district,
          phone: patch.phone,
          lat: patch.lat,
          lng: patch.lng,
          geoPrecise: patch.lat === null ? false : moved ? true : (cur?.precise ?? false),
          mapsUrl: patch.mapsUrl,
          imageId: patch.imageId,
          updatedAt: new Date(),
        })
        .where(eq(branches.id, id));
      for (const [locale, t] of Object.entries(patch.translations)) {
        if (!t) continue;
        const [existing] = await tx.select({ slug: branchTranslations.slug }).from(branchTranslations).where(and(eq(branchTranslations.branchId, id), eq(branchTranslations.locale, locale)));
        // Slug (URL) stays once it exists.
        await tx
          .insert(branchTranslations)
          .values({ branchId: id, locale, name: t.name, address: t.address, hours: t.hours, slug: existing?.slug ?? `sube-${id}` })
          .onConflictDoUpdate({ target: [branchTranslations.branchId, branchTranslations.locale], set: { name: t.name, address: t.address, hours: t.hours } });
      }
    });
  }

  async createBranch(patch: AdminBranchPatch & { cityId: number }): Promise<{ ok: true; id: number; key: string } | { ok: false; error: string }> {
    const trName = patch.translations.tr?.name ?? "";
    const base = slugify(trName.replace(/^Doyuyo!?\s*/i, "")) || "sube";
    // City slugs per locale: a branch path is /{locale}/subeler/{city}/{branch}.
    const citySlugs = await this.db
      .select({ locale: cityTranslations.locale, slug: cityTranslations.slug })
      .from(cityTranslations)
      .where(eq(cityTranslations.cityId, patch.cityId));
    const cityBy = new Map(citySlugs.map((c) => [c.locale, c.slug]));

    const want = LOCALES.filter((l) => patch.translations[l]);
    const plan = want.map((l) => ({ locale: l, path: localePath(l, SECTION_SEGMENT.branches[l], cityBy.get(l) ?? "", slugify(patch.translations[l]!.name.replace(/^Doyuyo!?\s*/i, "")) || base) }));
    for (const p of plan) if (!cityBy.get(p.locale)) return { ok: false, error: `Şehrin ${p.locale === "tr" ? "Türkçe" : "İngilizce"} adresi yok` };
    const taken = await this.db.select({ path: routes.path }).from(routes).where(inArray(routes.path, plan.map((p) => p.path)));
    if (taken.length) return { ok: false, error: "Bu isimde bir şube zaten var. Adı biraz değiştir." };

    // Keys are unique; add -2, -3… when the name is already used.
    let key = `sube-${base}`;
    for (let i = 2; (await this.db.select({ id: branches.id }).from(branches).where(eq(branches.key, key)))[0]; i++) key = `sube-${base}-${i}`;

    const id = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(branches)
        .values({ key, cityId: patch.cityId, status: patch.status, district: patch.district, phone: patch.phone, lat: patch.lat, lng: patch.lng, geoPrecise: patch.lat !== null, mapsUrl: patch.mapsUrl, imageId: patch.imageId })
        .returning({ id: branches.id });
      const bid = row!.id;
      for (const l of want) {
        const t = patch.translations[l]!;
        const slug = slugify(t.name.replace(/^Doyuyo!?\s*/i, "")) || base;
        await tx.insert(branchTranslations).values({ branchId: bid, locale: l, name: t.name, address: t.address, hours: t.hours, slug });
        await tx.insert(routes).values({ locale: l, path: localePath(l, SECTION_SEGMENT.branches[l], cityBy.get(l)!, slug), entityType: "branch", entityId: bid });
      }
      return bid;
    });
    return { ok: true, id, key };
  }

  async deleteBranch(id: number) {
    // Routes are not a foreign key, so they go by hand; translations cascade with the branch.
    await this.db.transaction(async (tx) => {
      await tx.delete(routes).where(and(eq(routes.entityType, "branch"), eq(routes.entityId, id)));
      await tx.delete(branches).where(eq(branches.id, id));
    });
  }

  async setStatus(id: number, status: BranchStatus) {
    await this.db.update(branches).set({ status, updatedAt: new Date() }).where(eq(branches.id, id));
  }
}
