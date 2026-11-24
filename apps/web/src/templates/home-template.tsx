import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ContentNode } from "@doyuyo/core";
import { SECTION_SEGMENT, localePath, type Locale } from "@doyuyo/i18n";
import { Icons, buttonClass } from "@doyuyo/ui";
import { app, getSite } from "@/lib/data";
import { buttons, firstHeading, images, paragraphs, section } from "@/lib/sections";
import { SiteHeader } from "@/components/layout/site-header";
import { ProductCard } from "@/components/menu/product-card";
import { CategoryCard } from "@/components/menu/category-card";
import { OrderPlatforms } from "@/components/menu/order-platforms";
import { Marquee } from "@/components/ui/marquee";
import { CountUp } from "@/components/ui/count-up";
import { CtaCards } from "@/components/blocks/cta-cards";

/**
 * Home. Every visible text comes from the migrated home page sections (old site) or
 * from live data (menu, branches); only UI labels come from messages.
 */
export async function HomeTemplate({ locale }: { locale: Locale }) {
  const [home, site, t, tm] = await Promise.all([
    app().getHome.execute(locale),
    getSite(locale),
    getTranslations({ locale, namespace: "home" }),
    getTranslations({ locale, namespace: "common" }),
  ]);
  const s = home.page?.sections ?? [];
  const hero = section(s, "homepage-hero");
  const features = section(s, "homepage-features");
  const about = section(s, "homepage-about");
  const reach = section(s, "homepage-branch");
  const investor = section(s, "homepage-investor");
  const cta = section(s, "cta");
  const menuPath = localePath(locale, SECTION_SEGMENT.menu[locale]);
  const branchesPath = localePath(locale, SECTION_SEGMENT.branches[locale]);
  const heroImage = images(hero)[0];
  const tHeadings = await getTranslations({ locale, namespace: "menu" });

  return (
    <>
      <SiteHeader locale={locale} alternates={home.page?.alternates ?? {}} overlay />
      <main id="main">
        {/* ---------- HERO */}
        <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-navy-950 text-white">
          {heroImage && (
            <div className="absolute inset-x-0 top-0 -z-20 h-[58%] lg:h-full">
              <Image src={heroImage.src} alt={heroImage.alt} fill priority sizes="100vw" quality={80} className="animate-[heroZoom_14s_ease-out_both] object-cover object-[68%_center] motion-reduce:animate-none" />
            </div>
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950 from-45% via-navy-950/70 to-navy-950/30 lg:from-navy-950 lg:from-0% lg:via-navy-950/30 lg:to-navy-950/40" aria-hidden="true" />
          <div className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-navy-950/80 via-navy-950/20 to-transparent lg:block" aria-hidden="true" />
          <div className="container-x pb-14 pt-32 md:pb-20">
            <h1 className="display max-w-[12ch] text-[clamp(2.4rem,9vw,5rem)] leading-[0.95] [text-wrap:balance] drop-shadow-[0_2px_18px_rgb(0_0_0/0.35)] lg:max-w-[24ch] lg:text-[clamp(3rem,7.5vw,7rem)] lg:leading-[0.92] lg:drop-shadow-none">
              {firstHeading(hero)
                .split(" ")
                .filter((w) => w !== "-" && w !== "–")
                .map((w, i) => (
                  <span key={i} className={i === 0 ? "block animate-rise motion-reduce:animate-none" : "inline-block animate-rise motion-reduce:animate-none"} style={{ animationDelay: `${120 + i * 70}ms` }}>
                    {w}&nbsp;
                  </span>
                ))}
            </h1>
            <div className="mt-6 grid grid-cols-2 gap-3 animate-rise [animation-delay:700ms] sm:flex sm:flex-wrap lg:mt-8">
              <Link href={menuPath} className={buttonClass("primary", "lg")}>
                {tm("seeMenu")} <Icons.ArrowRight className="transition group-hover/btn:translate-x-1" />
              </Link>
              <Link href={branchesPath} className={buttonClass("light", "lg")}>
                <Icons.MapPin /> {tm("findBranch")}
              </Link>
            </div>
            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/20 pt-5 lg:mt-14 lg:pt-6">
              {[
                [home.stats.branches, t("statBranches")],
                [home.stats.cities, t("statCities")],
                [home.stats.countries, t("statCountries")],
              ].map(([n, l]) => (
                <div key={String(l)}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="display text-3xl text-amber-400 md:text-5xl lg:text-6xl">
                    <CountUp to={Number(n)} />
                  </dd>
                  <dd className="eyebrow mt-1 text-white/70">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <Marquee items={home.categories.map((c) => c.name)} className="bg-red-600 text-white" />

        {/* ---------- CATEGORIES */}
        <section className="container-x py-20 md:py-28">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4" data-reveal>
            <h2 className="display text-5xl md:text-7xl">{t("categories")}</h2>
            <Link href={menuPath} className={buttonClass("dark", "md")}>
              {tm("seeAll")} <Icons.ArrowRight />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.categories.map((c, i) => (
              <CategoryCard key={c.id} category={c} index={i} itemsLabel={tHeadings("items", { count: c.productCount })} />
            ))}
          </div>
        </section>

        {/* ---------- FLAVORS (old "Lezzetlerimiz" block) */}
        {features.length > 0 && (
          <section className="overflow-hidden bg-cream-50 py-20 md:py-28">
            <div className="container-x grid items-center gap-12 lg:grid-cols-2">
              <div data-reveal>
                <h2 className="display text-5xl text-red-600 md:text-7xl">{firstHeading(features)}</h2>
                <div className="prose-doyuyo mt-6 space-y-4 text-lg text-navy-700">
                  {paragraphs(features).map((p, i) => (
                    <p key={i} dangerouslySetInnerHTML={{ __html: p.html }} />
                  ))}
                </div>
                {buttons(features)[0] && (
                  <Link href={buttons(features)[0]!.href} className={buttonClass("primary", "lg", "mt-8")}>
                    {firstHeading(features)} <Icons.ArrowRight />
                  </Link>
                )}
              </div>
              <div className="relative grid grid-cols-6 grid-rows-6 gap-3 [aspect-ratio:1/1]">
                {images(features)
                  .slice(0, 3)
                  .map((img, i) => (
                    <figure
                      key={i}
                      data-reveal
                      style={{ ["--reveal-delay" as string]: `${i * 120}ms` }}
                      className={[
                        "relative overflow-hidden rounded-[2rem] shadow-[var(--shadow-pop)]",
                        i === 0 ? "col-span-4 row-span-4" : i === 1 ? "col-span-2 col-start-5 row-span-3 row-start-2" : "col-span-4 col-start-3 row-span-2 row-start-5",
                      ].join(" ")}
                    >
                      <Image src={img.src} alt={img.alt} fill sizes="(min-width: 1024px) 35vw, 70vw" className="object-cover transition duration-700 hover:scale-105" />
                    </figure>
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------- FEATURED PRODUCTS */}
        <section className="container-x py-20 md:py-28">
          <h2 className="display mb-10 text-5xl md:text-7xl" data-reveal>
            {t("featured")}
          </h2>
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {home.featured.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>

        {/* ---------- ABOUT */}
        {about.length > 0 && (
          <section className="bg-navy-900 text-white">
            <div className="container-x grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2">
              <figure className="relative aspect-square overflow-hidden rounded-[2rem]" data-reveal>
                {images(about)[0] && <Image src={images(about)[0]!.src} alt={images(about)[0]!.alt} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />}
              </figure>
              <div data-reveal>
                <h2 className="display text-5xl text-amber-400 md:text-7xl">{firstHeading(about)}</h2>
                <div className="prose-doyuyo mt-6 space-y-4 text-lg text-white/85 [&_strong]:!text-white">
                  {paragraphs(about).map((p, i) => (
                    <p key={i} dangerouslySetInnerHTML={{ __html: p.html }} />
                  ))}
                </div>
                {buttons(about)[0] && (
                  <Link href={buttons(about)[0]!.href} className={buttonClass("light", "lg", "mt-8")}>
                    {firstHeading(about)} <Icons.ArrowRight />
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ---------- REACH US + ORDER */}
        <section className="relative overflow-hidden bg-amber-400 py-20 text-navy-900 md:py-28">
          <div className="container-x grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div data-reveal>
              <h2 className="display text-5xl md:text-7xl">{firstHeading(reach)}</h2>
              <div className="prose-doyuyo mt-6 space-y-4 text-lg">
                {paragraphs(reach).map((p, i) => (
                  <p key={i} dangerouslySetInnerHTML={{ __html: p.html }} />
                ))}
              </div>
              <Link href={branchesPath} className={buttonClass("dark", "lg", "mt-8")}>
                <Icons.MapPin /> {tm("findBranch")}
              </Link>
            </div>
            <div data-reveal className="rounded-[2rem] bg-white/40 p-5 md:p-8 md:backdrop-blur">
              <p className="eyebrow mb-4">{t("orderTitle")}</p>
              <OrderPlatforms items={site.orderPlatforms.items} compact />
            </div>
          </div>
        </section>

        {/* ---------- INVESTOR */}
        {investor.length > 0 && (
          <section className="container-x py-20 md:py-28">
            <div className="relative grid overflow-hidden rounded-[2.5rem] bg-navy-950 text-white lg:grid-cols-2" data-reveal>
              <div className="relative z-10 p-8 md:p-14">
                <h2 className="display text-5xl md:text-7xl">{firstHeading(investor)}</h2>
                {paragraphs(investor).map((p, i) => (
                  <p key={i} className="mt-5 max-w-md text-lg text-white/80" dangerouslySetInnerHTML={{ __html: p.html }} />
                ))}
                {buttons(investor)[0] && (
                  <Link href={buttons(investor)[0]!.href} className={buttonClass("primary", "lg", "mt-8")}>
                    {firstHeading(investor)} <Icons.ArrowRight />
                  </Link>
                )}
              </div>
              <div className="relative min-h-72">
                {images(investor)[0] && <Image src={images(investor)[0]!.src} alt={images(investor)[0]!.alt} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/30 to-transparent max-lg:bg-gradient-to-b" aria-hidden="true" />
              </div>
            </div>
          </section>
        )}

        {/* ---------- CTA cards (contact, careers, PardoFood catalog) */}
        {cta.length > 0 && <CtaCards nodes={cta} />}
      </main>
    </>
  );
}
