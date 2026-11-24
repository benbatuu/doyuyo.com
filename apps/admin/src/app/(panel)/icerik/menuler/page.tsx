import { requireAccess } from "@/lib/access";
import { container } from "@doyuyo/infrastructure";
import { PUBLISHED_LOCALES } from "@doyuyo/i18n";
import { PagesHeader } from "@/components/pages/pages-header";
import { shortTitle } from "@/components/pages/page-list";
import { NavEditor, type PageOption } from "./nav-editor";

export default async function MenusPage() {
  await requireAccess("content");
  const c = container().managePages;
  const [pages, ...navs] = await Promise.all([c.list(), ...PUBLISHED_LOCALES.map((l) => c.getNav(l))]);
  const nav = Object.fromEntries(PUBLISHED_LOCALES.map((l, i) => [l, navs[i]!]));
  // Pages that can be linked, per locale (only those with an address in that language).
  const options: Record<string, PageOption[]> = Object.fromEntries(
    PUBLISHED_LOCALES.map((l) => [
      l,
      pages
        .filter((p) => p.locales[l]?.path)
        .map((p) => ({ id: p.id, title: shortTitle(p.locales[l]!.title), href: p.locales[l]!.path!, published: p.published, legal: p.key.startsWith("legal-") })),
    ]),
  );
  return (
    <div className="space-y-6">
      <PagesHeader title="Site menüleri" subtitle="Üst menü, alt menü ve yasal linkleri düzenle. Sürükle-bırak ile sırala ya da menüler arasında taşı." />
      <NavEditor initial={nav} options={options} locales={[...PUBLISHED_LOCALES]} />
    </div>
  );
}
