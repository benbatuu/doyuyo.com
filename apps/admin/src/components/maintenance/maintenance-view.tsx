"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import type { MaintenanceLocale, MaintenanceSettings } from "@doyuyo/core";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { field } from "@/components/catalog/product-sheet";
import { SITE_URL } from "@/lib/media";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { saveMaintenanceTexts } from "@/app/(panel)/icerik/bakim/actions";

const LANGS: { id: MaintenanceLocale; label: string }[] = [
  { id: "tr", label: "Türkçe" },
  { id: "en", label: "English" },
];

export function MaintenanceView({ initial }: { initial: MaintenanceSettings }) {
  const [m, setM] = useState(initial);
  const [lang, setLang] = useState<MaintenanceLocale>("tr");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const setText = (p: Partial<{ title: string; message: string }>) => setM((x) => ({ ...x, texts: { ...x.texts, [lang]: { ...x.texts[lang], ...p } } }));
  const cur = m.texts[lang];

  const save = () =>
    start(async () => {
      setMsg("");
      const r = await saveMaintenanceTexts(m.texts);
      setMsg(r.ok ? "Kaydedildi" : r.error);
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-5 rounded-xl border bg-card p-5 shadow-xs">
        <div className={cn("flex items-center justify-between gap-3 rounded-lg border p-3", m.enabled && "border-amber-300 bg-amber-50")}>
          <span>
            <span className="block text-sm font-medium">{m.enabled ? "Bakım modu açık" : "Bakım modu kapalı"}</span>
            <span className="block text-xs text-muted-foreground">Açıp kapatmak için Ayarlar’a git.</span>
          </span>
          <Link href="/ayarlar" className="text-sm font-medium underline underline-offset-2">
            Ayarlar
          </Link>
        </div>

        <div className="flex gap-1 border-b">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLang(l.id)}
              className={cn("-mb-px border-b-2 px-3 pb-2 text-sm font-medium", l.id === lang ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              {l.label}
            </button>
          ))}
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Başlık</span>
          <Input value={cur.title} onChange={(e) => setText({ title: e.target.value })} className="h-10" />
        </label>
        <label className="block space-y-1.5">
          <span className="flex justify-between text-xs font-medium text-muted-foreground">
            Mesaj <span className="font-normal">{cur.message.length}/400</span>
          </span>
          <textarea rows={3} value={cur.message} onChange={(e) => setText({ message: e.target.value })} className={cn(field, "resize-y")} />
        </label>

        <div className="flex items-center justify-end gap-3">
          {msg && <span className={cn("mr-auto text-xs", msg === "Kaydedildi" ? "text-emerald-700" : "text-destructive")}>{msg}</span>}
          <Button onClick={save} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />} Kaydet
          </Button>
        </div>
      </section>

      <aside className="space-y-3">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Önizleme ({lang.toUpperCase()})</p>
          <div className="mt-3 rounded-lg bg-amber-50 p-5 text-center">
            <p className="font-extrabold text-red-600">Doyuyo!</p>
            <p className="mt-3 text-lg font-extrabold">{cur.title || "—"}</p>
            <p className="mt-2 text-sm text-navy-900/80">{cur.message || "—"}</p>
            <p className="mt-3 text-[11px] text-muted-foreground">+ logo, telefon, e-posta, adres, sipariş kanalları ve sosyal medya (Ayarlar’dan)</p>
          </div>
        </div>
        <a href={`${SITE_URL}/${lang}/bakim`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border bg-card p-4 text-sm shadow-xs hover:bg-muted/40">
          <span>
            Canlı sayfa
            <span className="block font-mono text-[11px] text-muted-foreground">/{lang}/bakim</span>
          </span>
          <ExternalLink className="size-4 text-muted-foreground" />
        </a>
        <p className="text-xs text-muted-foreground">/bakim adresi yalnızca bakım modu açıkken çalışır; kapalıyken 404 döner.</p>
      </aside>
    </div>
  );
}
