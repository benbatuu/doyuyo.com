import { requireAccess } from "@/lib/access";
import { container } from "@doyuyo/infrastructure";
import { AllergenView } from "@/components/catalog/allergen-view";

export default async function AllergensPage() {
  await requireAccess("catalog");
  const c = container().manageCatalog;
  const [categories, products] = await Promise.all([c.categories(), c.products({ limit: 300, offset: 0 })]);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Restoran</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Alerjenler ve besin değerleri</h1>
        <p className="mt-1 text-muted-foreground">
          Her ürünün alerjenleri ve 100 g besin değerleri. Satıra tıklayınca ürünü düzenlersin.
        </p>
      </header>
      <AllergenView categories={categories} products={products.items} total={products.total} />
    </div>
  );
}
