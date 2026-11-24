import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Locale } from "@doyuyo/i18n";
import type { AllergenTable, CatalogRepository, ProductAllergenInfo, CategoryDetail, CategorySummary, ContentNode, ProductDetail, ProductSummary } from "@doyuyo/core";
import type { Db } from "../client.ts";
import { categories, categoryTranslations, productCategories, products, productTranslations, settings } from "../schema/index.ts";
import { alternatesOf, loadMedia, pathsOf, withAlt } from "./shared.ts";

export class DrizzleCatalogRepository implements CatalogRepository {
  constructor(private readonly db: Db) {}

  async listCategories(locale: Locale): Promise<CategorySummary[]> {
    const rows = await this.db
      .select({
        id: categories.id,
        key: categories.key,
        imageId: categories.imageId,
        name: categoryTranslations.name,
        description: categoryTranslations.description,
        // Representative photo: the first product's image (old category covers are text-only graphics).
        heroImageId: sql<number | null>`(select coalesce(p.image_id, p.card_image_id) from ${productCategories} pc
          join ${products} p on p.id = pc.product_id where pc.category_id = ${categories.id} order by pc.sort limit 1)`,
        count: sql<number>`(select count(*)::int from ${productCategories} pc
          join ${productTranslations} pt on pt.product_id = pc.product_id and pt.locale = ${locale}
          where pc.category_id = ${categories.id})`,
      })
      .from(categories)
      .innerJoin(categoryTranslations, and(eq(categoryTranslations.categoryId, categories.id), eq(categoryTranslations.locale, locale)))
      .where(eq(categories.published, true))
      .orderBy(asc(categories.sort));
    const [paths, media] = await Promise.all([pathsOf(this.db, "category", rows.map((r) => r.id), locale), loadMedia(this.db, rows.map((r) => r.heroImageId ?? r.imageId), locale)]);
    return rows.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      description: r.description,
      path: paths.get(r.id) ?? "",
      image: withAlt(media.get(r.heroImageId ?? r.imageId ?? -1), r.name),
      productCount: r.count,
    }));
  }

  private async productSummaries(ids: number[], locale: Locale): Promise<Map<number, ProductSummary>> {
    if (!ids.length) return new Map();
    const rows = await this.db
      .select({
        id: products.id,
        key: products.key,
        imageId: products.imageId,
        cardImageId: products.cardImageId,
        name: productTranslations.name,
        shortDescription: productTranslations.shortDescription,
        imageAlt: productTranslations.imageAlt,
      })
      .from(products)
      .innerJoin(productTranslations, and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, locale)))
      .where(and(inArray(products.id, ids), eq(products.published, true)));
    const [paths, media] = await Promise.all([
      pathsOf(this.db, "product", rows.map((r) => r.id), locale),
      loadMedia(this.db, rows.flatMap((r) => [r.imageId, r.cardImageId]), locale),
    ]);
    return new Map(
      rows.map((r) => [
        r.id,
        {
          id: r.id,
          key: r.key,
          name: r.name,
          shortDescription: r.shortDescription,
          path: paths.get(r.id) ?? "",
          // Detail image is the 2508px original; cards use it too (next/image resizes).
          image: withAlt(media.get(r.imageId ?? -1) ?? media.get(r.cardImageId ?? -1), r.imageAlt || r.name),
        },
      ]),
    );
  }

  private async productIdsIn(categoryId: number) {
    const rows = await this.db
      .select({ id: productCategories.productId })
      .from(productCategories)
      .where(eq(productCategories.categoryId, categoryId))
      .orderBy(asc(productCategories.sort));
    return rows.map((r) => r.id);
  }

  async getCategory(id: number, locale: Locale): Promise<CategoryDetail | null> {
    const all = await this.listCategories(locale);
    const idx = all.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    const [row] = await this.db
      .select()
      .from(categoryTranslations)
      .innerJoin(categories, eq(categories.id, categoryTranslations.categoryId))
      .where(and(eq(categoryTranslations.categoryId, id), eq(categoryTranslations.locale, locale)));
    if (!row) return null;
    const ids = await this.productIdsIn(id);
    const summaries = await this.productSummaries(ids, locale);
    const banner = await loadMedia(this.db, [row.categories.bannerId], locale);
    return {
      ...all[idx]!,
      banner: row.categories.bannerId ? (banner.get(row.categories.bannerId) ?? null) : null,
      products: ids.map((i) => summaries.get(i)).filter((p): p is ProductSummary => !!p),
      previous: all[idx - 1] ?? null,
      next: all[idx + 1] ?? null,
      seo: { title: row.category_translations.seoTitle, description: row.category_translations.seoDescription, ogImage: null },
      alternates: await alternatesOf(this.db, "category", id),
    };
  }

  async getProduct(id: number, locale: Locale): Promise<ProductDetail | null> {
    const [row] = await this.db
      .select()
      .from(productTranslations)
      .where(and(eq(productTranslations.productId, id), eq(productTranslations.locale, locale)));
    if (!row) return null;
    const summary = (await this.productSummaries([id], locale)).get(id);
    if (!summary) return null;
    const [base] = await this.db.select({ allergenInfo: products.allergenInfo }).from(products).where(eq(products.id, id));
    const links = await this.db.select().from(productCategories).where(eq(productCategories.productId, id));
    const cats = await this.listCategories(locale);
    const primaryId = links.find((l) => l.isPrimary)?.categoryId ?? links[0]?.categoryId;
    const category = cats.find((c) => c.id === primaryId);
    if (!category) return null;
    const siblingIds = (await this.productIdsIn(category.id)).filter((x) => x !== id).slice(0, 4);
    const related = await this.productSummaries(siblingIds, locale);
    return {
      ...summary,
      description: row.description,
      allergenInfo: (base?.allergenInfo as ProductAllergenInfo | null) ?? null,
      content: row.content as ContentNode[],
      category,
      otherCategories: cats.filter((c) => c.id !== category.id && links.some((l) => l.categoryId === c.id)),
      related: siblingIds.map((i) => related.get(i)).filter((p): p is ProductSummary => !!p),
      seo: { title: row.seoTitle, description: row.seoDescription, ogImage: summary.image?.src ?? null },
      alternates: await alternatesOf(this.db, "product", id),
    };
  }

  async featuredProducts(locale: Locale, limit: number): Promise<ProductSummary[]> {
    // First product of each category, in menu order: a real cross-section of the menu.
    const rows = await this.db
      .select({ productId: productCategories.productId, categoryId: productCategories.categoryId })
      .from(productCategories)
      .innerJoin(categories, eq(categories.id, productCategories.categoryId))
      .orderBy(asc(categories.sort), asc(productCategories.sort));
    const picked: number[] = [];
    const seenCat = new Set<number>();
    for (const r of rows) {
      if (seenCat.has(r.categoryId) || picked.includes(r.productId)) continue;
      seenCat.add(r.categoryId);
      picked.push(r.productId);
    }
    const summaries = await this.productSummaries(picked.slice(0, limit), locale);
    return picked
      .slice(0, limit)
      .map((i) => summaries.get(i))
      .filter((p): p is ProductSummary => !!p);
  }

  async allergenTable(_locale: Locale): Promise<AllergenTable | null> {
    const [row] = await this.db.select().from(settings).where(and(eq(settings.key, "allergens"), eq(settings.locale, "*")));
    if (!row) return null;
    const v = row.value as Omit<AllergenTable, "pdf"> & { pdfMediaId: number | null };
    const pdf = v.pdfMediaId ? ((await loadMedia(this.db, [v.pdfMediaId], _locale)).get(v.pdfMediaId) ?? null) : null;
    return { columns: v.columns, rows: v.rows, nutrition: v.nutrition, notes: v.notes, pdf };
  }
}
