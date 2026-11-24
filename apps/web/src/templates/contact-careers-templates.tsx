import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { StaticPage } from "@doyuyo/core";
import { SECTION_SEGMENT, localePath, type Locale } from "@doyuyo/i18n";
import { Icons, buttonClass } from "@doyuyo/ui";
import { app, getPagePath, getSite } from "@/lib/data";
import { blocksByHeading, firstHeading, paragraphs } from "@/lib/sections";
import { SiteHeader } from "@/components/layout/site-header";
import { PageBanner } from "@/components/blocks/page-banner";
import { OrderPlatforms } from "@/components/menu/order-platforms";
import { LeadForm } from "@/components/forms/lead-form";
import { formFields, formLabels } from "@/components/forms/form-config";
import type { ContentNode } from "@doyuyo/core";

const SOCIAL: Record<string, string> = { instagram: "Instagram", youtube: "YouTube", twitter: "X", linkedin: "LinkedIn" };

export async function ContactTemplate({ page, locale }: { page: StaticPage; locale: Locale }) {
  const c = app();
  const [t, tn, site, fields, labels, kvkk, investor, careers] = await Promise.all([
    getTranslations({ locale, namespace: "contact" }),
    getTranslations({ locale, namespace: "nav" }),
    getSite(locale),
    formFields("contact", locale),
    formLabels(locale),
    getPagePath("legal-kvkk", locale),
    c.getStaticPage.byKey("investor", locale),
    c.getStaticPage.byKey("careers", locale),
  ]);
  const hero = page.sections.find((s) => s.key === "directorate-hero")?.nodes ?? [];
  const intro = paragraphs(hero)[0];
  const table = hero.find((n) => n.type === "table") as Extract<ContentNode, { type: "table" }> | undefined;
  const map = hero.find((n) => n.type === "embed") as Extract<ContentNode, { type: "embed" }> | undefined;
  const hours = table?.rows.slice(1) ?? [];
  const quick = [
    investor && { href: investor.path, title: investor.title.replace(/\s*-\s*Doyuyo!?$/i, ""), tone: "bg-navy-900 text-white" },
    careers && { href: careers.path, title: careers.title.replace(/\s*-\s*Doyuyo!?$/i, ""), tone: "bg-sky-200 text-navy-900" },
    { href: localePath(locale, SECTION_SEGMENT.branches[locale]), title: tn("branches"), tone: "bg-amber-400 text-navy-900" },
  ].filter(Boolean) as { href: string; title: string; tone: string }[];

  return (
    <>
      <SiteHeader locale={locale} alternates={page.alternates} overlay />
      <main id="main">
        <PageBanner title={page.title.replace(/\s*-\s*Doyuyo!?$/i, "")} image={page.banner} crumbs={[{ label: tn("home"), href: localePath(locale) }, { label: page.title }]}>
          {intro && <p className="mt-6 max-w-2xl text-lg text-white/90">{intro.text}</p>}
        </PageBanner>

        <section className="container-x -mt-10 grid gap-4 md:grid-cols-3">
          {site.headOffice && (
            <a href={site.headOffice.mapsUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="group rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-pop)] transition hover:-translate-y-1">
              <span className="grid size-12 place-items-center rounded-2xl bg-red-600 text-2xl text-white">
                <Icons.MapPin />
              </span>
              <p className="eyebrow mt-5 text-muted">{firstHeading(hero) || t("hq")}</p>
              <p className="mt-2 text-lg font-extrabold">{site.headOffice.address}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-red-600">
                {t("directions")} <Icons.ArrowRight className="transition group-hover:translate-x-1" />
              </span>
            </a>
          )}
          {site.phone && (
            <a href={site.phone.href} className="group rounded-[var(--radius-card)] bg-navy-900 p-6 text-white shadow-[var(--shadow-pop)] transition hover:-translate-y-1">
              <span className="grid size-12 place-items-center rounded-2xl bg-amber-400 text-2xl text-navy-900">
                <Icons.Phone />
              </span>
              <p className="eyebrow mt-5 text-white/60">{t("call")}</p>
              <p className="display mt-2 text-5xl text-amber-400">{site.phone.label}</p>
            </a>
          )}
          {site.email && (
            <a href={`mailto:${site.email}`} className="group rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-pop)] transition hover:-translate-y-1">
              <span className="grid size-12 place-items-center rounded-2xl bg-sky-200 text-2xl font-extrabold text-navy-900">@</span>
              <p className="eyebrow mt-5 text-muted">{locale === "en" ? "E-mail" : "E-posta"}</p>
              <p className="mt-2 break-all text-lg font-extrabold">{site.email}</p>
            </a>
          )}
          {hours.length > 0 && (
            <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-pop)]">
              <span className="grid size-12 place-items-center rounded-2xl bg-sky-200 text-2xl text-navy-900">
                <Icons.Clock />
              </span>
              <p className="eyebrow mt-5 text-muted">{t("hours")}</p>
              <dl className="mt-2 space-y-1">
                {hours.map((r, i) => (
                  <div key={i} className="flex justify-between gap-4 text-lg font-extrabold">
                    <dt>{r[0]}</dt>
                    <dd className="tabular-nums">{r[1]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </section>

        <section className="container-x grid gap-10 py-16 md:py-24 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="display text-5xl md:text-6xl">{t("formTitle")}</h2>
            <p className="mt-4 max-w-md text-lg text-muted">{t("formText")}</p>
            {map && <iframe src={map.src} title="Map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="mt-10 aspect-[4/3] w-full rounded-[var(--radius-card)] border-0" />}
          </div>
          <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] md:p-10">
            <LeadForm type="contact" locale={locale} fields={fields} labels={labels} consentHref={kvkk} />
          </div>
        </section>

        <section className="bg-cream-50 py-16 md:py-24">
          <div className="container-x">
            <h2 className="display text-4xl md:text-5xl">{t("quick")}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {quick.map((q) => (
                <Link key={q.href} href={q.href} className={`group flex min-h-40 flex-col justify-between rounded-[var(--radius-card)] p-6 transition hover:-translate-y-1 ${q.tone}`}>
                  <span className="display text-3xl md:text-4xl">{q.title}</span>
                  <span className="inline-flex size-11 items-center justify-center self-end rounded-full bg-current/10 text-xl transition group-hover:translate-x-1">
                    <Icons.ArrowRight />
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <div>
                <p className="eyebrow mb-3">{t("order")}</p>
                <OrderPlatforms items={site.orderPlatforms.items} compact />
              </div>
              <div>
                <p className="eyebrow mb-3">{t("follow")}</p>
                <ul className="grid grid-cols-2 gap-3">
                  {site.social.map((s) => (
                    <li key={s.href}>
                      <a href={s.href} target="_blank" rel="noopener noreferrer" className="flex h-16 items-center justify-between rounded-2xl bg-white px-5 font-extrabold shadow-[var(--shadow-card)] transition hover:-translate-y-1">
                        {SOCIAL[s.network] ?? s.network} <Icons.External className="text-muted" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export async function CareersTemplate({ page, locale }: { page: StaticPage; locale: Locale }) {
  const [t, tn, fields, labels, kvkk] = await Promise.all([
    getTranslations({ locale, namespace: "careers" }),
    getTranslations({ locale, namespace: "nav" }),
    formFields("careers", locale),
    formLabels(locale),
    getPagePath("legal-kvkk", locale),
  ]);
  const main = page.sections.find((s) => !s.key)?.nodes ?? [];
  const [culture] = blocksByHeading(main);
  const ps = paragraphs(culture?.nodes ?? []);
  const motto = ps.at(-1);
  const body = ps.slice(0, -1);
  return (
    <>
      <SiteHeader locale={locale} alternates={page.alternates} overlay />
      <main id="main">
        <PageBanner title={page.title.replace(/\s*-\s*Doyuyo!?$/i, "")} image={page.banner} crumbs={[{ label: tn("home"), href: localePath(locale) }, { label: page.title }]} />
        <section className="container-x grid gap-12 py-16 md:py-24 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="display text-5xl text-red-600 md:text-6xl">{culture?.title.replace(",", ", ")}</h2>
            <div className="prose-doyuyo mt-6 space-y-4 text-lg text-navy-700">
              {body.map((p, i) => (
                <p key={i} dangerouslySetInnerHTML={{ __html: p.html }} />
              ))}
            </div>
            {motto && (
              <blockquote className="display mt-10 rounded-[var(--radius-card)] bg-amber-400 p-8 text-3xl text-navy-900 md:text-4xl">“{motto.text}”</blockquote>
            )}
          </div>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] md:p-10">
              <h2 className="display text-4xl">{t("formTitle")}</h2>
              <p className="mb-6 mt-3 text-muted">{t("formText")}</p>
              <LeadForm type="careers" locale={locale} fields={fields} labels={labels} consentHref={kvkk} defaults={{ department: "general" }} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

