"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { FileText, Loader2, PanelsTopLeft, Plus } from "lucide-react";
import { slugify } from "@doyuyo/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createPage } from "@/app/(panel)/icerik/actions";

const TABS = [
  { href: "/icerik", label: "Sayfalar", icon: FileText },
  { href: "/icerik/menuler", label: "Site menüleri", icon: PanelsTopLeft },
];

/** Shared header for /icerik and /icerik/menuler: title, sub-tabs and "Yeni sayfa". */
export function PagesHeader({ title, subtitle }: { title: string; subtitle: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">İçerik</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-1 text-muted-foreground">{subtitle}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Yeni sayfa
        </Button>
      </header>
      <nav className="flex gap-1 border-b">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors",
                active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="size-4" /> {t.label}
            </Link>
          );
        })}
      </nav>
      <NewPageDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function NewPageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [locale, setLocale] = useState<"tr" | "en">("tr");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setError("");
  }, [open]);

  const effective = slugify(slugTouched ? slug : title);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const r = await createPage({ locale, title, slug: effective });
      if (!r.ok) return setError(r.error);
      onOpenChange(false);
      router.push(`/icerik/${r.id}`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Yeni sayfa</DialogTitle>
            <DialogDescription>Sayfa taslak olarak oluşur. İçeriği ekleyip yayına aldığında sitede görünür.</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Dil</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(["tr", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  aria-pressed={locale === l}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    locale === l ? "border-foreground/25 bg-muted" : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {l === "tr" ? "Türkçe" : "English"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="np-title" className="text-xs font-medium text-muted-foreground">
              Başlık
            </label>
            <Input id="np-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ör. Kampanyalar" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="np-slug" className="text-xs font-medium text-muted-foreground">
              Adres
            </label>
            <div className="flex items-center rounded-md border shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
              <span className="pl-3 font-mono text-sm text-muted-foreground">/{locale}/</span>
              <input
                id="np-slug"
                value={slugTouched ? slug : effective}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="kampanyalar"
                className="h-9 min-w-0 flex-1 bg-transparent pr-3 font-mono text-sm outline-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Sitede: <span className="font-mono">/{locale}/{effective || "…"}</span>
            </p>
          </div>

          {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={pending || !title.trim() || !effective}>
              {pending && <Loader2 className="animate-spin" />} Oluştur
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
