import { requireAccess } from "@/lib/access";
import { container } from "@doyuyo/infrastructure";
import { MediaLibrary } from "@/components/media/media-library";
import { listMedia } from "./actions";

export default async function MediaPage() {
  await requireAccess("media");
  const [initial, counts, usage] = await Promise.all([listMedia({ limit: 48 }), container().manageMedia.counts(), container().manageMedia.usageCounts()]);
  const total = usage.all;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">İçerik</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Medya</h1>
        <p className="mt-1 text-muted-foreground">
          {total} dosya · {usage.unused} tanesi sitede kullanılmıyor. Düzenlemek için bir dosyaya tıkla.
        </p>
      </header>
      <MediaLibrary initial={initial} counts={counts} usage={usage} />
    </div>
  );
}
