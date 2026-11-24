import Link from "next/link";
import { PAGE_TEMPLATE_LABEL, type PageListItem } from "@doyuyo/core";
import { PUBLISHED_LOCALES } from "@doyuyo/i18n";
import { ExternalLink, FileText, Home, MapPin, Scale, Table2, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { fmtDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { SITE_URL as SITE } from "@/lib/media";
const TEMPLATE_ICON: Record<string, LucideIcon> = { home: Home, menu: UtensilsCrossed, branches: MapPin, allergens: Table2 };

/** Shared table for /icerik and /yasal. */
export function PageList({ pages, empty }: { pages: PageListItem[]; empty: string }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2.5 font-medium">Sayfa</th>
              <th className="px-4 py-2.5 font-medium">Adres</th>
              <th className="px-4 py-2.5 font-medium">Diller</th>
              <th className="px-4 py-2.5 font-medium">Durum</th>
              <th className="px-4 py-2.5 text-right font-medium">Güncellendi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pages.map((p) => {
              const tr = p.locales.tr ?? Object.values(p.locales)[0];
              const Icon = p.key.startsWith("legal-") ? Scale : (TEMPLATE_ICON[p.template] ?? FileText);
              return (
                <tr key={p.id} className="relative transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <Link href={`/icerik/${p.id}`} className="font-medium after:absolute after:inset-0">
                          {shortTitle(tr?.title ?? p.key)}
                        </Link>
                        <p className="text-xs text-muted-foreground">{PAGE_TEMPLATE_LABEL[p.template] ?? p.template}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {tr?.path ? (
                      <a
                        href={`${SITE}${tr.path}`}
                        target="_blank"
                        rel="noopener"
                        className="relative z-10 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary"
                      >
                        {tr.path} <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {PUBLISHED_LOCALES.map((l) => (
                        <span
                          key={l}
                          title={p.locales[l] ? `${l.toUpperCase()} çevirisi var` : `${l.toUpperCase()} çevirisi yok`}
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase",
                            p.locales[l] ? "bg-muted text-foreground" : "border border-dashed text-muted-foreground/60",
                          )}
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <span className={cn("size-1.5 rounded-full", p.published ? "bg-ok" : "bg-muted-foreground/40")} />
                      {p.published ? "Yayında" : "Taslak"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">{fmtDate(p.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!pages.length && <p className="px-5 py-16 text-center text-sm text-muted-foreground">{empty}</p>}
      </div>
    </section>
  );
}

/** "Hakkımızda - Doyuyo!" -> "Hakkımızda" (titles carry the brand suffix for SEO). */
export const shortTitle = (t: string) => t.replace(/\s+[-|–]\s+Doyuyo!?$/i, "");
