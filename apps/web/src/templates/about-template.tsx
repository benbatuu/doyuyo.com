import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { StaticPage } from "@doyuyo/core";
import { localePath, type Locale } from "@doyuyo/i18n";
import { Icons } from "@doyuyo/ui";
import { firstHeading, images, paragraphs, section, stats } from "@/lib/sections";
import { SiteHeader } from "@/components/layout/site-header";
import { CountUp } from "@/components/ui/count-up";
import { CtaCards } from "@/components/blocks/cta-cards";

/** Some logo files carry wide empty margins; scale those up so they read at the same size as the others. */

const TONES = ["bg-red-600 text-white", "bg-amber-400 text-navy-900", "bg-sky-200 text-navy-900"];

/** Hakkımızda: lead story, yearly branch bars, numbered chapters, PardoFood family. Old copy, new layout. */
export async function AboutTemplate({ page, locale }: { page: StaticPage; locale: Locale }) {
  const [t, tn] = await Promise.all([getTranslations({ locale, namespace: "about" }), getTranslations({ locale, namespace: "nav" })]);
  const main = section(page.sections, "about-main");
  const pardo = section(page.sections, "about-pardo");
  const cta = section(page.sections, "cta");
  const [lead, ...chapters] = paragraphs(main);
  const yearly = stats(main)
    .map((s) => ({ year: Number(s.label.match(/\d{4}/)?.[0]), value: Number(s.value) }))
    .filter((s) => s.year && s.value)
    .sort((a, b) => a.year - b.year);
  const max = Math.max(1, ...yearly.map((y) => y.value));
  const logos = images(pardo);
  const home = localePath(locale);
  const heroImg = images(main)[0] ?? page.banner;

  return (
    <>
      <SiteHeader locale={locale} alternates={page.alternates} overlay />
      <main id="main">
        <section className="relative isolate overflow-hidden bg-navy-950 pb-14 pt-28 text-white md:pb-24 md:pt-40">
          {heroImg && <Image src={"src" in heroImg ? heroImg.src : ""} alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-30" />}
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-950/40 via-navy-950/80 to-navy-950" aria-hidden="true" />
          <div className="container-x">
            <nav aria-label="Breadcrumb" className="mb-5 text-sm font-bold text-white/70">
              <a href={home} className="hover:text-white">{tn("home")}</a> / <span className="text-white">{page.title}</span>
            </nav>
            <p className="eyebrow text-amber-400">{t("eyebrow")}</p>
            <h1 className="display mt-3 max-w-4xl text-[clamp(2.6rem,8vw,6.5rem)] leading-[0.95]">{firstHeading(main) || page.title}</h1>
            {lead && <p className="mt-6 max-w-2xl text-base text-white/85 md:text-xl">{lead.text}</p>}
          </div>
        </section>

        {yearly.length > 0 && (
          <section className="bg-navy-950 pb-16 text-white md:pb-28">
            <div className="container-x">
              <h2 className="display text-3xl md:text-6xl" data-reveal>{t("growthTitle")}</h2>
              <div className="mt-8 flex h-56 items-end gap-2 md:mt-10 md:h-80 md:gap-5" data-reveal>
                {yearly.map((y, i) => (
                  <div key={y.year} className="flex h-full flex-1 flex-col justify-end">
                    <span className="display mb-2 text-center text-lg text-amber-400 md:text-4xl"><CountUp to={y.value} /></span>
                    <div className="rounded-t-2xl bg-white/15" style={{ height: `${(y.value / max) * 100}%`, transitionDelay: `${i * 80}ms` }} />
                    <span className="mt-3 text-center text-xs font-extrabold text-white/70 md:text-sm">{y.year}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="container-x py-16 md:py-28">
          <h2 className="display text-4xl md:text-7xl" data-reveal>{t("storyTitle")}</h2>
          <div className="mt-8 grid gap-4 md:mt-12 md:grid-cols-3">
            {chapters.map((c, i) => (
              <article key={i} data-reveal style={{ ["--reveal-delay" as string]: `${i * 90}ms` }} className={`flex flex-col rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)] md:p-7 ${TONES[i % 3]}`}>
                <span className="display text-5xl opacity-30 md:text-6xl">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-4 text-base leading-relaxed md:mt-6 md:text-lg [&_strong]:font-extrabold" dangerouslySetInnerHTML={{ __html: c.html }} />
              </article>
            ))}
          </div>
        </section>

        {pardo.length > 0 && (
          <section className="bg-cream-50 py-16 text-navy-900 md:py-28">
            <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-12">
              <div data-reveal>
                <p className="eyebrow text-red-600">{t("groupEyebrow")}</p>
                <h2 className="display mt-3 text-4xl md:text-7xl">{firstHeading(pardo) || "PardoFood"}</h2>
                <div className="mt-5 space-y-4 text-base text-navy-700 md:mt-6 md:text-lg">
                  {paragraphs(pardo).map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: p.html }} />)}
                </div>
              </div>
              <ul className="grid grid-cols-2 gap-3" data-reveal>
                {logos.map((l, i) => (
                  <li key={i} className="grid aspect-[3/2] place-items-center rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)] md:p-6">
                    <Image src={l.src} alt={l.alt} width={400} height={220} className="h-12 w-auto max-w-[78%] object-contain md:h-16" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {cta.length > 0 && <div className="pt-16 md:pt-24"><CtaCards nodes={cta} /></div>}
        <div className="container-x pb-16 pt-2">
          <a href={home} className="inline-flex items-center gap-2 text-sm font-extrabold text-muted hover:text-navy-900"><Icons.ArrowLeft /> {tn("home")}</a>
        </div>
      </main>
    </>
  );
}
