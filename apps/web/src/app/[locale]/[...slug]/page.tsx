import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { cache } from "react";
import { setRequestLocale } from "next-intl/server";
import type { EntityRef } from "@doyuyo/core";
import { SECTION_SEGMENT, isPublishedLocale, localePath, type Locale } from "@doyuyo/i18n";
import { app, getCategories } from "@/lib/data";
import { getTranslations } from "next-intl/server";
import { branchDescription, cityDescription, plain, truncate } from "@doyuyo/seo";
import { buildMetadata } from "@/lib/seo";
import { getDefaultOg } from "@/lib/data";
import { JsonLd } from "@/seo/json-ld";
import { pageJsonLd, type PageData } from "@/seo/page-jsonld";
import { StaticPageTemplate } from "@/templates/static-page-template";
import { CategoryTemplate, MenuTemplate, ProductTemplate } from "@/templates/menu-templates";
import { BranchTemplate, BranchesTemplate, CityTemplate } from "@/templates/branch-templates";
import { AllergensTemplate } from "@/templates/allergens-template";
import { InvestorTemplate } from "@/templates/investor-template";
import { ContactTemplate, CareersTemplate } from "@/templates/contact-careers-templates";
import { LegalTemplate } from "@/templates/legal-template";
import { StoryTemplate } from "@/templates/story-template";
import { AboutTemplate } from "@/templates/about-template";

/** Cached on demand (ISR): first request renders from the DB, then the page is served static. */
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

const resolve = cache((path: string) => app().resolvePath.execute(path));

/** Load the entity behind a route. Returns null when it has no content in this locale. */
const load = cache(async (ref: EntityRef, locale: Locale) => {
  const c = app();
  switch (ref.type) {
    case "page": {
      const page = await c.getStaticPage.execute(ref.id, locale);
      if (!page) return null;
      if (page.key === "allergens") {
        const table = await c.getAllergenTable.execute(locale);
        return table ? ({ kind: "allergens", page, table } as const) : null;
      }
      return { kind: "page", page } as const;
    }
    case "menu": {
      const m = await c.getMenu.execute(locale);
      return { kind: "menu", ...m, title: m.page?.title ?? "", seo: m.page?.seo, alternates: m.page?.alternates ?? {} } as const;
    }
    case "category": {
      const category = await c.getCategory.execute(ref.id, locale);
      return category ? ({ kind: "category", category } as const) : null;
    }
    case "product": {
      const product = await c.getProduct.execute(ref.id, locale);
      return product ? ({ kind: "product", product } as const) : null;
    }
    case "branches": {
      const b = await c.listBranches.execute(locale);
      return { kind: "branches", ...b } as const;
    }
    case "city": {
      const [city, cities] = await Promise.all([c.getCity.execute(ref.id, locale), c.listBranches.execute(locale)]);
      return city ? ({ kind: "city", city, cities: cities.cities } as const) : null;
    }
    case "branch": {
      const branch = await c.getBranch.execute(ref.id, locale);
      return branch ? ({ kind: "branch", branch } as const) : null;
    }
    default:
      return null;
  }
});

async function entityFor(locale: string, slug: string[]) {
  if (!isPublishedLocale(locale)) notFound();
  const path = `/${locale}/${slug.join("/")}`;
  const r = await resolve(path);
  if (r.kind === "redirect") (r.permanent ? permanentRedirect : redirect)(r.to);
  if (r.kind !== "entity" || r.locale !== locale) notFound();
  const data = await load(r.entity, locale);
  if (!data) notFound();
  return { locale, data };
}

/** First real paragraph of a page (skipping one-line headings glued to text) as its description. */
/** A description is usable only when it is a real sentence (the old site had "BBQ:" and "Doyuyo - Anasayfa"). */
const usable = (x?: string | null) => (x && plain(x).length >= 50 ? plain(x) : "");

const firstParagraph = (page: { sections: { nodes: { type: string; text?: string }[] }[] }) =>
  page.sections.flatMap((s) => s.nodes).find((n) => n.type === "paragraph" && (n.text?.length ?? 0) >= 80)?.text ?? "";

/** Title, description and photo for a loaded entity. Descriptions the old site left empty are built from real fields. */
async function describe(data: Awaited<ReturnType<typeof entityFor>>["data"], locale: Locale) {
  const t = await getTranslations({ locale, namespace: "seo" });
  const labels = { hours: t.raw("hours") as string, branchOf: t.raw("branchOf") as string, cityBranches: t.raw("cityBranches") as string };
  switch (data.kind) {
    case "page":
    case "allergens": {
      const generated = data.kind === "allergens" ? (t.raw("allergens") as string) : truncate(firstParagraph(data.page));
      return { title: data.page.title, path: data.page.path, alternates: data.page.alternates, seo: data.page.seo, description: usable(data.page.seo.description) || generated, image: data.page.seo.ogImage };
    }
    case "menu":
      return { title: data.title, path: localePath(locale, SECTION_SEGMENT.menu[locale]), alternates: data.alternates, seo: data.seo, description: usable(data.seo?.description) || truncate(firstParagraph(data.page ?? { sections: [] })), image: data.seo?.ogImage };
    case "category":
      return { title: data.category.name, path: data.category.path, alternates: data.category.alternates, seo: data.category.seo, description: usable(data.category.seo.description) || truncate(usable(data.category.description) || `${data.category.name} · Doyuyo!`), image: data.category.products[0]?.image?.src };
    case "product": {
      const p = data.product;
      return { title: p.name, path: p.path, alternates: p.alternates, seo: p.seo, description:
          usable(p.seo.description) ||
          (usable(p.description) || usable(p.shortDescription)
            ? truncate(`${p.name}: ${usable(p.description) || usable(p.shortDescription)}`)
            : (t.raw("productFallback") as string).replace("{name}", p.name).replace("{category}", p.category.name)), image: p.image?.src };
    }
    case "branches":
      return { title: data.page?.title ?? "", path: data.page?.path ?? "", alternates: data.page?.alternates, seo: data.page?.seo, description: usable(data.page?.seo.description) || truncate(firstParagraph(data.page ?? { sections: [] })) || undefined, image: data.page?.seo.ogImage };
    case "city":
      return { title: `Doyuyo! ${data.city.name}`, path: data.city.path, alternates: data.city.alternates, seo: data.city.seo, description: usable(data.city.seo.description) || cityDescription(data.city.name, data.city.branches, labels), image: data.city.branches[0]?.image?.src };
    case "branch": {
      const b = data.branch;
      return { title: b.name, path: b.path, alternates: b.alternates, seo: b.seo, // Old branch descriptions were keyword-stuffed ("Doyuyo, X Doyuyo'da…"): build from real fields instead (name, address, hours).
      description: branchDescription(b, labels), image: b.image?.src };
    }
  }
}

export async function generateMetadata({ params }: PageProps<"/[locale]/[...slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const { data } = await entityFor(locale, slug);
  const l = locale as Locale;
  const d = await describe(data, l);
  return buildMetadata({
    locale: l,
    path: d.path,
    title: d.title,
    seo: { title: d.seo?.title ?? "", description: d.description ?? "", ogImage: d.image ?? null },
    alternates: d.alternates,
    type: "website",
  });
}

export default async function CatchAllPage({ params }: PageProps<"/[locale]/[...slug]">) {
  const { locale: raw, slug } = await params;
  const { locale, data } = await entityFor(raw, slug);
  setRequestLocale(locale);
  const d = await describe(data, locale);
  const ld = await pageJsonLd(data as PageData, locale, { description: plain(d.description ?? ""), image: d.image });
  return (
    <>
      <JsonLd data={ld} />
      {await render(data, locale)}
    </>
  );
}

async function render(data: Awaited<ReturnType<typeof entityFor>>["data"], locale: Locale) {
  switch (data.kind) {
    case "page": {
      const p = data.page;
      if (p.key === "about") return <AboutTemplate page={p} locale={locale} />;
      if (p.key === "investor") return <InvestorTemplate page={p} locale={locale} />;
      if (p.key === "contact") return <ContactTemplate page={p} locale={locale} />;
      if (p.key === "careers") return <CareersTemplate page={p} locale={locale} />;
      if (p.key.startsWith("legal-")) return <LegalTemplate page={p} locale={locale} />;
      if (p.key === "flavors" || p.key === "ingredients") return <StoryTemplate page={p} locale={locale} />;
      return <StaticPageTemplate page={p} locale={locale} />;
    }
    case "allergens":
      return <AllergensTemplate page={data.page} table={data.table} locale={locale} />;
    case "menu":
      return <MenuTemplate locale={locale} categories={data.categories} page={data.page} />;
    case "category":
      return <CategoryTemplate locale={locale} category={data.category} categories={await getCategories(locale)} />;
    case "product":
      return <ProductTemplate locale={locale} product={data.product} />;
    case "branches":
      return <BranchesTemplate locale={locale} branches={data.branches} cities={data.cities} page={data.page} />;
    case "city":
      return <CityTemplate locale={locale} city={data.city} cities={data.cities} />;
    case "branch":
      return <BranchTemplate locale={locale} branch={data.branch} />;
  }
}
