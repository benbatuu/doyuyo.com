import type { Locale } from "@doyuyo/i18n";
import { ALLERGEN_NAMES, type AdminNutrition, type AdminProductPatch } from "../../domain/catalog-admin.ts";
import type { CatalogAdminRepository } from "../ports/repositories.ts";

const LOCALES: Locale[] = ["tr", "en"];
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

const num = (v: unknown, max: number) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 100) / 100 : undefined;
};
/** Clean nutrition: null when all empty, all five values when filled, undefined when invalid or partial. */
function cleanNutrition(n: AdminNutrition): AdminNutrition | null | undefined {
  const out = { kcal: num(n.kcal, 2000), kj: num(n.kj, 9000), fat: num(n.fat, 100), carbs: num(n.carbs, 100), protein: num(n.protein, 100) };
  if (Object.values(out).some((v) => v === undefined)) return undefined;
  if (Object.values(out).every((v) => v === null)) return null;
  // The site needs all five values; a partial row would show gaps.
  if (Object.values(out).some((v) => v === null)) return undefined;
  return out as AdminNutrition;
}

/** Panel: menu editing. Rules (what a product may look like) live here, not in the UI. */
export class ManageCatalog {
  constructor(private readonly catalog: CatalogAdminRepository) {}

  categories() {
    return this.catalog.listCategories();
  }

  products(q: Parameters<CatalogAdminRepository["listProducts"]>[0]) {
    return this.catalog.listProducts({ ...q, limit: Math.min(Math.max(q.limit, 1), 200), offset: Math.max(q.offset, 0) });
  }

  product(id: number) {
    return this.catalog.getProduct(id);
  }

  async saveProduct(id: number, input: AdminProductPatch): Promise<{ ok: true } | { ok: false; error: string }> {
    const current = await this.catalog.getProduct(id);
    if (!current) return { ok: false, error: "Ürün bulunamadı" };
    if (input.categoryIds.length === 0) return { ok: false, error: "En az bir kategori seçmelisin" };
    const allowed = new Set(current.allCategories.map((c) => c.id));
    if (input.categoryIds.some((c) => !allowed.has(c))) return { ok: false, error: "Geçersiz kategori" };
    const trName = str(input.translations.tr?.name, 120);
    if (!trName) return { ok: false, error: "Türkçe ad boş olamaz" };
    if (input.priceKurus !== null && (!Number.isInteger(input.priceKurus) || input.priceKurus < 0 || input.priceKurus > 100_000_00)) {
      return { ok: false, error: "Fiyat geçersiz" };
    }
    const translations: AdminProductPatch["translations"] = {};
    for (const l of LOCALES) {
      const t = input.translations[l];
      if (!t) continue;
      translations[l] = {
        name: str(t.name, 120),
        shortDescription: str(t.shortDescription, 300),
        description: str(t.description, 3000),
        imageAlt: str(t.imageAlt, 300),
      };
    }
    if (!translations.tr?.name) return { ok: false, error: "Türkçe ad boş olamaz" };
    const allergens = [...new Set(input.allergens)].filter((a) => (ALLERGEN_NAMES as readonly string[]).includes(a));
    const nutrition = input.nutrition ? cleanNutrition(input.nutrition) : null;
    if (input.nutrition && nutrition === undefined) return { ok: false, error: "Besin değerleri geçersiz" };
    await this.catalog.saveProduct(id, {
      allergens,
      nutrition: nutrition ?? null,
      published: !!input.published,
      priceKurus: input.priceKurus,
      showPrice: !!input.showPrice && input.priceKurus !== null,
      spiceLevel: input.spiceLevel !== null && Number.isInteger(input.spiceLevel) && input.spiceLevel >= 0 && input.spiceLevel <= 5 ? input.spiceLevel : null,
      imageId: input.imageId,
      categoryIds: [...new Set(input.categoryIds)],
      translations,
    });
    return { ok: true };
  }

  /** Allergens + 100 g nutrition only. Other product fields are not touched. */
  async saveAllergens(id: number, input: { allergens: string[]; nutrition: AdminNutrition | null }): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!(await this.catalog.getProduct(id))) return { ok: false, error: "Ürün bulunamadı" };
    const allergens = [...new Set(input.allergens)].filter((a) => (ALLERGEN_NAMES as readonly string[]).includes(a));
    const nutrition = input.nutrition ? cleanNutrition(input.nutrition) : null;
    if (input.nutrition && nutrition === undefined) return { ok: false, error: "Besin değerleri eksik ya da geçersiz. Beş değeri birlikte gir." };
    await this.catalog.saveAllergens(id, { allergens, nutrition: nutrition ?? null });
    return { ok: true };
  }

  setCategoryPublished(id: number, published: boolean) {
    return this.catalog.setCategoryPublished(id, published);
  }

  reorderProducts(categoryId: number, productIds: number[]) {
    return this.catalog.reorderProducts(categoryId, [...new Set(productIds)]);
  }

  reorderCategories(categoryIds: number[]) {
    return this.catalog.reorderCategories([...new Set(categoryIds)]);
  }
}

