import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SECTION_SEGMENT, isPublishedLocale, localePath } from "@doyuyo/i18n";
import { buttonClass } from "@doyuyo/ui";
import { SiteHeader } from "@/components/layout/site-header";

export default async function NotFound() {
  const raw = await getLocale();
  const locale = isPublishedLocale(raw) ? raw : "tr";
  const t = await getTranslations({ locale, namespace: "notFound" });
  return (
    <>
      <SiteHeader locale={locale} alternates={{ tr: "/tr", en: "/en" }} />
      <main id="main" className="container-x grid min-h-[70vh] place-items-center py-20 text-center">
        <div>
          <p className="display text-[clamp(6rem,22vw,16rem)] text-red-600">404</p>
          <h1 className="display mt-2 text-4xl md:text-6xl">{t("title")}</h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-muted">{t("text")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={localePath(locale, SECTION_SEGMENT.menu[locale])} className={buttonClass("primary", "lg")}>
              {t("toMenu")}
            </Link>
            <Link href={localePath(locale, SECTION_SEGMENT.branches[locale])} className={buttonClass("outline", "lg")}>
              {t("toBranches")}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
