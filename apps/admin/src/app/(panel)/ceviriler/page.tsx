import { requireAccess } from "@/lib/access";
import { container } from "@doyuyo/infrastructure";
import { TextsView } from "@/components/translations/texts-view";

export default async function TranslationsPage() {
  await requireAccess("translations");
  const rows = await container().manageSiteTexts.load();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Görünürlük</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Çeviriler</h1>
        <p className="mt-1 text-muted-foreground">Sitenin genel metinleri. Türkçe ve İngilizce yan yana; her satırı ayrı ayrı kaydedersin.</p>
      </header>
      <TextsView rows={rows} />
    </div>
  );
}
