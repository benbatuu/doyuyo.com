import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ContentNode, StaticPage } from "@doyuyo/core";
import { SECTION_SEGMENT, localePath, type Locale } from "@doyuyo/i18n";
import { Icons, buttonClass } from "@doyuyo/ui";
import { app, getPagePath, getSite } from "@/lib/data";
import { blocksByHeading, buttons, firstHeading, images, paragraphs, section, stats } from "@/lib/sections";
import { SiteHeader } from "@/components/layout/site-header";
import { VideoCard } from "@/components/blocks/video-card";
import { CountUp } from "@/components/ui/count-up";
import { BranchMap } from "@/components/branches/branch-map";
import { LeadForm } from "@/components/forms/lead-form";
import { ConsentBody } from "@/components/forms/consent-body";
import { formFields, formLabels } from "@/components/forms/form-config";

const num = (text: string, re: RegExp) => Number(text.match(re)?.[1] ?? NaN);
const text = (nodes: ContentNode[]) => paragraphs(nodes).map((p) => p.text).join(" ");

/**
 * Investor / franchise landing. Every paragraph is the old site's own investor copy, regrouped:
 * why-blocks, investment models, figures pulled from that copy, live branch data and the yearly
 * branch counts from the About page. One goal: the application form (#basvuru).
 */
export async function InvestorTemplate({ page, locale }: { page: StaticPage; locale: Locale }) {
  const c = app();
  const [t, tb, tf, site, about, branches, fields, labels, kvkk, home] = await Promise.all([
    getTranslations({ locale, namespace: "investor" }),
    getTranslations({ locale, namespace: "branches" }),
    getTranslations({ locale, namespace: "forms" }),
    getSite(locale),
    c.getStaticPage.byKey("about", locale),
    c.listBranches.execute(locale),
    formFields("investor", locale),
    formLabels(locale),
    getPagePath("legal-kvkk", locale),
    c.getStaticPage.byKey("home", locale),
  ]);

  const main = page.sections.find((s) => !s.key)?.nodes ?? [];
  const blocks = blocksByHeading(main);
  const [lead, together, producer, friendly, abroad] = blocks;
  const how = section(page.sections, "investor-gallery");
  const video = section(page.sections, "investor-video").find((n) => n.type === "video") as Extract<ContentNode, { type: "video" }> | undefined;
  const gallery = images(how);
  const formSection = section(page.sections, "investor-form");
  const formLogo = images(formSection)[0];
  const formHeading = firstHeading(formSection) || t("formTitle");
  const howText = paragraphs(how);
  const catalog = buttons(section(page.sections, "cta")).find((b) => b.href.endsWith(".pdf"));
  const logos = images(section(about?.sections, "about-pardo"));
  const yearly = stats(section(about?.sections, "about-main"))
    .map((s) => ({ year: Number(s.label.match(/\d{4}/)?.[0]), value: Number(s.value) }))
    .filter((s) => s.year && s.value)
    .sort((a, b) => a.year - b.year);
  const allText = blocks.map((b) => text(b.nodes)).join(" ");
  const target = num(allText, /(\d+)\s+Doyuyo!?\s+(?:restoran|restaurant)/i);
  const partners = num(allText, /(\d+)\s+(?:yatırımcı|investor)/i);
  const adMonths = num(allText, /(\d+)\s+(?:ay|months)\b/i);
  const countries = new Set(branches.cities.map((x) => x.country)).size;
  const heroImage = images(section(home?.sections, "homepage-investor"))[0] ?? gallery[0];
  const growth = [...yearly, { year: 0, value: branches.branches.length }];
  const max = Math.max(...growth.map((g) => g.value));

  const models = [
    { key: "franchise", title: tf("o.model.franchise"), block: friendly, tone: "bg-white text-navy-900" },
    { key: "investor_only", title: tf("o.model.investor_only"), block: { title: firstHeading(how), nodes: howText.slice(0, 2) }, tone: "bg-amber-400 text-navy-900" },
    { key: "master_franchise", title: tf("o.model.master_franchise"), block: abroad && { ...abroad, nodes: [...abroad.nodes, ...howText.slice(2)] }, tone: "bg-red-600 text-white" },
  ].filter((m) => m.block);

  return (
    <>
      <SiteHeader locale={locale} alternates={page.alternates} overlay />
      <main id="main" className="bg-navy-950 text-white">
        {/* HERO */}
        <section className="relative isolate overflow-hidden pt-28 md:pt-36">
          {heroImage && <Image src={heroImage.src} alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-35" />}
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-950/60 via-navy-950/80 to-navy-950" aria-hidden="true" />
          <div className="container-x grid gap-12 pb-16 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:pb-24">
            <div>
              <p className="eyebrow animate-rise text-amber-400">{page.title.replace(/\s*-\s*Doyuyo!?$/i, "")}</p>
              <h1 className="display mt-4 animate-rise text-[clamp(3rem,7vw,6.5rem)] [animation-delay:120ms]">{lead?.title}</h1>
              <p className="mt-6 max-w-2xl animate-rise text-lg text-white/80 [animation-delay:240ms]">{paragraphs(lead?.nodes ?? [])[0]?.text}</p>
              <div className="mt-8 flex animate-rise flex-wrap gap-3 [animation-delay:360ms]">
                <a href="#basvuru" className={buttonClass("primary", "lg")}>
                  {t("apply")} <Icons.ArrowRight />
                </a>
                {site.phone && (
                  <a href={site.phone.href} className={buttonClass("outline", "lg", "text-white")}>
                    <Icons.Phone /> {site.phone.label}
                  </a>
                )}
                {catalog && (
                  <a href={catalog.href} target="_blank" rel="noopener" className={buttonClass("ghost", "lg", "text-white")}>
                    <Icons.Download /> {t("catalog")}
                  </a>
                )}
              </div>
            </div>
            {video && (
              <div className="animate-rise [animation-delay:300ms]">
                <VideoCard href={video.href} thumbnail={video.thumbnail} />
                <p className="mt-3 text-sm font-bold text-white/60">{t("watch")}</p>
              </div>
            )}
          </div>

          {/* KPI band */}
          <div className="border-y border-white/10 bg-navy-900/60 backdrop-blur">
            <dl className="container-x grid grid-cols-2 gap-6 py-8 md:grid-cols-3 lg:grid-cols-6">
              {(
                [
                  [branches.branches.length, t("statBranches")],
                  [branches.cities.length, t("statCities")],
                  [countries, t("statCountries")],
                  [target, t("statTarget")],
                  [partners, t("statPartners")],
                  [adMonths, t("statAds")],
                ] as [number, string][]
              )
                .filter(([n]) => Number.isFinite(n))
                .map(([n, l]) => (
                  <div key={l}>
                    <dd className="display text-5xl text-amber-400 md:text-6xl">
                      <CountUp to={n} />
                    </dd>
                    <dt className="mt-1 text-sm font-bold text-white/70">{l}</dt>
                  </div>
                ))}
            </dl>
          </div>
        </section>

        {/* GROWTH */}
        {yearly.length > 1 && (
          <section className="container-x py-20 md:py-28">
            <h2 className="display text-5xl md:text-7xl" data-reveal>
              {t("growthTitle")}
            </h2>
            <div className="mt-12 flex h-72 items-end gap-3 md:h-96 md:gap-6" data-reveal>
              {growth.map((g, i) => (
                <div key={g.year || "today"} className="flex h-full flex-1 flex-col justify-end">
                  <span className="display mb-2 text-center text-2xl text-white md:text-4xl">{g.value}</span>
                  <div
                    className={`origin-bottom rounded-t-2xl transition-transform duration-700 ${g.year ? "bg-white/15" : "bg-red-600"}`}
                    style={{ height: `${(g.value / max) * 100}%`, transitionDelay: `${i * 90}ms` }}
                  />
                  <span className="mt-3 text-center text-sm font-extrabold text-white/70">{g.year || t("today")}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* WHY */}
        <section className="bg-paper py-20 text-navy-900 md:py-28">
          <div className="container-x">
            <h2 className="display text-5xl md:text-7xl" data-reveal>
              {t("whyTitle")}
            </h2>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[lead, together, producer].filter(Boolean).map((b, i) => (
                <article key={i} data-reveal style={{ ["--reveal-delay" as string]: `${i * 90}ms` }} className="flex flex-col rounded-[var(--radius-card)] bg-white p-7 shadow-[var(--shadow-card)]">
                  <span className="display text-6xl text-red-600/20">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="display mt-2 text-3xl">{b!.title}</h3>
                  <div className="mt-4 space-y-3 text-navy-700">
                    {paragraphs(b!.nodes).map((p, j) => (
                      <p key={j} dangerouslySetInnerHTML={{ __html: p.html }} />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* MODELS */}
        <section className="bg-cream-50 py-20 text-navy-900 md:py-28">
          <div className="container-x">
            <h2 className="display text-5xl md:text-7xl" data-reveal>
              {t("modelsTitle")}
            </h2>
            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {models.map((m, i) => (
                <article key={m.key} data-reveal style={{ ["--reveal-delay" as string]: `${i * 90}ms` }} className={`flex flex-col rounded-[var(--radius-card)] p-7 shadow-[var(--shadow-card)] ${m.tone}`}>
                  <h3 className="display text-3xl md:text-4xl">{m.title}</h3>
                  {m.block!.title && <p className="eyebrow mt-3 opacity-70">{m.block!.title}</p>}
                  <div className="mt-4 flex-1 space-y-3 opacity-90">
                    {paragraphs(m.block!.nodes).map((p, j) => (
                      <p key={j} dangerouslySetInnerHTML={{ __html: p.html }} />
                    ))}
                  </div>
                  <a href={`?model=${m.key}#basvuru`} className={buttonClass(m.tone.includes("red") ? "light" : "dark", "md", "mt-6 self-start")}>
                    {t("modelCta")} <Icons.ArrowRight />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section className="container-x py-20 md:py-28">
          <h2 className="display text-5xl md:text-7xl" data-reveal>
            {t("processTitle")}
          </h2>
          <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {(t.raw("steps") as string[]).map((s, i) => (
              <li key={i} data-reveal style={{ ["--reveal-delay" as string]: `${i * 70}ms` }} className="relative rounded-3xl border border-white/10 bg-white/5 p-5">
                <span className="display text-4xl text-amber-400">{i + 1}</span>
                <p className="mt-3 font-extrabold">{s}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-white/50">{t("processNote")}</p>
        </section>

        {/* NETWORK */}
        <section className="border-t border-white/10 py-20 md:py-28">
          <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div data-reveal>
              <h2 className="display text-5xl md:text-6xl">{t("networkTitle")}</h2>
              <ul className="mt-8 flex flex-wrap gap-2">
                {branches.cities.map((ct) => (
                  <li key={ct.id}>
                    <Link href={ct.path} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold hover:bg-white/20">
                      {ct.name} <span className="text-amber-400">{ct.branchCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={localePath(locale, SECTION_SEGMENT.branches[locale])} className={buttonClass("light", "md", "mt-8")}>
                {t("networkCta")} <Icons.ArrowRight />
              </Link>
            </div>
            <BranchMap
              points={branches.branches
                .filter((b) => b.geo)
                .map((b) => ({ id: b.id, lat: b.geo!.lat, lng: b.geo!.lng, name: b.name, href: b.path, address: b.address, hours: b.hours, image: b.image?.src ?? null, mapsUrl: b.mapsUrl, city: b.city?.name ?? null }))}
              labels={{ details: tb("details"), directions: tb("directions"), openNow: tb("openNow"), closedNow: tb("closedNow") }}
              className="h-[440px] w-full lg:h-[700px]"
            />
          </div>
        </section>

        {/* GALLERY */}
        {gallery.length > 0 && (
          <section className="py-10" aria-label={t("gallery")}>
            <div className="flex gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] md:px-8">
              {gallery.map((g, i) => (
                <figure key={i} className="relative aspect-[4/3] w-[80vw] shrink-0 overflow-hidden rounded-3xl md:w-[38vw]">
                  <Image src={g.src} alt={g.alt} fill sizes="(min-width: 768px) 38vw, 80vw" className="object-cover" />
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* GROUP */}
        {logos.length > 0 && (
          <section className="container-x py-16">
            <h2 className="eyebrow text-center text-white/60">{t("groupTitle")}</h2>
            <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {logos.map((l, i) => (
                <li key={i} className="grid h-24 place-items-center rounded-3xl bg-white p-5">
                  <div className="flex h-full w-full items-center justify-center"><Image src={l.src} alt={l.alt} width={180} height={60} className="h-14 w-auto max-w-full object-contain" /></div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* FORM */}
        <section id="basvuru" className="scroll-mt-20 bg-navy-900 py-16 md:py-24">
          <div className="container-x">
            <div className="grid overflow-hidden rounded-[2rem] bg-white shadow-[var(--shadow-pop)] md:rounded-[2.5rem] lg:grid-cols-[0.85fr_1.15fr]">
              {/* photo panel: the old site's own photo, logo and form heading */}
              <div className="relative isolate flex min-h-80 flex-col justify-between overflow-hidden p-7 text-white md:p-12 lg:min-h-full">
                {gallery[1] ?? gallery[0] ? <Image src={(gallery[1] ?? gallery[0])!.src} alt="" fill sizes="(min-width: 1024px) 45vw, 100vw" className="-z-20 object-cover" /> : null}
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950 via-navy-950/55 to-navy-950/25" aria-hidden="true" />
                {formLogo && (
                  <div className="w-36 rounded-2xl bg-white p-3 shadow-[var(--shadow-card)]">
                    <Image src={formLogo.src} alt="Doyuyo!" width={160} height={60} className="h-auto w-full" />
                  </div>
                )}
                <div className="mt-24">
                  <h2 className="display text-5xl md:text-6xl">{formHeading}</h2>
                  {site.phone && (
                    <a href={site.phone.href} className="mt-6 inline-flex items-center gap-3 rounded-full bg-white/15 px-5 py-3 backdrop-blur transition hover:bg-white/25" aria-label={site.phone.label}>
                      <Icons.Phone className="text-xl text-amber-400" />
                      <span className="display text-3xl text-amber-400">{site.phone.label}</span>
                    </a>
                  )}
                </div>
              </div>
              {/* form card */}
              <div className="p-6 text-navy-900 md:p-12">
                <LeadForm type="investor" locale={locale} fields={fields} labels={labels} consentHref={kvkk} tone="light" submitLabel={tf("investorSubmit")} consentBody={<ConsentBody locale={locale} />} />
              </div>
            </div>
          </div>
        </section>

        {/* mobile sticky CTA */}
        <a href="#basvuru" className={buttonClass("primary", "lg", "fixed inset-x-4 bottom-4 z-30 shadow-[var(--shadow-pop)] md:hidden")}>
          {t("sticky")} <Icons.ArrowRight />
        </a>
      </main>
    </>
  );
}
