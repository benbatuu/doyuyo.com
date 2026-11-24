"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import { SEO_DESC_RANGE, SEO_TITLE_RANGE, seoEffectiveTitle, type SeoRow } from "@doyuyo/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { field } from "@/components/catalog/product-sheet";
import { SITE_URL } from "@/lib/media";
import { cn } from "@/lib/utils";
import { saveSeo } from "@/app/(panel)/seo/actions";
import { KIND_LABEL } from "./seo-view";

/** Right-side editor for one page's search texts, with a Google result preview. */
export function SeoSheet({ row, onClose }: { row: SeoRow | null; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!row) return;
    setTitle(row.seoTitle);
    setDesc(row.seoDescription);
    setError("");
  }, [row]);

  const dirty = !!row && (title !== row.seoTitle || desc !== row.seoDescription);
  const save = () => {
    if (!row || !dirty || pending) return;
    setError("");
    start(async () => {
      const r = await saveSeo(row.kind, row.id, row.locale, { seoTitle: title, seoDescription: desc });
      if (!r.ok) return setError(r.error);
      setTitle(r.texts.seoTitle);
      setDesc(r.texts.seoDescription);
      router.refresh();
    });
  };

  const url = row ? `${SITE_URL}${row.path}` : "";
  const shown = row ? seoEffectiveTitle(row.name, title) : "";
  const tLen = title.trim().length;
  const dLen = desc.trim().length;

  return (
    <Sheet open={row !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "s") {
            e.preventDefault();
            save();
          }
        }}
      >
        <SheetHeader className="border-b p-5">
          <SheetTitle className="truncate pr-6">{row?.name}</SheetTitle>
          <SheetDescription className="flex items-center gap-2 text-xs">
            {row && <span>{KIND_LABEL[row.kind]} · {row.locale.toUpperCase()}{row.hidden && " · sitede gizli"}</span>}
            {row && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 truncate font-mono hover:text-foreground">
                {row.path} <ExternalLink className="size-3 shrink-0" />
              </a>
            )}
          </SheetDescription>
        </SheetHeader>

        {row && (
          <div className="space-y-6 p-5">
            {/* Google result preview */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Google önizlemesi</p>
              <div className="rounded-xl border bg-white p-4 text-left shadow-xs">
                <p className="truncate text-xs text-[#4d5156]">doyuyo.com{row.path.replace(/\//g, " › ").replace(/^ › /, " › ")}</p>
                <p className="mt-1 line-clamp-1 text-lg leading-snug text-[#1a0dab]">{shown}</p>
                <p className="mt-1 line-clamp-2 text-sm text-[#4d5156]">{desc.trim() || <span className="italic">Site, sayfa içeriğinden bir açıklama üretir.</span>}</p>
              </div>
            </div>

            <Labeled label="Başlık (title)" hint={<Count n={tLen} range={SEO_TITLE_RANGE} />}>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${row.name} | Doyuyo!`} className="h-10" />
              <Meter n={tLen} range={SEO_TITLE_RANGE} />
              {tLen > 0 && (tLen < SEO_TITLE_RANGE.min || tLen > SEO_TITLE_RANGE.max) && (
                <p className="text-xs text-amber-700">Ölçü dışında olduğu için sitede “{row.name} | Doyuyo!” kullanılır.</p>
              )}
            </Labeled>

            <Labeled label="Açıklama (meta description)" hint={<Count n={dLen} range={SEO_DESC_RANGE} />}>
              <textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Boş bırakırsan site içerikten kendisi yazar." className={cn(field, "resize-y")} />
              <Meter n={dLen} range={SEO_DESC_RANGE} />
            </Labeled>

            <p className="text-xs text-muted-foreground">Adres (URL) buradan değişmez; eski adresler yönlendirmelerle korunur.</p>
          </div>
        )}

        <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 border-t bg-background p-4">
          <span className="text-xs text-muted-foreground">{error ? <span className="text-destructive">{error}</span> : dirty ? "Kaydedilmemiş değişiklik · ⌘S" : "Kayıtlı"}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Kapat</Button>
            <Button onClick={save} disabled={!dirty || pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Kaydet
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Count({ n, range }: { n: number; range: { min: number; max: number } }) {
  const ok = n >= range.min && n <= range.max;
  return <span className={cn("tabular-nums", n && !ok && "text-amber-700")}>{n} / {range.min}–{range.max}</span>;
}

/** Bar that fills up to the max; green inside the range. */
function Meter({ n, range }: { n: number; range: { min: number; max: number } }) {
  const pct = Math.min(100, (n / range.max) * 100);
  const ok = n >= range.min && n <= range.max;
  return (
    <div className="h-1 overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", !n ? "bg-transparent" : ok ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Labeled({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        {hint && <span className="text-right text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
