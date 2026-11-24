import type { Alternates, ContentNode, Media, Seo } from "./content.ts";

export interface CategorySummary {
  id: number;
  key: string;
  name: string;
  description: string;
  path: string;
  image: Media | null;
  productCount: number;
}

export interface ProductSummary {
  id: number;
  key: string;
  name: string;
  shortDescription: string;
  path: string;
  image: Media | null;
}

export interface CategoryDetail extends CategorySummary {
  banner: Media | null;
  products: ProductSummary[];
  previous: CategorySummary | null;
  next: CategorySummary | null;
  seo: Seo;
  alternates: Alternates;
}

/** Allergen/nutrition facts for one product, matched from the brand's PDF table. */
export interface ProductAllergenInfo {
  kind: "single" | "combo" | "none";
  allergens: string[];
  /** Per 100 g / 100 ml, single items only. */
  nutrition: { name: string; kj: number; kcal: number; fat: number; protein: number; carbs: number } | null;
  components: { label: string; quantity: number | null; allergenRow: string | null; nutritionRow: string | null; allergens: string[] }[];
  unmatched: string[];
}

export interface ProductDetail extends ProductSummary {
  allergenInfo: ProductAllergenInfo | null;
  description: string;
  content: ContentNode[];
  category: CategorySummary;
  otherCategories: CategorySummary[];
  related: ProductSummary[];
  seo: Seo;
  alternates: Alternates;
}

export interface AllergenRow {
  name: string;
  section: string;
  allergens: string[];
}

export interface NutritionRow {
  section: string;
  name: string | null;
  kj: number;
  kcal: number;
  fat: number;
  protein: number;
  carbs: number;
}

export interface AllergenTable {
  columns: string[];
  rows: AllergenRow[];
  nutrition: NutritionRow[];
  notes: string[];
  pdf: Media | null;
}
