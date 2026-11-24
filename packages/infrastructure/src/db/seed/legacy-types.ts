/** Shapes of tools/legacy-import/output/json/*.json (kept local so the seed has no build-time dependency on the tool). */
type L = "tr" | "en";

export interface LNode {
  type: string;
  [k: string]: unknown;
}
export interface LMeta {
  title: string;
  description: string;
  ogImage: string | null;
}
export interface LCategory {
  id: string;
  order: number;
  image: string | null;
  banner: string | null;
  productIds: string[];
  translations: Partial<Record<L, { name: string; slug: string; url: string; description: string; meta: LMeta }>>;
}
export interface LProduct {
  id: string;
  image: string | null;
  cardImage: string | null;
  categoryIds: string[];
  translations: Partial<
    Record<L, { name: string; slug: string; url: string; aliasUrls: string[]; shortDescription: string; description: string; content: LNode[]; imageAlt: string; meta: LMeta }>
  >;
}
export interface LBranch {
  id: string;
  country: { slug: string; name: Partial<Record<L, string>> };
  city: { slug: string; name: Partial<Record<L, string>> } | null;
  district: { slug: string; name: Partial<Record<L, string>> } | null;
  geo: { lat: number; lng: number; source: string } | null;
  mapsUrl: string | null;
  cardImage: string | null;
  translations: Partial<
    Record<L, { name: string; slug: string; url: string; aliasUrls: string[]; address: string; hours: { day: string; time: string }[]; description: LNode[]; meta: LMeta }>
  >;
}
export interface LPage {
  id: string;
  translations: Partial<
    Record<L, { url: string; status: number; banner: { title: string; image: string | null }; sections: { id: string | null; nodes: LNode[] }[]; meta: LMeta }>
  >;
}
export interface LMedia {
  sourceUrl: string;
  localPath: string | null;
  contentType: string;
  width: number | null;
  height: number | null;
  bytes: number;
  sha256: string | null;
}
export interface LSite {
  headerNav: { text: string; href: string }[];
  footerNav: { text: string; href: string }[];
  social: string[];
  copyright: string;
  cookieText: string;
  cookieButton: string;
  logo: string;
  orderPlatforms?: { title: string; text: string; items: { name: string; href: string; logo: string | null }[] };
}
export interface LAllergens {
  source: string;
  allergenColumns: string[];
  allergens: { name: string; section: string; allergens: string[] }[];
  nutrition: { section: string; name: string | null; kj: number; kcal: number; fat: number; protein: number; carbs: number }[];
  notes: string[];
}
export interface LLegacyUrl {
  url: string;
  finalUrl: string;
  type: string;
}
