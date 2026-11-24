import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@doyuyo/i18n";
import { Icons } from "@doyuyo/ui";
import { getSite } from "@/lib/data";
import { MediaImage } from "../ui/media-image";
import { FooterAccordion, type FooterGroup } from "./footer-accordion";
import { CookieSettings } from "./analytics";

const SOCIAL_LABEL: Record<string, string> = { instagram: "Instagram", youtube: "YouTube", twitter: "X (Twitter)", linkedin: "LinkedIn" };

export async function SiteFooter({ locale }: { locale: Locale }) {
  const [site, t] = await Promise.all([getSite(locale), getTranslations({ locale, namespace: "footer" })]);
  const groups: FooterGroup[] = [
    {
      id: "explore",
      title: t("explore"),
      children: (
        <ul className="space-y-2">
          {site.footerNav.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="font-bold hover:text-amber-400">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "follow",
      title: t("follow"),
      children: (
        <ul className="space-y-2">
          {site.social.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-bold hover:text-amber-400">
                {SOCIAL_LABEL[s.network] ?? s.network} <Icons.External className="text-sm opacity-60" />
              </a>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "legal",
      title: t("legal"),
      children: (
        <ul className="space-y-2 text-sm">
          {site.legalNav.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-white/80 hover:text-white">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      ),
    },
  ];
  return (
    <footer className="relative overflow-hidden bg-navy-950 text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-red-600/20 blur-3xl" aria-hidden="true" />
      <div className="container-x relative grid gap-8 py-12 md:py-16 lg:grid-cols-12 lg:gap-12 lg:py-20">
        <div className="lg:col-span-4">
          <div className="w-36 rounded-2xl bg-white p-3 lg:w-40">
            <MediaImage media={site.logo} sizes="160px" className="h-auto w-full" alt="Doyuyo!" />
          </div>
          {site.headOffice && (
            <a href={site.headOffice.mapsUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="mt-6 flex max-w-xs gap-3 text-white/80 hover:text-white lg:mt-8">
              <Icons.MapPin className="mt-1 shrink-0 text-amber-400" />
              <span>{site.headOffice.address}</span>
            </a>
          )}
          {site.phone && (
            <a href={site.phone.href} className="display mt-5 inline-flex items-center gap-3 text-3xl text-amber-400 hover:text-white lg:mt-6 lg:text-4xl">
              <Icons.Phone className="text-2xl" /> {site.phone.label}
            </a>
          )}
        </div>
        {/* tablet + mobile: one-open accordion */}
        <div className="lg:hidden">
          <FooterAccordion groups={groups} />
        </div>
        {/* desktop: unchanged columns */}
        <nav aria-label={t("explore")} className="hidden lg:col-span-3 lg:col-start-6 lg:block">
          <p className="eyebrow mb-4 text-white/50">{t("explore")}</p>
          {groups[0]!.children}
        </nav>
        <div className="hidden lg:col-span-3 lg:block">
          <p className="eyebrow mb-4 text-white/50">{t("follow")}</p>
          {groups[1]!.children}
          <p className="eyebrow mb-4 mt-10 text-white/50">{t("legal")}</p>
          {groups[2]!.children}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-start justify-between gap-4 py-6 text-sm text-white/60 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p>{site.copyright}</p>
            <CookieSettings label={t("cookieSettings")} />
          </div>
          {site.partnerLogo && (
            <a href="https://www.pardofood.com" target="_blank" rel="noopener noreferrer" className="block w-28 opacity-80 transition hover:opacity-100">
              <MediaImage media={site.partnerLogo} sizes="112px" className="h-auto w-full brightness-0 invert" alt="PardoFood" />
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
