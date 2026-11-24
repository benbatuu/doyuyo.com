import { and, asc, eq, ilike, inArray, notInArray, or, sql, type SQL } from "drizzle-orm";
import { slugify, type Locale } from "@doyuyo/i18n";
import type { AdminCategory, AdminNutrition, AdminProductDetail, AdminProductPatch, AdminProductRow, CatalogAdminRepository } from "@doyuyo/core";
import type { Db } from "../client.ts";
import { categories, categoryTranslations, media, productCategories, productTranslations, products } from "../schema/index.ts";

const LOCALES: Locale[] = ["tr", "en"];

/** Reads allergens + per-100 g nutrition from the stored allergen_info blob (tolerant of missing fields). */
function readInfo(raw: unknown): { allergens: string[]; nutrition: AdminNutrition | null } {
  const v = (raw ?? {}) as { allergens?: unknown; nutrition?: Record<string, unknown> | null };
  const allergens = Array.isArray(v.allergens) ? v.allergens.filter((a): a is string => typeof a === "string") : [];
  const n = v.nutrition;
  const nutrition = n
    ? { kcal: num(n.kcal), kj: num(n.kj), fat: num(n.fat), carbs: num(n.carbs), protein: num(n.protein) }
    : null;
  return { allergens, nutrition };
}
const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);

export class DrizzleCatalogAdminRepository implements CatalogAdminRepository {
  constructor(private readonly db: Db) {}

  async listCategories(): Promise<AdminCategory[]> {
    const [rows, names, counts] = await Promise.all([
      this.db
        .select({ id: categories.id, key: categories.key, sort: categories.sort, published: categories.published, path: media.path })
        .from(categories)
        .leftJoin(media, eq(media.id, categories.imageId))
        .orderBy(asc(categories.sort), asc(categories.id)),
      this.db.select({ id: categoryTranslations.categoryId, name: categoryTranslations.name }).from(categoryTranslations).where(eq(categoryTranslations.locale, "tr")),
      this.db.execute<{ category_id: number; n: string }>(sql`select category_id, count(*) as n from product_categories group by category_id`),
    ]);
    const nameBy = new Map(names.map((n) => [n.id, n.name]));
    const countBy = new Map([...counts].map((c) => [Number(c.category_id), Number(c.n)]));
    return rows.map((r) => ({
      id: r.id,
      key: r.key,
      sort: r.sort,
      published: r.published,
      name: nameBy.get(r.id) ?? r.key,
      productCount: countBy.get(r.id) ?? 0,
      imagePath: r.path ?? null,
    }));
  }

  async listProducts({ categoryId, search, limit, offset }: { categoryId?: number | "none"; search?: string; limit: number; offset: number }) {
    const conds: SQL[] = [];
    if (categoryId === "none") conds.push(sql`not exists (select 1 from ${productCategories} pc where pc.product_id = ${products.id})`);
    else if (typeof categoryId === "number") conds.push(sql`exists (select 1 from ${productCategories} pc where pc.product_id = ${products.id} and pc.category_id = ${categoryId})`);
    if (search) {
      const term = `%${search.replace(/[%_]/g, "")}%`;
      conds.push(or(ilike(productTranslations.name, term), ilike(products.key, term))!);
    }
    const where = conds.length ? and(eq(productTranslations.locale, "tr"), ...conds) : eq(productTranslations.locale, "tr");
    const order = typeof categoryId === "number" ? sql`(select pc.sort from ${productCategories} pc where pc.product_id = ${products.id} and pc.category_id = ${categoryId})` : products.id;
    const [rows, [totals]] = await Promise.all([
      this.db
        .select({ id: products.id, key: products.key, published: products.published, priceKurus: products.priceKurus, showPrice: products.showPrice, name: productTranslations.name, path: media.path, sort: sql<number>`${order}`, info: products.allergenInfo })
        .from(products)
        .innerJoin(productTranslations, eq(productTranslations.productId, products.id))
        .leftJoin(media, eq(media.id, products.imageId))
        .where(where)
        .orderBy(asc(sql`${order}`), asc(products.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ n: sql<number>`count(*)` })
        .from(products)
        .innerJoin(productTranslations, eq(productTranslations.productId, products.id))
        .where(where),
    ]);
    const ids = rows.map((r) => r.id);
    const cats = ids.length ? await this.db.select().from(productCategories).where(inArray(productCategories.productId, ids)).orderBy(asc(productCategories.sort)) : [];
    return {
      total: Number(totals?.n ?? 0),
      items: rows.map((r): AdminProductRow => ({
        id: r.id,
        key: r.key,
        name: r.name,
        published: r.published,
        priceKurus: r.priceKurus,
        showPrice: r.showPrice,
        imagePath: r.path ?? null,
        categoryIds: cats.filter((c) => c.productId === r.id).map((c) => c.categoryId),
        sort: Number(r.sort ?? 0),
        allergens: readInfo(r.info).allergens,
        nutrition: readInfo(r.info).nutrition,
      })),
    };
  }

  async getProduct(id: number): Promise<AdminProductDetail | null> {
    const [p] = await this.db
      .select({ id: products.id, key: products.key, published: products.published, priceKurus: products.priceKurus, showPrice: products.showPrice, spiceLevel: products.spiceLevel, imageId: products.imageId, path: media.path, info: products.allergenInfo })
      .from(products)
      .leftJoin(media, eq(media.id, products.imageId))
      .where(eq(products.id, id));
    if (!p) return null;
    const [trs, cats, catRows] = await Promise.all([
      this.db.select().from(productTranslations).where(eq(productTranslations.productId, id)),
      this.db.select().from(productCategories).where(eq(productCategories.productId, id)).orderBy(asc(productCategories.sort)),
      this.db.select({ id: categories.id, name: categoryTranslations.name, key: categories.key }).from(categories).leftJoin(categoryTranslations, and(eq(categoryTranslations.categoryId, categories.id), eq(categoryTranslations.locale, "tr"))).orderBy(asc(categories.sort)),
    ]);
    return {
      id: p.id,
      key: p.key,
      published: p.published,
      priceKurus: p.priceKurus,
      showPrice: p.showPrice,
      spiceLevel: p.spiceLevel,
      imageId: p.imageId,
      imagePath: p.path ?? null,
      categoryIds: cats.map((c) => c.categoryId),
      allergens: readInfo(p.info).allergens,
      nutrition: readInfo(p.info).nutrition,
      translations: Object.fromEntries(trs.map((t) => [t.locale, { name: t.name, shortDescription: t.shortDescription, description: t.description, imageAlt: t.imageAlt }])),
      allCategories: catRows.map((c) => ({ id: c.id, name: c.name ?? c.key })),
    };
  }

  async saveProduct(id: number, patch: AdminProductPatch) {
    await this.db.transaction(async (tx) => {
      const [cur] = await tx.select({ info: products.allergenInfo }).from(products).where(eq(products.id, id));
      const prev = (cur?.info ?? null) as Record<string, unknown> | null;
      const trName = patch.translations.tr?.name ?? "";
      const hasData = patch.allergens.length > 0 || patch.nutrition !== null;
      // Keep components/unmatched from the imported table; replace allergens and nutrition from the panel.
      const info = {
        kind: (prev?.kind as string) ?? (hasData ? "single" : "none"),
        allergens: patch.allergens,
        nutrition: patch.nutrition ? { name: trName, ...patch.nutrition } : null,
        components: (prev?.components as unknown[]) ?? [],
        unmatched: (prev?.unmatched as string[]) ?? [],
      };
      await tx
        .update(products)
        .set({ published: patch.published, priceKurus: patch.priceKurus, showPrice: patch.showPrice, spiceLevel: patch.spiceLevel, imageId: patch.imageId, allergenInfo: info, updatedAt: new Date() })
        .where(eq(products.id, id));

      for (const l of LOCALES) {
        const t = patch.translations[l];
        if (!t) continue;
        const [existing] = await tx.select({ slug: productTranslations.slug }).from(productTranslations).where(and(eq(productTranslations.productId, id), eq(productTranslations.locale, l)));
        // The slug (URL) stays as it is once it exists; only names and copy change.
        await tx
          .insert(productTranslations)
          .values({ productId: id, locale: l, ...t, slug: existing?.slug ?? (slugify(t.name) || `urun-${id}`) })
          .onConflictDoUpdate({ target: [productTranslations.productId, productTranslations.locale], set: t });
      }

      // Category assignments: first one is primary; existing sort order is kept.
      await tx.delete(productCategories).where(and(eq(productCategories.productId, id), notInArray(productCategories.categoryId, patch.categoryIds)));
      const current = await tx.select().from(productCategories).where(eq(productCategories.productId, id));
      const nextSort = Math.max(0, ...current.map((c) => c.sort)) + 10;
      for (const [i, categoryId] of patch.categoryIds.entries()) {
        const row = current.find((c) => c.categoryId === categoryId);
        await tx
          .insert(productCategories)
          .values({ productId: id, categoryId, sort: row?.sort ?? nextSort + i * 10, isPrimary: i === 0 })
          .onConflictDoUpdate({ target: [productCategories.productId, productCategories.categoryId], set: { isPrimary: i === 0 } });
      }
    });
  }

  async saveAllergens(id: number, data: { allergens: string[]; nutrition: AdminNutrition | null }) {
    await this.db.transaction(async (tx) => {
      const [cur] = await tx.select({ info: products.allergenInfo, name: productTranslations.name }).from(products).leftJoin(productTranslations, and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, "tr"))).where(eq(products.id, id));
      const prev = (cur?.info ?? null) as Record<string, unknown> | null;
      const hasData = data.allergens.length > 0 || data.nutrition !== null;
      const info = {
        kind: (prev?.kind as string) ?? (hasData ? "single" : "none"),
        allergens: data.allergens,
        nutrition: data.nutrition ? { name: cur?.name ?? "", ...data.nutrition } : null,
        components: (prev?.components as unknown[]) ?? [],
        unmatched: (prev?.unmatched as string[]) ?? [],
      };
      await tx.update(products).set({ allergenInfo: info, updatedAt: new Date() }).where(eq(products.id, id));
    });
  }

  async setCategoryPublished(id: number, published: boolean) {
    await this.db.update(categories).set({ published, updatedAt: new Date() }).where(eq(categories.id, id));
  }

  async reorderProducts(categoryId: number, productIds: number[]) {
    await this.db.transaction(async (tx) => {
      for (const [i, pid] of productIds.entries()) {
        await tx.update(productCategories).set({ sort: (i + 1) * 10 }).where(and(eq(productCategories.categoryId, categoryId), eq(productCategories.productId, pid)));
      }
    });
  }

  async reorderCategories(categoryIds: number[]) {
    await this.db.transaction(async (tx) => {
      for (const [i, cid] of categoryIds.entries()) await tx.update(categories).set({ sort: (i + 1) * 10 }).where(eq(categories.id, cid));
    });
  }
}
