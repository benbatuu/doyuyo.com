import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import clsx from "clsx";
import type { StaticPage } from "@doyuyo/core";
import { localePath, type Locale } from "@doyuyo/i18n";
import { Icons, buttonClass } from "@doyuyo/ui";
import { blocksByHeading, buttons, images, paragraphs, section } from "@/lib/sections";
import { SiteHeader } from "@/components/layout/site-header";
import { PageBanner } from "@/components/blocks/page-banner";
import { CtaCards } from "@/components/blocks/cta-cards";

const TONES = [
  { bg: "bg-paper", text: "text-navy-900", accent: "text-red-600", num: "text-red-600/15", btn: "dark" as const },
  { bg: "bg-red-600", text: "text-white", accent: "text-amber-300", num: "text-white/15", btn: "light" as const },
  { bg: "bg-cream-50", text: "text-navy-900", accent: "text-red-600", num: "text-navy-900/10", btn: "primary" as const },
  { bg: "bg-navy-900", text: "text-white", accent: "text-amber-400", num: "text-white/10", btn: "light" as const },
];

/**
 * "Lezzetlerimiz" / "Malzemelerimiz": each heading of the old page becomes a full-width chapter
 * with a large photo, alternating sides and brand colours. Text and photos are the old page's.
 */
export async function StoryTemplate({ page, locale }: { page: StaticPage; locale: Locale }) {
  const [t, tn] = await Promise.all([getTranslations({ locale, namespace: "story" }), getTranslations({ locale, namespace: "nav" })]);
  const main = page.sections.find((s) => !s.key)?.nodes ?? [];
  const chapters = blocksByHeading(main).filter((b) => b.title);
  const cta = section(page.sections, "cta");
  return (
    <>
      <SiteHeader locale={locale} alternates={page.alternates} overlay />
      <main id="main">
        <PageBanner title={page.title.replace(/\s*-\s*Doyuyo!?$/i, "")} image={page.banner} crumbs={[{ label: tn("home"), href: localePath(locale) }, { label: page.title }]}>
          <nav aria-label={page.title} className="mt-8 flex flex-wrap gap-2">
            {chapters.map((c, i) => (
              <a key={i} href={`#bolum-${i + 1}`} className="rounded-full bg-white/15 px-4 py-2 text-sm font-extrabold backdrop-blur transition hover:bg-white hover:text-red-600">
                {c.title}
              </a>
            ))}
          </nav>
        </PageBanner>

        {chapters.map((c, i) => {
          const tone = TONES[i % TONES.length]!;
          const imgs = images(c.nodes).filter((im) => !im.src.endsWith(".png") || images(c.nodes).length === 1);
          const extra = images(c.nodes).filter((im) => !imgs.includes(im));
          const btn = buttons(c.nodes)[0];
          const flip = i % 2 === 1;
          return (
            <section key={i} id={`bolum-${i + 1}`} className={clsx("scroll-mt-20 overflow-hidden", tone.bg, tone.text)}>
              <div className="container-x grid items-center gap-10 py-16 md:py-24 lg:grid-cols-12 lg:gap-16">
                <div className={clsx("relative lg:col-span-7", flip && "lg:order-2")} data-reveal>
                  {imgs[0] && (
                    <figure className="relative aspect-[4/3] overflow-hidden rounded-[2.5rem] shadow-[var(--shadow-pop)]">
                      <Image src={imgs[0].src} alt={imgs[0].alt || c.title} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover transition duration-700 hover:scale-[1.04]" />
                    </figure>
                  )}
                  {extra[0] && (
                    <div className={clsx("absolute -bottom-8 hidden w-40 md:block", flip ? "-left-6" : "-right-6")}>
                      <Image src={extra[0].src} alt="" width={240} height={240} className="h-auto w-full animate-float drop-shadow-xl" />
                    </div>
                  )}
                </div>
                <div className={clsx("lg:col-span-5", flip && "lg:order-1")} data-reveal>
                  <span className={clsx("display block text-[7rem] leading-none md:text-[9rem]", tone.num)} aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className={clsx("display -mt-8 text-4xl md:-mt-12 md:text-6xl", tone.accent)}>{c.title}</h2>
                  <div className="mt-6 space-y-4 text-lg opacity-90 [&_strong]:font-extrabold">
                    {paragraphs(c.nodes).map((p, j) => (
                      <p key={j} dangerouslySetInnerHTML={{ __html: p.html }} />
                    ))}
                  </div>
                  {btn && (
                    <Link href={btn.href} className={buttonClass(tone.btn, "lg", "mt-8")}>
                      {t("discover")} <Icons.ArrowRight />
                    </Link>
                  )}
                </div>
              </div>
            </section>
          );
        })}

        {cta.length > 0 && (
          <div className="pt-16 md:pt-24">
            <CtaCards nodes={cta} />
          </div>
        )}
      </main>
    </>
  );
}
