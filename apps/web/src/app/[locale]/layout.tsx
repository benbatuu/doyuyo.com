import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Bricolage_Grotesque, Nunito_Sans } from "next/font/google";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DIRECTION, PUBLISHED_LOCALES, isPublishedLocale } from "@doyuyo/i18n";
import { getSite } from "@/lib/data";
import { organization, plain, truncate, website, graph } from "@doyuyo/seo";
import { ROBOTS_META, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/seo/json-ld";
import { app } from "@/lib/data";
import { SiteFooter } from "@/components/layout/site-footer";
import { MaintenanceScreen } from "@/components/layout/maintenance-screen";
import { CookieBanner } from "@/components/layout/cookie-banner";
import { RevealObserver } from "@/components/ui/reveal";
import { Analytics } from "@/components/layout/analytics";
import "../globals.css";

// Font option A (PLAN.md §3.2). Self-hosted by next/font: no request to Google at runtime.
const display = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-bricolage", display: "swap", axes: ["opsz", "wdth"] });
const sans = Nunito_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-nunito-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Doyuyo!",
  robots: ROBOTS_META,
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  formatDetection: { telephone: true, email: false, address: false },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/icons/safari-pinned-tab.svg", color: "#e63d30" }],
  },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#e63d30" };

/** Panel changes (contact, maintenance, menus) show up within a minute. */
export const revalidate = 60;

export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();
  setRequestLocale(locale);
  const [site, t, about, maint] = await Promise.all([
    getSite(locale),
    getTranslations({ locale, namespace: "cookie" }),
    app().getStaticPage.byKey("about", locale),
    app().manageSettings.getMaintenance(),
  ]);
  if (maint.enabled) {
    const mt = locale === "en" ? "en" : "tr";
    return (
      <html lang={locale} dir={DIRECTION[locale]} className={`${display.variable} ${sans.variable}`}>
        <head>
          <meta name="robots" content="noindex, nofollow" />
        </head>
        <body className="min-h-screen antialiased">
          <MaintenanceScreen site={site} title={maint.texts[mt].title} message={maint.texts[mt].message} lang={mt} />
        </body>
      </html>
    );
  }
  const aboutText = about?.sections.find((x) => x.key === "about-main")?.nodes.find((n) => n.type === "paragraph");
  const orgDescription = aboutText && aboutText.type === "paragraph" ? truncate(plain(aboutText.text), 300) : undefined;
  return (
    <html lang={locale} dir={DIRECTION[locale]} className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen antialiased">
        <JsonLd data={graph(organization(SITE_URL, site, orgDescription), website(SITE_URL, locale))} />
        <RevealObserver />
        {children}
        <SiteFooter locale={locale} />
        <Analytics />
        <CookieBanner text={site.cookie.text} accept={site.cookie.button} decline={t("decline")} />
      </body>
    </html>
  );
}
