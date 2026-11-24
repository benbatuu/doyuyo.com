import { requireAccess } from "@/lib/access";
import { container } from "@doyuyo/infrastructure";
import { PageList } from "@/components/pages/page-list";

export default async function LegalIndex() {
  await requireAccess("content");
  const pages = (await container().managePages.list()).filter((p) => p.key.startsWith("legal-"));
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">İçerik</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Yasal metinler</h1>
        <p className="mt-1 text-muted-foreground">KVKK, gizlilik ve diğer yasal sayfalar. Değişiklikten önce hukuk onayı al.</p>
      </header>
      <PageList pages={pages} empty="Yasal metin yok." />
    </div>
  );
}
