import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { BranchDetail, BranchSummary, CityDetail, CitySummary, StaticPage } from "@doyuyo/core";
import { SECTION_SEGMENT, localePath, type Locale } from "@doyuyo/i18n";
import { Icons, buttonClass } from "@doyuyo/ui";
import { getSite } from "@/lib/data";
import { SiteHeader } from "@/components/layout/site-header";
import { PageBanner } from "@/components/blocks/page-banner";
import { ContentNodes } from "@/components/blocks/content-nodes";
import { BranchExplorer, type ExplorerLabels } from "@/components/branches/branch-explorer";
import { BranchMap } from "@/components/branches/branch-map";
import { OpenStatus } from "@/components/branches/open-status";
import { OrderPlatforms } from "@/components/menu/order-platforms";
import { MediaImage } from "@/components/ui/media-image";

async function explorerLabels(locale: Locale): Promise<ExplorerLabels> {
  const t = await getTranslations({ locale, namespace: "branches" });
  return {
    search: t("search"),
    allCities: t("allCities"),
    nearMe: t("nearMe"),
    locating: t("locating"),
    locationDenied: t("locationDenied"),
    openNow: t("openNow"),
    closedNow: t("closedNow"),
    directions: t("directions"),
    details: t("details"),
    noResults: t("noResults"),
    count: t("count", { count: 999_999 }).replace("999999", "{count}").replace("999,999", "{count}").replace("999.999", "{count}"),
    list: t("list"),
    map: t("map"),
    more: t("more"),
  };
}

export async function BranchesTemplate({ locale, branches, cities, page }: { locale: Locale; branches: BranchSummary[]; cities: CitySummary[]; page: StaticPage | null }) {
  const [tn, tb, labels] = await Promise.all([getTranslations({ locale, namespace: "nav" }), getTranslations({ locale, namespace: "branches" }), explorerLabels(locale)]);
  const title = page?.title ?? tn("branches");
  return (
    <>
      <SiteHeader locale={locale} alternates={page?.alternates ?? {}} />
      <main id="main">
        <section className="container-x py-6 md:py-10 lg:max-w-none lg:px-0 lg:py-0">
        <BranchExplorer
          branches={branches}
          cities={cities}
          labels={labels}
          title={
            <div>
              <p className="eyebrow text-red-600">{tb("count", { count: branches.length })}</p>
              <h1 className="display mt-1 text-4xl md:text-5xl">{title.replace(/\s*-\s*Doyuyo!?$/i, "")}</h1>
            </div>
          }
        />
        </section>
      </main>
    </>
  );
}

export async function CityTemplate({ locale, city, cities }: { locale: Locale; city: CityDetail; cities: CitySummary[] }) {
  const [tn, tb, labels] = await Promise.all([getTranslations({ locale, namespace: "nav" }), getTranslations({ locale, namespace: "branches" }), explorerLabels(locale)]);
  const index = localePath(locale, SECTION_SEGMENT.branches[locale]);
  return (
    <>
      <SiteHeader locale={locale} alternates={city.alternates} />
      <main id="main">
        <section className="container-x py-6 md:py-10 lg:max-w-none lg:px-0 lg:py-0">
        <BranchExplorer
          branches={city.branches}
          cities={cities.filter((c) => c.id === city.id)}
          labels={labels}
          initialCity={city.id}
          title={
            <div>
              <nav aria-label="Breadcrumb" className="text-sm font-bold text-muted">
                <Link href={localePath(locale)} className="hover:text-navy-900">{tn("home")}</Link> /{" "}
                <Link href={index} className="hover:text-navy-900">{tn("branches")}</Link>
              </nav>
              <h1 className="display mt-1 text-4xl md:text-5xl">{city.name}</h1>
              <p className="eyebrow mt-1 text-red-600">{tb("count", { count: city.branches.length })}</p>
            </div>
          }
        />
        </section>
      </main>
    </>
  );
}

export async function BranchTemplate({ locale, branch }: { locale: Locale; branch: BranchDetail }) {
  const [tn, tb, site] = await Promise.all([getTranslations({ locale, namespace: "nav" }), getTranslations({ locale, namespace: "branches" }), getSite(locale)]);
  const index = localePath(locale, SECTION_SEGMENT.branches[locale]);
  return (
    <>
      <SiteHeader locale={locale} alternates={branch.alternates} fallback={{ tr: localePath("tr", SECTION_SEGMENT.branches.tr), en: localePath("en", SECTION_SEGMENT.branches.en) }} overlay />
      <main id="main">
        <PageBanner
          title={branch.name.replace(/^Doyuyo!\s*/, "")}
          eyebrow="Doyuyo!"
          image={branch.image}
          crumbs={[
            { label: tn("home"), href: localePath(locale) },
            { label: tn("branches"), href: index },
            ...(branch.city ? [{ label: branch.city.name, href: branch.city.path }] : []),
            { label: branch.name },
          ]}
        >
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white/95 px-1 py-0.5">
              <OpenStatus hours={branch.hours} openLabel={tb("openNow")} closedLabel={tb("closedNow")} />
            </span>
          </div>
        </PageBanner>

        <section className="container-x grid gap-8 py-12 md:py-16 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-6">
            <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
              <h2 className="eyebrow mb-2 text-muted">{tb("address")}</h2>
              <address className="text-lg font-bold not-italic">{branch.address}</address>
              <h2 className="eyebrow mb-2 mt-6 text-muted">{tb("hours")}</h2>
              <table className="w-full text-left">
                <tbody>
                  {branch.hours.map((h, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <th className="py-2 font-bold">{h.day}</th>
                      <td className="py-2 text-right tabular-nums">{h.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {branch.mapsUrl && (
                <a href={branch.mapsUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg", "mt-6 w-full")}>
                  <Icons.MapPin /> {tb("directions")}
                </a>
              )}
            </div>
            <div className="rounded-[var(--radius-card)] bg-cream-50 p-6">
              <p className="eyebrow mb-3">{site.orderPlatforms.title}</p>
              <OrderPlatforms items={site.orderPlatforms.items} compact />
            </div>
          </div>
          <div className="space-y-8">
            {branch.geo ? (
              <BranchMap points={[{ id: branch.id, lat: branch.geo.lat, lng: branch.geo.lng, name: branch.name, href: branch.path }]} className="aspect-[4/3] w-full" />
            ) : (
              <div className="grid aspect-[4/3] place-items-center rounded-[var(--radius-card)] bg-sky-50 p-8 text-center font-bold text-muted">{tb("mapUnavailable")}</div>
            )}
            {branch.description.length > 0 && <ContentNodes nodes={branch.description} className="text-lg" />}
          </div>
        </section>

        {branch.nearby.length > 0 && (
          <section className="bg-cream-50 py-16">
            <div className="container-x">
              <h2 className="display mb-8 text-4xl md:text-5xl">{tb("nearby")}</h2>
              <ul className="grid gap-4 md:grid-cols-3">
                {branch.nearby.map((b) => (
                  <li key={b.id} className="h-full lg:h-auto">
                    <Link href={b.path} className="group flex h-full flex-col overflow-hidden lg:block lg:h-auto rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] transition hover:-translate-y-1">
                      <div className="relative aspect-[16/9] bg-cream-100">
                        <MediaImage media={b.image} fill sizes="(min-width: 768px) 30vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
                      </div>
                      <div className="flex flex-1 flex-col p-5 lg:block">
                        <h3 className="text-lg font-extrabold">{b.name}</h3>
                        <p className="mt-1 text-sm text-muted">{b.address}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
