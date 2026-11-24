import type { BranchDetail, BranchSummary, CategoryDetail, CategorySummary, CitySummary, ProductDetail, SiteSettings } from "@doyuyo/core";
import { openingHoursSpec } from "./hours.ts";
import { plain, shortBranchName } from "./text.ts";

export type Json = Record<string, unknown>;

/** Facts taken from the old site's text: founded 2019 at Özdilek Park İstanbul by PardoFood. */
const FOUNDING_YEAR = "2019";
const PARDOFOOD = { "@type": "Organization", name: "PardoFood", url: "https://www.pardofood.com" };
const COUNTRY: Record<string, string> = { turkiye: "TR", uae: "AE" };

export const graph = (...items: Json[]): Json => ({ "@context": "https://schema.org", "@graph": items });
const clean = <T extends Json>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length))) as T;
const abs = (base: string, p: string | null | undefined) => (p ? (p.startsWith("http") ? p : `${base}${p}`) : undefined);

export const orgId = (base: string) => `${base}/#organization`;
export const websiteId = (base: string) => `${base}/#website`;

export function organization(base: string, site: SiteSettings, description?: string): Json {
  return clean({
    "@type": "Organization",
    "@id": orgId(base),
    name: "Doyuyo!",
    alternateName: "Doyuyo",
    url: base,
    description,
    logo: abs(base, site.logo?.src),
    image: abs(base, site.logo?.src),
    sameAs: site.social.map((s) => s.href),
    foundingDate: FOUNDING_YEAR,
    parentOrganization: PARDOFOOD,
    contactPoint: site.phone ? [{ "@type": "ContactPoint", telephone: site.phone.label, contactType: "customer service", availableLanguage: ["Turkish", "English"] }] : undefined,
    address: site.headOffice ? { "@type": "PostalAddress", streetAddress: site.headOffice.address, addressCountry: "TR" } : undefined,
  });
}

export const website = (base: string, locale: string): Json => ({
  "@type": "WebSite",
  "@id": websiteId(base),
  url: base,
  name: "Doyuyo!",
  inLanguage: locale,
  publisher: { "@id": orgId(base) },
});

export type PageKind = "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage" | "ProfilePage";

export function webPage(base: string, o: { kind?: PageKind; locale: string; path: string; name: string; description?: string; image?: string | null; breadcrumb?: boolean; alternates?: Record<string, string> }): Json {
  const url = `${base}${o.path}`;
  return clean({
    "@type": o.kind ?? "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: o.name,
    description: o.description,
    inLanguage: o.locale,
    isPartOf: { "@id": websiteId(base) },
    about: { "@id": orgId(base) },
    primaryImageOfPage: o.image ? { "@type": "ImageObject", url: abs(base, o.image) } : undefined,
    breadcrumb: o.breadcrumb === false ? undefined : { "@id": `${url}#breadcrumb` },
  });
}

export function breadcrumb(base: string, path: string, crumbs: { name: string; path: string }[]): Json {
  return {
    "@type": "BreadcrumbList",
    "@id": `${base}${path}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: plain(c.name), item: `${base}${c.path}` })),
  };
}

export function itemList(base: string, name: string, items: { name: string; path: string }[]): Json {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: `${base}${it.path}` })),
  };
}

type Branchish = BranchSummary | BranchDetail;

/** One restaurant. Coordinates only when they come from the exact Google place; no invented phone, price range or rating. */
export function restaurant(base: string, b: Branchish, o: { locale: string; menuPath: string; description?: string }): Json {
  const url = `${base}${b.path}`;
  return clean({
    "@type": "FastFoodRestaurant",
    "@id": `${url}#restaurant`,
    name: b.name,
    url,
    description: o.description,
    image: abs(base, b.image?.src),
    address: {
      "@type": "PostalAddress",
      streetAddress: b.address,
      addressLocality: b.district ? b.district : b.city?.name,
      addressRegion: b.city?.name,
      addressCountry: COUNTRY[b.country] ?? b.country,
    },
    geo: b.geo?.precise ? { "@type": "GeoCoordinates", latitude: b.geo.lat, longitude: b.geo.lng } : undefined,
    hasMap: b.mapsUrl ?? undefined,
    openingHoursSpecification: openingHoursSpec(b.hours),
    servesCuisine: ["Fried chicken", "Burgers"],
    hasMenu: `${base}${o.menuPath}`,
    inLanguage: o.locale,
    parentOrganization: { "@id": orgId(base) },
    brand: { "@id": orgId(base) },
    isAccessibleForFree: undefined,
  });
}

export function menu(base: string, o: { locale: string; path: string; name: string; categories: CategorySummary[] }): Json {
  const url = `${base}${o.path}`;
  return {
    "@type": "Menu",
    "@id": `${url}#menu`,
    name: o.name,
    url,
    inLanguage: o.locale,
    hasMenuSection: o.categories.map((c) => clean({ "@type": "MenuSection", name: c.name, description: c.description ? plain(c.description) : undefined, url: `${base}${c.path}` })),
  };
}

export function menuSection(base: string, c: CategoryDetail): Json {
  const url = `${base}${c.path}`;
  return clean({
    "@type": "MenuSection",
    "@id": `${url}#menusection`,
    name: c.name,
    description: c.description ? plain(c.description) : undefined,
    url,
    hasMenuItem: c.products.map((p) => clean({ "@type": "MenuItem", name: p.name, description: p.shortDescription, url: `${base}${p.path}`, image: abs(base, p.image?.src) })),
  });
}

export function menuItem(base: string, p: ProductDetail): Json {
  const url = `${base}${p.path}`;
  const n = p.allergenInfo?.nutrition;
  return clean({
    "@type": "MenuItem",
    "@id": `${url}#menuitem`,
    name: p.name,
    description: p.description || p.shortDescription,
    url,
    image: abs(base, p.image?.src),
    menuAddOn: undefined,
    nutrition: n
      ? {
          "@type": "NutritionInformation",
          servingSize: "100 g / 100 ml",
          calories: `${n.kcal} kcal`,
          fatContent: `${n.fat} g`,
          proteinContent: `${n.protein} g`,
          carbohydrateContent: `${n.carbs} g`,
        }
      : undefined,
  });
}

export function cityCollection(base: string, city: { name: string; path: string }, branches: BranchSummary[], o: { locale: string; description?: string }): Json[] {
  return [
    webPage(base, { kind: "CollectionPage", locale: o.locale, path: city.path, name: city.name, description: o.description }),
    itemList(base, city.name, branches.map((b) => ({ name: b.name, path: b.path }))),
  ];
}

export { shortBranchName };
export type { CitySummary };
