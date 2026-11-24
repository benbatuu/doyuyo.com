import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Alternates } from "@doyuyo/core";
import { SECTION_SEGMENT, localePath, type Locale } from "@doyuyo/i18n";
import { buttonClass } from "@doyuyo/ui";
import { getSite } from "@/lib/data";
import { switcherTargets } from "@/lib/alternates";
import { MediaImage } from "../ui/media-image";
import { HeaderShell, MobileNav, OrderMenu } from "./header-client";
import { LanguageSwitcher } from "./language-switcher";

interface Props {
  locale: Locale;
  alternates: Alternates;
  /** Where the language switcher goes when this page has no translation. */
  fallback?: Alternates;
  /** Transparent header over a dark hero. */
  overlay?: boolean;
}

export async function SiteHeader({ locale, alternates, fallback, overlay }: Props) {
  const [site, t] = await Promise.all([getSite(locale), getTranslations({ locale, namespace: "nav" })]);
  const links = [{ label: t("menu"), href: localePath(locale, SECTION_SEGMENT.menu[locale]) }, ...site.headerNav];
  const targets = switcherTargets(alternates, fallback);

  return (
    <HeaderShell overlay={!!overlay}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        {t("skip")}
      </a>
      <div className="container-x flex h-16 items-center gap-4 md:h-20">
        <Link href={localePath(locale)} className="relative z-10 block w-32 shrink-0 md:w-40" aria-label={`Doyuyo! — ${t("home")}`}>
          <MediaImage media={site.logo} sizes="160px" className="h-auto w-full" priority alt="Doyuyo!" />
        </Link>

        <nav aria-label={t("main")} className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="rounded-full px-3.5 py-2 text-[0.95rem] font-bold transition-colors hover:bg-current/10">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <LanguageSwitcher current={locale} targets={targets} label={t("language")} />
          <div className="hidden sm:block">
            <OrderMenu
              label={t("order")}
              closeLabel={t("closeMenu")}
              platforms={site.orderPlatforms.items}
              className={buttonClass("primary", "sm", "group-data-[solid=false]/header:bg-white group-data-[solid=false]/header:text-red-600 group-data-[solid=false]/header:shadow-none")}
            />
          </div>
          <MobileNav
            links={links}
            openLabel={t("openMenu")}
            closeLabel={t("closeMenu")}
            orderLabel={t("order")}
            platforms={site.orderPlatforms.items}
            phone={site.phone}
          />
        </div>
      </div>
    </HeaderShell>
  );
}
