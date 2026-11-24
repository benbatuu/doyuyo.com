"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { SiteTextRow } from "@doyuyo/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { field } from "@/components/catalog/product-sheet";
import { cn } from "@/lib/utils";
import { saveSiteText } from "@/app/(panel)/ceviriler/actions";

type Lang = "tr" | "en";
const LANGS: { id: Lang; label: string }[] = [
  { id: "tr", label: "Türkçe" },
  { id: "en", label: "English" },
];

/** Groups keep the order they first appear in. */
export function TextsView({ rows }: { rows: SiteTextRow[] }) {
  const groups = [...new Set(rows.map((r) => r.group))];
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g} className="space-y-2">
          <h2 className="text-sm font-semibold">{g}</h2>
          <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
            {rows.filter((r) => r.group === g).map((r) => (
              <TextRow key={r.key} row={r} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** One key, both languages. Each language saves on its own; only changed fields are sent. */
function TextRow({ row }: { row: SiteTextRow }) {
  const [vals, setVals] = useState<Record<Lang, string>>({ tr: row.tr, en: row.en });
  const [saved, setSaved] = useState<Record<Lang, string>>({ tr: row.tr, en: row.en });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const dirty = (l: Lang) => vals[l] !== saved[l];
  const anyDirty = dirty("tr") || dirty("en");

  const save = () => {
    if (!anyDirty || pending) return;
    setError("");
    start(async () => {
      for (const l of LANGS.map((x) => x.id).filter(dirty)) {
        const r = await saveSiteText(l, row.key, vals[l]);
        if (!r.ok) return setError(`${l.toUpperCase()}: ${r.error}`);
        setSaved((s) => ({ ...s, [l]: r.value }));
        setVals((v) => ({ ...v, [l]: r.value }));
      }
    });
  };

  return (
    <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,180px)_1fr]">
      <div className="min-w-0">
        <p className="text-sm font-medium">{row.label}</p>
        {row.hint && <p className="truncate font-mono text-[11px] text-muted-foreground">{row.hint}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {LANGS.map((l) => (
          <div key={l.id} className="min-w-0 space-y-1">
            <span className="flex items-center justify-between text-xs text-muted-foreground">
              {l.label}
              {dirty(l.id) && <span className="text-amber-700">değişti</span>}
            </span>
            {row.multiline ? (
              <textarea rows={2} value={vals[l.id]} onChange={(e) => setVals((v) => ({ ...v, [l.id]: e.target.value }))} className={cn(field, "resize-y")} />
            ) : (
              <Input value={vals[l.id]} onChange={(e) => setVals((v) => ({ ...v, [l.id]: e.target.value }))} className="h-9" />
            )}
          </div>
        ))}
        <div className="flex items-center justify-end gap-3 sm:col-span-2">
          {error && <span className="mr-auto text-xs text-destructive">{error}</span>}
          <Button size="sm" onClick={save} disabled={!anyDirty || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />} Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}
