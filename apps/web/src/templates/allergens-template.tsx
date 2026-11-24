import { getTranslations } from "next-intl/server";
import type { AllergenTable, StaticPage } from "@doyuyo/core";
import { SECTION_SEGMENT, allergenLabel, localePath, type Locale } from "@doyuyo/i18n";
import { Icons, buttonClass } from "@doyuyo/ui";
import { SiteHeader } from "@/components/layout/site-header";
import { PageBanner } from "@/components/blocks/page-banner";
import { AllergenFilter } from "@/components/menu/allergen-filter";

/**
 * Allergen + nutrition tables, extracted from the brand's PDF (kept verbatim, in Turkish as published).
 * The PDF stays downloadable as the source of record.
 */
export async function AllergensTemplate({ locale, page, table }: { locale: Locale; page: StaticPage; table: AllergenTable }) {
  const [t, tn] = await Promise.all([getTranslations({ locale, namespace: "allergens" }), getTranslations({ locale, namespace: "nav" })]);
  const sections = [...new Set(table.rows.map((r) => r.section))];
  const nutSections = [...new Set(table.nutrition.map((r) => r.section))];
  const num = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-GB", { maximumFractionDigits: 2 });
  return (
    <>
      <SiteHeader locale={locale} alternates={page.alternates} overlay />
      <main id="main">
        <PageBanner
          title={page.title}
          crumbs={[{ label: tn("home"), href: localePath(locale) }, { label: tn("menu"), href: localePath(locale, SECTION_SEGMENT.menu[locale]) }, { label: page.title }]}
        >
          {table.pdf && (
            <a href={table.pdf.src} target="_blank" rel="noopener" className={buttonClass("light", "md", "mt-8")}>
              <Icons.Download /> {t("pdf")}
            </a>
          )}
        </PageBanner>

        <section className="container-x py-12 md:py-16">
          <div className="mx-auto max-w-3xl space-y-3 text-muted">
            {table.notes.map((n, i) => (
              <p key={i} className="text-sm">
                {n}
              </p>
            ))}
          </div>

          <div className="mb-6 mt-14 flex flex-wrap items-end justify-between gap-4">
            <h2 className="display text-4xl md:text-5xl">{t("allergenTable")}</h2>
            <AllergenFilter label={t("search")} />
          </div>
          <div className="overflow-x-auto rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead className="sticky top-0 bg-navy-900 text-white">
                <tr>
                  <th scope="col" className="sticky left-0 z-10 bg-navy-900 px-4 py-3 text-left">
                    {t("product")}
                  </th>
                  {table.columns.map((c) => (
                    <th key={c} scope="col" className="px-2 py-3 text-center text-xs font-extrabold leading-tight">
                      {allergenLabel(c, locale)}
                    </th>
                  ))}
                </tr>
              </thead>
              {sections.map((sec) => (
                <tbody key={sec}>
                  <tr>
                    <th colSpan={table.columns.length + 1} scope="colgroup" className="bg-amber-400 px-4 py-2 text-left text-xs font-extrabold uppercase tracking-wider text-navy-900">
                      {sec}
                    </th>
                  </tr>
                  {table.rows
                    .filter((r) => r.section === sec)
                    .map((r) => (
                      <tr key={r.name} data-allergen-row={r.name} className="border-b border-line even:bg-cream-50/60">
                        <th scope="row" className="sticky left-0 bg-inherit px-4 py-2.5 text-left font-bold">
                          {r.name}
                        </th>
                        {table.columns.map((c) => (
                          <td key={c} className="px-2 py-2.5 text-center">
                            {r.allergens.includes(c) ? (
                              <span className="inline-grid size-6 place-items-center rounded-full bg-amber-400 text-navy-900" title={`${t("contains")}: ${allergenLabel(c, locale)}`}>
                                <Icons.Check />
                                <span className="sr-only">
                                  {t("contains")}: {allergenLabel(c, locale)}
                                </span>
                              </span>
                            ) : null}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              ))}
            </table>
          </div>

          <h2 className="display mb-6 mt-16 text-4xl md:text-5xl">{t("nutritionTable")}</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {nutSections.map((sec) => (
              <div key={sec} className="overflow-x-auto rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
                <table className="w-full text-sm">
                  <caption className="bg-red-600 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-white">{sec}</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th scope="col" className="px-4 py-2">{t("product")}</th>
                      <th scope="col" className="px-2 py-2 text-right">{t("energy")}</th>
                      <th scope="col" className="px-2 py-2 text-right">{t("fat")}</th>
                      <th scope="col" className="px-2 py-2 text-right">{t("protein")}</th>
                      <th scope="col" className="px-4 py-2 text-right">{t("carbs")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.nutrition
                      .filter((r) => r.section === sec)
                      .map((r, i) => (
                        <tr key={i} data-allergen-row={r.name ?? ""} className="border-b border-line last:border-0">
                          <th scope="row" className="px-4 py-2 text-left font-bold">{r.name}</th>
                          <td className="px-2 py-2 text-right tabular-nums">
                            {num.format(r.kj)} / {num.format(r.kcal)}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{num.format(r.fat)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{num.format(r.protein)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{num.format(r.carbs)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {table.pdf && (
            <div className="mt-16">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <h2 className="display text-4xl md:text-5xl">{t("pdfView")}</h2>
                <a href={table.pdf.src} download className={buttonClass("dark", "md")}>
                  <Icons.Download /> {t("pdf")}
                </a>
              </div>
              <object data={`${table.pdf.src}#view=FitH`} type="application/pdf" className="h-[85vh] w-full rounded-[var(--radius-card)] border border-line bg-white">
                <p className="p-6">
                  <a href={table.pdf.src} className="font-bold text-red-600 underline">
                    {t("pdf")}
                  </a>
                </p>
              </object>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
