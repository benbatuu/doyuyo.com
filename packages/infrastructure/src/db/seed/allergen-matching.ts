/**
 * Links menu products to rows of the brand's allergen/nutrition PDF.
 *
 * - A single item (e.g. "CAJUN TENDERS") matches its own PDF row.
 * - A combo ("cajun tenders, coleslaw, pesto & cheddar fusilli, patates, ...") is split into its
 *   listed components; each component is matched on its own. Components the PDF has no row for
 *   (choice of sauce, drink) are kept and shown as "not in the table", never guessed.
 * Matching is by normalized name plus the explicit aliases below (spelling differences inside the PDF
 * itself). Nothing is matched by similarity.
 */
import type { LAllergens } from "./legacy-types.ts";

export const norm = (s: string) =>
  s
    .toLocaleUpperCase("tr")
    .replace(/İ/g, "I")
    .replace(/[’']/g, "")
    .replace(/[^A-ZÇĞÖŞÜ0-9]+/g, " ")
    .trim();

/** Menu wording -> PDF wording (both normalized). Only differences in spelling of the same item. */
const ALIASES: Record<string, string> = {
  "ORIGINAL TENDERS": "TENDERS",
  "ORIJINAL TENDERS": "TENDERS",
  "TENDERS ROYALE": "TENDERS ROYAL",
  "CHEESE BURGER": "CHEESEBURGER",
  "DOUBLE CHEESE BURGER": "DOUBLE CHEESEBURGER",
  "SOSLU PATATES CHEDDAR ILAVELI": "SOSLU PATATES CHEDDAR ILAVELI",
  "PESTO CHEDDAR FUSILLI": "PESTO CHEDDAR SOSLU FUSILLI",
  "ACI TATLI CHICKERS PATATES": "ACI TATLI CHICKERS PATATES",
  "BERRY HIBISCUS LIMONATA": "BERRY HIBISCUS",
  "SPICY WINGS 6LI": "SPICY WINGS",
  "SPICY WINGS 6 LI": "SPICY WINGS",
  "SPICY WINGS 9LU": "SPICY WINGS",
  "SPICY WINGS 9 LU": "SPICY WINGS",
  "CAJUN CHEESE CHICKEN SANDVIC": "CAJUN CHEESE CHICKEN SANDVIC",
  "PAPRIKA PARMESAN TENDERS": "PAPRIKA PARMESAN TENDERS",
  "HOT CHICKERS": "ACILI CHICKERS",
  "KETCAP": "KETÇAP",
  "AYRAN": "AYRAN TAM YAĞLI",
};
/** Nutrition table spells a few items differently from the allergen table. */
const NUTRITION_ALIASES: Record<string, string> = {
  TENDERS: "ORIJINAL TENDERS",
  "TENDERS ROYAL": "TENDERS ROYAL SANDVIC",
  "DOUBLE CHEESEBURGER": "DOUBLE CHEESE BURGER",
};

export interface ComponentInfo {
  label: string; // as written in the menu
  quantity: number | null;
  allergenRow: string | null; // PDF row name (allergen table)
  nutritionRow: string | null; // PDF row name (nutrition table)
  allergens: string[];
}

export interface AllergenInfo {
  kind: "single" | "combo" | "none";
  allergens: string[]; // union of matched rows
  nutrition: { name: string; kj: number; kcal: number; fat: number; protein: number; carbs: number } | null; // single items only, per 100 g/ml
  components: ComponentInfo[];
  unmatched: string[]; // listed components the PDF has no row for
}

export function buildMatcher(table: LAllergens) {
  const alg = new Map(table.allergens.map((r) => [norm(r.name), r]));
  const nut = new Map(table.nutrition.filter((r) => r.name).map((r) => [norm(r.name!), r]));
  const resolve = (name: string) => {
    let k = norm(name);
    k = ALIASES[k] ? norm(ALIASES[k]!) : k;
    const a = alg.get(k) ?? null;
    const nk = NUTRITION_ALIASES[k] ? norm(NUTRITION_ALIASES[k]!) : k;
    const n = nut.get(nk) ?? nut.get(k) ?? null;
    return { a, n };
  };

  return (productName: string, shortDescription: string): AllergenInfo => {
    const self = resolve(productName);
    if (self.a || self.n) {
      return {
        kind: "single",
        allergens: self.a?.allergens ?? [],
        nutrition: self.n ? { name: self.n.name!, kj: self.n.kj, kcal: self.n.kcal, fat: self.n.fat, protein: self.n.protein, carbs: self.n.carbs } : null,
        components: [],
        unmatched: [],
      };
    }
    // Combo: "1 cheese chicken sandviç, 1 cajun tenders, coleslaw, patates, ketçap, mayonez, 1 gurme sos + büyük içecek"
    const parts = shortDescription
      .split(/,|\+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 2) return { kind: "none", allergens: [], nutrition: null, components: [], unmatched: [] };
    const components: ComponentInfo[] = parts.map((raw) => {
      const m = raw.match(/^(\d+)\s*(?:x\s*)?(.*)$/i);
      const quantity = m ? Number(m[1]) : null;
      const label = (m ? m[2]! : raw).replace(/^(adet|tane)\s+/i, "").trim();
      const r = resolve(label);
      return { label, quantity, allergenRow: r.a?.name ?? null, nutritionRow: r.n?.name ?? null, allergens: r.a?.allergens ?? [] };
    });
    const allergens = [...new Set(components.flatMap((c) => c.allergens))];
    return {
      kind: "combo",
      allergens,
      nutrition: null,
      components,
      unmatched: components.filter((c) => !c.allergenRow).map((c) => c.label),
    };
  };
}
