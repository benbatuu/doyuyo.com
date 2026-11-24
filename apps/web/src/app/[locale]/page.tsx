import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isPublishedLocale } from "@doyuyo/i18n";
import { graph, plain, truncate, webPage } from "@doyuyo/seo";
import { app, getDefaultOg } from "@/lib/data";
import { SITE_URL, buildMetadata } from "@/lib/seo";
import { firstHeading, paragraphs, section } from "@/lib/sections";
import { JsonLd } from "@/seo/json-ld";
import { HomeTemplate } from "@/templates/home-template";

export const revalidate = 60;

/** Home description: the first paragraph of the home page copy (the old site used "Doyuyo - Anasayfa"). */
async function homeMeta(locale: "tr" | "en" | "ar") {
  const page = await app().getStaticPage.byKey("home", locale);
  if (!page) return null;
  const h1 = firstHeading(section(page.sections, "homepage-hero"));
  const description = truncate(plain(paragraphs(section(page.sections, "homepage-features"))[0]?.text ?? h1));
  return { page, h1, description };
}

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) return {};
  const m = await homeMeta(locale);
  if (!m) return {};
  return buildMetadata({
    locale,
    path: m.page.path,
    title: m.h1,
    seo: { title: m.h1, description: m.description, ogImage: null },
    alternates: m.page.alternates,
    defaultImage: await getDefaultOg(locale),
  });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();
  setRequestLocale(locale);
  const m = await homeMeta(locale);
  return (
    <>
      {m && <JsonLd data={graph(webPage(SITE_URL, { locale, path: m.page.path, name: m.h1, description: m.description, image: await getDefaultOg(locale), breadcrumb: false }))} />}
      <HomeTemplate locale={locale} />
    </>
  );
}
