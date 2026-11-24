import type { Locale } from "@doyuyo/i18n";

/** The 14 EU allergens, as printed in the brand table (Turkish). */
export const ALLERGEN_NAMES = ["Gluten", "Yumurta", "Balık", "Yer Fıstığı", "Kabuklular", "Sert Kabuklu Meyveler", "Soya", "Süt", "Kereviz", "Hardal", "Susam", "Sülfitler", "Acı Bakla", "Yumuşakçalar"] as const;

/** Per 100 g (or 100 ml). Null = unknown. */
export interface AdminNutrition {
  kcal: number | null;
  kj: number | null;
  fat: number | null;
  carbs: number | null;
  protein: number | null;
}

/** Category row for the panel's menu editor. */
export interface AdminCategory {
  id: number;
  key: string;
  sort: number;
  published: boolean;
  /** Panel name (Turkish), falls back to the key. */
  name: string;
  productCount: number;
  imagePath: string | null;
}

/** Product row for lists. */
export interface AdminProductRow {
  id: number;
  key: string;
  name: string;
  published: boolean;
  priceKurus: number | null;
  showPrice: boolean;
  imagePath: string | null;
  /** Category ids in order; first is the primary one. */
  categoryIds: number[];
  sort: number;
  allergens: string[];
  nutrition: AdminNutrition | null;
}

/** Everything the product sheet edits, across locales. */
export interface AdminProductDetail {
  id: number;
  key: string;
  published: boolean;
  priceKurus: number | null;
  showPrice: boolean;
  spiceLevel: number | null;
  imageId: number | null;
  imagePath: string | null;
  categoryIds: number[];
  allergens: string[];
  nutrition: AdminNutrition | null;
  translations: Partial<Record<Locale, { name: string; shortDescription: string; description: string; imageAlt: string }>>;
  allCategories: { id: number; name: string }[];
}

export interface AdminProductPatch {
  published: boolean;
  priceKurus: number | null;
  showPrice: boolean;
  spiceLevel: number | null;
  imageId: number | null;
  categoryIds: number[];
  allergens: string[];
  nutrition: AdminNutrition | null;
  translations: Partial<Record<Locale, { name: string; shortDescription: string; description: string; imageAlt: string }>>;
}
