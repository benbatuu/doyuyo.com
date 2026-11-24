import type { SiteSettings } from "@doyuyo/core";
import { Icons } from "@doyuyo/ui";
import { MediaImage } from "../ui/media-image";

const L = {
  tr: { badge: "Bakım çalışması", call: "Bizi arayın", mail: "E-posta", hq: "Genel merkez", order: "Siparişe açığız", orderHint: "Restoranlarımız açık. Online kanallardan sipariş verebilirsiniz.", follow: "Bizi takip edin" },
  en: { badge: "Maintenance", call: "Call us", mail: "E-mail", hq: "Head office", order: "We are taking orders", orderHint: "Our restaurants are open. You can order from our online channels.", follow: "Follow us" },
} as const;
const SOCIAL_LABEL: Record<string, string> = { instagram: "Instagram", youtube: "YouTube", twitter: "X (Twitter)", linkedin: "LinkedIn", facebook: "Facebook", tiktok: "TikTok" };

/**
 * Shown instead of every page while maintenance mode is on.
 * Brand, contact and order channels stay visible so nobody hits a dead end.
 */
export function MaintenanceScreen({ site, title, message, lang }: { site: SiteSettings; title: string; message: string; lang: "tr" | "en" }) {
  const t = L[lang];
  const orders = site.orderPlatforms.items;
  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-950 text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full bg-red-600/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 size-[26rem] rounded-full bg-amber-400/15 blur-3xl" aria-hidden="true" />

      <main id="main" className="container-x relative flex min-h-screen flex-col py-8 md:py-12">
        <header className="flex items-center justify-between gap-4">
          <div className="w-32 rounded-2xl bg-white p-3 md:w-40">
            <MediaImage media={site.logo} sizes="160px" className="h-auto w-full" alt="Doyuyo!" priority />
          </div>
          {site.phone && (
            <a href={site.phone.href} className="hidden items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-extrabold text-amber-400 transition hover:bg-white/15 sm:inline-flex">
              <Icons.Phone /> {site.phone.label}
            </a>
          )}
        </header>

        <section className="mx-auto mt-14 max-w-2xl text-center md:mt-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-navy-900">
            <span className="size-1.5 animate-pulse rounded-full bg-red-600" /> {t.badge}
          </span>
          <h1 className="display mt-6 text-5xl leading-[0.95] md:text-7xl">{title}</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/80 md:text-xl">{message}</p>
        </section>

        {orders.length > 0 && (
          <section className="mx-auto mt-14 w-full max-w-4xl" aria-labelledby="m-order">
            <div className="text-center">
              <h2 id="m-order" className="display text-3xl text-amber-400 md:text-4xl">{site.orderPlatforms.title || t.order}</h2>
              <p className="mt-2 text-white/70">{t.orderHint}</p>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {orders.map((o) => (
                <li key={o.href}>
                  <a href={o.href} target="_blank" rel="noopener noreferrer" className="group flex h-24 items-center justify-center rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-pop)] transition hover:-translate-y-1" aria-label={o.name}>
                    {o.logo ? <MediaImage media={o.logo} sizes="160px" className="max-h-12 w-auto object-contain" alt={o.name} /> : <span className="font-extrabold text-navy-900">{o.name}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mx-auto mt-12 flex w-full max-w-4xl flex-wrap justify-center gap-3">
          {site.phone && (
            <a href={site.phone.href} className="min-w-[240px] flex-1 rounded-[var(--radius-card)] bg-white/5 p-5 ring-1 ring-white/10 transition hover:bg-white/10">
              <Icons.Phone className="text-2xl text-amber-400" />
              <p className="eyebrow mt-3 text-white/50">{t.call}</p>
              <p className="display mt-1 text-3xl text-amber-400">{site.phone.label}</p>
            </a>
          )}
          {site.email && (
            <a href={`mailto:${site.email}`} className="min-w-[240px] flex-1 rounded-[var(--radius-card)] bg-white/5 p-5 ring-1 ring-white/10 transition hover:bg-white/10">
              <span className="text-2xl font-extrabold text-amber-400">@</span>
              <p className="eyebrow mt-3 text-white/50">{t.mail}</p>
              <p className="mt-1 break-all text-lg font-extrabold">{site.email}</p>
            </a>
          )}
          {site.headOffice && (
            <a href={site.headOffice.mapsUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="min-w-[240px] flex-1 rounded-[var(--radius-card)] bg-white/5 p-5 ring-1 ring-white/10 transition hover:bg-white/10">
              <Icons.MapPin className="text-2xl text-amber-400" />
              <p className="eyebrow mt-3 text-white/50">{t.hq}</p>
              <p className="mt-1 font-bold text-white/90">{site.headOffice.address}</p>
            </a>
          )}
        </section>

        {site.social.length > 0 && (
          <nav aria-label={t.follow} className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-2">
            <span className="eyebrow mr-1 text-white/50">{t.follow}</span>
            {site.social.map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold transition hover:bg-white/20">
                {SOCIAL_LABEL[s.network] ?? s.network} <Icons.External className="text-xs opacity-60" />
              </a>
            ))}
          </nav>
        )}

        <div className="min-h-12 flex-1" aria-hidden="true" />
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row">
          <p>{site.copyright}</p>
          {site.partnerLogo && (
            <a href="https://www.pardofood.com" target="_blank" rel="noopener noreferrer" className="block w-28 opacity-80 transition hover:opacity-100">
              <MediaImage media={site.partnerLogo} sizes="112px" className="h-auto w-full brightness-0 invert" alt="PardoFood" />
            </a>
          )}
        </footer>
      </main>
    </div>
  );
}
