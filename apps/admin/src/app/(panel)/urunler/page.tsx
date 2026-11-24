import { requireAccess } from "@/lib/access";
import { container } from "@doyuyo/infrastructure";
import { CatalogView } from "@/components/catalog/catalog-view";

export default async function MenuPage() {
  await requireAccess("catalog");
  const c = container().manageCatalog;
  const [categories, products] = await Promise.all([c.categories(), c.products({ limit: 60, offset: 0 })]);
  const total = categories.reduce((s, x) => s + x.productCount, 0);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Restoran</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Menü ve ürünler</h1>
        <p className="mt-1 text-muted-foreground">
          {categories.length} kategori · {total} ürün bağlantısı. Kategori sırasını ve ürünleri buradan yönet.
        </p>
      </header>
      <CatalogView categories={categories} initial={products} />
    </div>
  );
}
