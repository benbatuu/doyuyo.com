import Link from "next/link";
import { ChevronRight, Hammer } from "lucide-react";
import { requireAccess } from "@/lib/access";
import { container } from "@doyuyo/infrastructure";
import { PageList } from "@/components/pages/page-list";
import { PagesHeader } from "@/components/pages/pages-header";
import { Badge } from "@/components/ui/badge";

export default async function PagesIndex() {
  await requireAccess("content");
  const [pages, maintenance] = await Promise.all([container().managePages.list(), container().manageSettings.getMaintenance()]);
  const visible = pages.filter((p) => !p.key.startsWith("legal-"));
  const live = visible.filter((p) => p.published).length;
  return (
    <div className="space-y-6">
      <PagesHeader title="Sayfalar" subtitle={`${visible.length} sayfa · ${live} yayında. Düzenlemek için bir sayfaya tıkla.`} />
      <Link href="/icerik/bakim" className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:bg-muted/40">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-800">
          <Hammer className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Bakım sayfası</span>
          <span className="block text-xs text-muted-foreground">/bakim · yalnızca bakım modu açıkken çalışır</span>
        </span>
        <Badge variant={maintenance.enabled ? "default" : "outline"}>{maintenance.enabled ? "Bakımda" : "Kapalı"}</Badge>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
      <PageList pages={visible} empty="Henüz sayfa yok." />
    </div>
  );
}
