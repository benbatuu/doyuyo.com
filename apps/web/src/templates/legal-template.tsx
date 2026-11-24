import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { slugify, localePath, type Locale } from "@doyuyo/i18n";
import type { ContentNode, StaticPage } from "@doyuyo/core";
import { app } from "@/lib/data";
import { SiteHeader } from "@/components/layout/site-header";
import { PageBanner } from "@/components/blocks/page-banner";
import { PrintButton } from "@/components/ui/print-button";

/** "2. Politika Esasları", "2.1. Genel Esaslar" — short numbered lines in the legal texts act as headings. */
const NUMBERED = /^(\d+(?:\.\d+)*)\.?\s+(.{2,90})$/;

type Item = { kind: "h"; level: 2 | 3; id: string; num: string; text: string } | { kind: "p"; html: string } | { kind: "list"; items: string[] };

function structure(nodes: ContentNode[]): Item[] {
  const out: Item[] = [];
  const seen = new Set<string>();
  const id = (t: string) => {
    let base = slugify(t).slice(0, 60) || "bolum";
    while (seen.has(base)) base += "-x";
    seen.add(base);
    return base;
  };
  for (const n of nodes) {
    const raw = n.type === "heading" ? n.text : n.type === "paragraph" ? n.text : "";
    const m = raw.match(NUMBERED);
    if ((n.type === "heading" || n.type === "paragraph") && m && raw.length <= 95) {
      out.push({ kind: "h", level: m[1]!.includes(".") ? 3 : 2, id: id(raw), num: m[1]!, text: m[2]! });
    } else if (n.type === "heading") out.push({ kind: "h", level: 2, id: id(n.text), num: "", text: n.text });
    else if (n.type === "paragraph") out.push({ kind: "p", html: n.html });
    else if (n.type === "list") out.push({ kind: "list", items: n.items });
  }
  return out;
}

export async function LegalTemplate({ page, locale }: { page: StaticPage; locale: Locale }) {
  const [t, tn] = await Promise.all([getTranslations({ locale, namespace: "legal" }), getTranslations({ locale, namespace: "nav" })]);
  const others = (await Promise.all(["legal-kvkk", "legal-privacy"].map((k) => app().getStaticPage.byKey(k, locale)))).filter((p) => p && p.id !== page.id);
  const items = structure(page.sections.flatMap((s) => s.nodes));
  // First line often repeats the title ("… Politikası 1. Amaç ve Kapsam"): keep it as an intro paragraph.
  const toc = items.filter((i): i is Extract<Item, { kind: "h" }> => i.kind === "h" && i.level === 2);

  return (
    <>
      <SiteHeader locale={locale} alternates={page.alternates} overlay />
      <main id="main">
        <PageBanner title={page.title} image={page.banner} crumbs={[{ label: tn("home"), href: localePath(locale) }, { label: page.title }]} />
        <div className="container-x grid gap-10 py-12 md:py-16 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)_12rem]">
          <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
            {toc.length > 1 && (
              <nav aria-label={t("contents")} className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
                <p className="eyebrow mb-3 text-red-600">{t("contents")}</p>
                <ol className="space-y-1 text-sm">
                  {toc.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="flex gap-2 rounded-lg px-2 py-1.5 font-bold text-navy-700 hover:bg-cream-50 hover:text-navy-900">
                        {h.num && <span className="w-5 shrink-0 text-red-600">{h.num}</span>}
                        <span>{h.text}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </aside>

          <article className="min-w-0 rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] md:p-12">
            <div className="prose-doyuyo mx-auto max-w-[72ch] space-y-4 leading-relaxed text-navy-700">
              {items.map((it, i) =>
                it.kind === "h" ? (
                  it.level === 2 ? (
                    <h2 key={i} id={it.id} className="display !mt-12 scroll-mt-28 border-t border-line pt-8 text-3xl text-navy-900 first:!mt-0 first:border-0 first:pt-0">
                      {it.num && <span className="mr-3 text-red-600">{it.num}</span>}
                      {it.text}
                    </h2>
                  ) : (
                    <h3 key={i} id={it.id} className="!mt-8 scroll-mt-28 text-xl font-extrabold text-navy-900">
                      <span className="mr-2 text-red-600">{it.num}</span>
                      {it.text}
                    </h3>
                  )
                ) : it.kind === "p" ? (
                  <p key={i} dangerouslySetInnerHTML={{ __html: it.html }} />
                ) : (
                  <ul key={i} className="list-disc space-y-1 pl-5 marker:text-red-500">
                    {it.items.map((x, j) => (
                      <li key={j} dangerouslySetInnerHTML={{ __html: x }} />
                    ))}
                  </ul>
                ),
              )}
            </div>
          </article>

          <aside className="hidden space-y-3 xl:block">
            <div className="sticky top-24 space-y-3">
              <PrintButton label={t("print")} />
              {others.length > 0 && (
                <div className="rounded-[var(--radius-card)] bg-cream-50 p-5">
                  <p className="eyebrow mb-3">{t("other")}</p>
                  {others.map((o) => (
                    <Link key={o!.id} href={o!.path} className="block text-sm font-extrabold text-red-600 underline underline-offset-4">
                      {o!.title}
                    </Link>
                  ))}
                </div>
              )}
              <a href="#main" className="block text-sm font-bold text-muted hover:text-navy-900">
                ↑ {t("top")}
              </a>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
