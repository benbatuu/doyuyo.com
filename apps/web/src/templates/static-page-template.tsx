import { getTranslations } from "next-intl/server";
import type { StaticPage } from "@doyuyo/core";
import { localePath, type Locale } from "@doyuyo/i18n";
import { SiteHeader } from "@/components/layout/site-header";
import { PageBanner } from "@/components/blocks/page-banner";
import { ContentNodes } from "@/components/blocks/content-nodes";
import { SectionBlockView } from "@/components/blocks/section-block";
import { CountUp } from "@/components/ui/count-up";
import { stats } from "@/lib/sections";

/**
 * Generic page made of migrated sections. Sections alternate light/cream backgrounds;
 * stat counters (e.g. yearly branch counts) render as a band.
 */
export async function StaticPageTemplate({ page, locale }: { page: StaticPage; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  // Forms are not built yet: drop form sections and their dangling "... Formu" headings.
  const isFormHeading = (n: (typeof page.sections)[number]["nodes"][number]) => n.type === "heading" && /\bform(u)?\b/i.test(n.text);
  const sections = page.sections
    .filter((s) => s.key !== "cta" && !s.key?.endsWith("-form"))
    .map((s) => ({ ...s, nodes: s.nodes.filter((n) => !isFormHeading(n)) }))
    .filter((s) => s.nodes.length);
  // Page builder sections render their own design; the rest keep the migrated layout.
  const built = page.sections.filter((s) => s.block);
  if (built.length) {
    return (
      <>
        <SiteHeader locale={locale} alternates={page.alternates} overlay />
        <main id="main">
          {page.sections.map((sec, i) =>
            sec.block ? (
              <SectionBlockView key={i} section={sec} />
            ) : (
              <section key={i} className="container-x py-12">
                <ContentNodes nodes={sec.nodes} className="mx-auto max-w-3xl text-lg" />
              </section>
            ),
          )}
        </main>
      </>
    );
  }
  return (
    <>
      <SiteHeader locale={locale} alternates={page.alternates} overlay />
      <main id="main">
        <PageBanner title={page.title} image={page.banner} crumbs={[{ label: t("home"), href: localePath(locale) }, { label: page.title }]} />
        {sections.map((sec, i) => {
          const counters = stats(sec.nodes);
          const rest = sec.nodes.filter((n) => n.type !== "stat");
          return (
            <section key={i} className={i % 2 ? "bg-cream-50" : ""}>
              <div className="container-x py-16 md:py-24">
                <div data-reveal className="mx-auto max-w-3xl">
                  <ContentNodes nodes={rest} className="text-lg" />
                </div>
                {counters.length > 0 && (
                  <dl className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-reveal>
                    {counters.map((c, j) => (
                      <div key={j} className="rounded-3xl bg-navy-900 p-5 text-white">
                        <dd className="display text-5xl text-amber-400">
                          <CountUp to={Number(c.value) || 0} />
                        </dd>
                        <dt className="eyebrow mt-2 text-white/70">{c.label}</dt>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
