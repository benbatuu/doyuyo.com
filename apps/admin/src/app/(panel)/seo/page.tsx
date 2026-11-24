import { requireAccess } from "@/lib/access";
import { container } from "@doyuyo/infrastructure";
import { SEO_KINDS, type SeoKind } from "@doyuyo/core";
import { SeoView, type SeoFilters } from "@/components/seo/seo-view";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function SeoPage({ searchParams }: { searchParams: Search }) {
  await requireAccess("seo");
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const kind = (SEO_KINDS as readonly string[]).includes(one("kind")) ? (one("kind") as SeoKind) : undefined;
  const filters: SeoFilters = {
    locale: one("lang") === "en" ? "en" : "tr",
    kind,
    issues: one("issues") === "1",
    q: one("q").slice(0, 100),
    page: Math.max(1, Number(one("page")) || 1),
  };
  const data = await container().manageSeo.list(filters);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Görünürlük</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">SEO</h1>
        <p className="mt-1 text-muted-foreground">
          Google’da görünen başlık ve açıklamalar. Satıra tıklayınca düzenlersin; boş açıklamayı site ürün ve şube bilgisinden kendisi üretir.
        </p>
      </header>
      <SeoView data={data} filters={filters} />
    </div>
  );
}
