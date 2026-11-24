import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { CategoryDetail, CategorySummary, ProductDetail, StaticPage } from "@doyuyo/core";
import { SECTION_SEGMENT, localePath, type Locale } from "@doyuyo/i18n";
import { Icons, buttonClass } from "@doyuyo/ui";
import { app, getPagePath, getSite } from "@/lib/data";
import { ProductAllergens } from "@/components/menu/product-allergens";
import { paragraphs, section } from "@/lib/sections";
import { SiteHeader } from "@/components/layout/site-header";
import { PageBanner } from "@/components/blocks/page-banner";
import { ContentNodes } from "@/components/blocks/content-nodes";
import { CategoryCard } from "@/components/menu/category-card";
import { ProductCard } from "@/components/menu/product-card";
import { OrderPlatforms } from "@/components/menu/order-platforms";
import { MediaImage } from "@/components/ui/media-image";


function CategoryNav({ categories, current }: { categories: CategorySummary[]; current?: number }) {
  return (
    <nav aria-label="Categories" className="sticky top-16 z-30 border-b border-line bg-paper md:top-20 md:bg-paper/90 md:backdrop-blur">
      <ul className="container-x flex gap-2 overflow-x-auto py-3 [scrollbar-width:none]">
        {categories.map((c) => (
          <li key={c.id} className="shrink-0">
            <Link
              href={c.path}
              aria-current={c.id === current ? "page" : undefined}
              className={`block rounded-full px-4 py-2 text-sm font-extrabold transition ${c.id === current ? "bg-red-600 text-white" : "bg-white hover:bg-cream-100"}`}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export async function MenuTemplate({ locale, categories, page }: { locale: Locale; categories: CategorySummary[]; page: StaticPage | null }) {
  const [t, tn] = await Promise.all([getTranslations({ locale, namespace: "menu" }), getTranslations({ locale, namespace: "nav" })]);
  const intro = section(page?.sections, "menu-list");
  const allergens = await getPagePath("allergens", locale);
  const title = page?.title ?? tn("menu");
  return (
    <>
      <SiteHeader locale={locale} alternates={page?.alternates ?? {}} overlay />
      <main id="main">
        <PageBanner title={title} image={page?.banner} crumbs={[{ label: tn("home"), href: localePath(locale) }, { label: title }]}>
          {paragraphs(intro)[0] && <p className="mt-6 max-w-2xl text-lg text-white/90">{paragraphs(intro)[0]!.text}</p>}
          <Link href={allergens} className={buttonClass("light", "md", "mt-8")}>
            {t("allergens")} <Icons.ArrowRight />
          </Link>
        </PageBanner>
        <CategoryNav categories={categories} />
        <section className="container-x grid grid-cols-1 gap-4 py-16 sm:grid-cols-2 md:py-24 lg:grid-cols-3">
          {categories.map((c, i) => (
            <CategoryCard key={c.id} category={c} index={i} itemsLabel={t("items", { count: c.productCount })} />
          ))}
        </section>
      </main>
    </>
  );
}

export async function CategoryTemplate({ locale, category, categories }: { locale: Locale; category: CategoryDetail; categories: CategorySummary[] }) {
  const [t, tn, tc] = await Promise.all([
    getTranslations({ locale, namespace: "menu" }),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "common" }),
  ]);
  const menuPath = localePath(locale, SECTION_SEGMENT.menu[locale]);
  const allergens = await getPagePath("allergens", locale);
  return (
    <>
      <SiteHeader locale={locale} alternates={category.alternates} overlay />
      <main id="main">
        <PageBanner
          title={category.name}
          eyebrow={t("items", { count: category.products.length })}
          image={category.banner}
          crumbs={[{ label: tn("home"), href: localePath(locale) }, { label: tn("menu"), href: menuPath }, { label: category.name }]}
        >
          <p className="mt-6 max-w-2xl text-lg text-white/90">{category.description}</p>
        </PageBanner>
        <CategoryNav categories={categories} current={category.id} />
        <section className="container-x py-12 md:py-16">
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {category.products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
          <div className="mt-6 text-right">
            <Link href={allergens} className="text-sm font-extrabold text-red-600 underline underline-offset-4">
              {t("allergens")}
            </Link>
          </div>
        </section>
        <nav className="container-x grid gap-3 pb-20 sm:grid-cols-2" aria-label={`${tc("previous")} / ${tc("next")}`}>
          {[category.previous, category.next].map((c, i) =>
            c ? (
              <Link key={c.id} href={c.path} className={`group flex items-center gap-4 rounded-3xl bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-1 ${i ? "sm:flex-row-reverse sm:text-right" : ""}`}>
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cream-100 text-xl text-red-600">{i ? <Icons.ArrowRight /> : <Icons.ArrowLeft />}</span>
                <span>
                  <span className="eyebrow block text-muted">{i ? tc("next") : tc("previous")}</span>
                  <span className="display text-2xl">{c.name}</span>
                </span>
              </Link>
            ) : (
              <span key={i} />
            ),
          )}
        </nav>
      </main>
    </>
  );
}

export async function ProductTemplate({ locale, product }: { locale: Locale; product: ProductDetail }) {
  const [t, tn, site, allergenTable] = await Promise.all([
    getTranslations({ locale, namespace: "menu" }),
    getTranslations({ locale, namespace: "nav" }),
    getSite(locale),
    app().getAllergenTable.execute(locale),
  ]);
  const menuPath = localePath(locale, SECTION_SEGMENT.menu[locale]);
  const allergens = await getPagePath("allergens", locale);
  return (
    <>
      <SiteHeader locale={locale} alternates={product.alternates} />
      <main id="main">
        <div className="container-x pt-6">
          <nav aria-label="Breadcrumb" className="text-sm font-bold text-muted">
            <ol className="flex flex-wrap gap-2">
              <li>
                <Link href={localePath(locale)} className="hover:text-navy-900">{tn("home")}</Link> /
              </li>
              <li>
                <Link href={menuPath} className="hover:text-navy-900">{tn("menu")}</Link> /
              </li>
              <li>
                <Link href={product.category.path} className="hover:text-navy-900">{product.category.name}</Link> /
              </li>
              <li aria-current="page" className="text-navy-900">{product.name}</li>
            </ol>
          </nav>
        </div>
        <section className="container-x grid items-center gap-10 py-10 lg:grid-cols-2 lg:py-16">
          <figure className="relative aspect-square overflow-hidden rounded-[2.5rem] bg-white shadow-[var(--shadow-card)]">
            <MediaImage media={product.image} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="animate-rise object-contain" />
          </figure>
          <div>
            <Link href={product.category.path} className="eyebrow text-red-600 hover:underline">
              {product.category.name}
            </Link>
            <h1 className="display mt-3 text-[clamp(2.75rem,6vw,5.5rem)]">{product.name}</h1>
            {product.description && <p className="mt-6 text-xl leading-relaxed text-navy-700">{product.description}</p>}
            {product.content.length > 0 && <ContentNodes nodes={product.content} className="mt-6" />}
            {product.otherCategories.length > 0 && (
              <p className="mt-6 text-sm font-bold text-muted">
                {t("alsoIn")}{" "}
                {product.otherCategories.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && ", "}
                    <Link href={c.path} className="text-navy-900 underline underline-offset-4">
                      {c.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
            <div className="mt-10 rounded-3xl bg-cream-50 p-5">
              <p className="eyebrow mb-3">{t("orderOn")}</p>
              <OrderPlatforms items={site.orderPlatforms.items} compact />
            </div>
          </div>
        </section>
        <section className="container-x pb-16">
          <ProductAllergens info={product.allergenInfo} table={allergenTable} locale={locale} allergensPath={allergens} />
        </section>
        {product.related.length > 0 && (
          <section className="container-x pb-20">
            <h2 className="display mb-8 text-4xl md:text-5xl">{t("related")}</h2>
            <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
              {product.related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
