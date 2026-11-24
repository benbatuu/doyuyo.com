import { getTranslations } from "next-intl/server";
import type { AllergenTable, BranchDetail, BranchSummary, CategoryDetail, CategorySummary, CityDetail, ProductDetail, StaticPage } from "@doyuyo/core";
import { SECTION_SEGMENT, localePath, type Locale } from "@doyuyo/i18n";
import { breadcrumb, cityCollection, graph, itemList, menu, menuItem, menuSection, restaurant, webPage, type Json } from "@doyuyo/seo";
import { SITE_URL } from "@/lib/seo";

export type PageData =
  | { kind: "page" | "allergens"; page: StaticPage; table?: AllergenTable }
  | { kind: "menu"; categories: CategorySummary[]; page: StaticPage | null; title: string }
  | { kind: "category"; category: CategoryDetail }
  | { kind: "product"; product: ProductDetail }
  | { kind: "branches"; branches: BranchSummary[]; page: StaticPage | null }
  | { kind: "city"; city: CityDetail }
  | { kind: "branch"; branch: BranchDetail };

/** Structured data for a routed page: WebPage + BreadcrumbList + the entity itself (Restaurant, MenuItem, Menu…). */
export async function pageJsonLd(data: PageData, locale: Locale, o: { description?: string; image?: string | null }): Promise<Json> {
  const tn = await getTranslations({ locale, namespace: "nav" });
  const tb = await getTranslations({ locale, namespace: "branches" });
  const home = { name: tn("home"), path: localePath(locale) };
  const menuCrumb = { name: tn("menu"), path: localePath(locale, SECTION_SEGMENT.menu[locale]) };
  const branchesCrumb = { name: tn("branches"), path: localePath(locale, SECTION_SEGMENT.branches[locale]) };
  const base = SITE_URL;
  void tb;
  const wp = (path: string, name: string, kind?: Parameters<typeof webPage>[1]["kind"]) => webPage(base, { kind, locale, path, name, description: o.description, image: o.image });

  switch (data.kind) {
    case "page": {
      const p = data.page;
      const kind = p.key === "about" ? "AboutPage" : p.key === "contact" ? "ContactPage" : "WebPage";
      return graph(wp(p.path, p.title, kind), breadcrumb(base, p.path, [home, { name: p.title, path: p.path }]));
    }
    case "allergens": {
      const p = data.page;
      return graph(wp(p.path, p.title), breadcrumb(base, p.path, [home, menuCrumb, { name: p.title, path: p.path }]));
    }
    case "menu": {
      const path = menuCrumb.path;
      return graph(wp(path, data.title || menuCrumb.name, "CollectionPage"), breadcrumb(base, path, [home, { name: data.title || menuCrumb.name, path }]), menu(base, { locale, path, name: data.title || menuCrumb.name, categories: data.categories }));
    }
    case "category": {
      const c = data.category;
      return graph(wp(c.path, c.name, "CollectionPage"), breadcrumb(base, c.path, [home, menuCrumb, { name: c.name, path: c.path }]), menuSection(base, c));
    }
    case "product": {
      const p = data.product;
      return graph(wp(p.path, p.name), breadcrumb(base, p.path, [home, menuCrumb, { name: p.category.name, path: p.category.path }, { name: p.name, path: p.path }]), menuItem(base, p));
    }
    case "branches": {
      const path = branchesCrumb.path;
      return graph(wp(path, data.page?.title ?? branchesCrumb.name, "CollectionPage"), breadcrumb(base, path, [home, { name: data.page?.title ?? branchesCrumb.name, path }]), itemList(base, branchesCrumb.name, data.branches.map((b) => ({ name: b.name, path: b.path }))));
    }
    case "city": {
      const c = data.city;
      return graph(...cityCollection(base, { name: c.name, path: c.path }, c.branches, { locale, description: o.description }), breadcrumb(base, c.path, [home, branchesCrumb, { name: c.name, path: c.path }]));
    }
    case "branch": {
      const b = data.branch;
      const crumbs = [home, branchesCrumb, ...(b.city ? [{ name: b.city.name, path: b.city.path }] : []), { name: b.name, path: b.path }];
      return graph(wp(b.path, b.name), breadcrumb(base, b.path, crumbs), restaurant(base, b, { locale, menuPath: menuCrumb.path, description: o.description }));
    }
  }
}
