"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { ALLERGEN_NAMES, type AdminCategory, type AdminProductRow } from "@doyuyo/core";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AllergenSheet } from "./allergen-sheet";

const SHORT: Record<string, string> = {
  Gluten: "Glüten",
  Yumurta: "Yumurta",
  Balık: "Balık",
  "Yer Fıstığı": "Yer f.",
  Kabuklular: "Kabuklu",
  "Sert Kabuklu Meyveler": "Sert k.m.",
  Soya: "Soya",
  Süt: "Süt",
  Kereviz: "Kereviz",
  Hardal: "Hardal",
  Susam: "Susam",
  Sülfitler: "Sülfit",
  "Acı Bakla": "Acı bakla",
  Yumuşakçalar: "Yumuşakç.",
};

export function AllergenView({ categories, products, total }: { categories: AdminCategory[]; products: AdminProductRow[]; total: number }) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<number | "none" | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [rows, setRows] = useState(products);

  const list = useMemo(() => {
    const t = q.trim().toLocaleLowerCase("tr");
    return rows.filter((p) => {
      if (t && !p.name.toLocaleLowerCase("tr").includes(t)) return false;
      if (only === "none") return p.allergens.length === 0 && !p.nutrition;
      if (only !== null) return p.categoryIds.includes(only);
      return true;
    });
  }, [rows, q, only]);

  const missing = rows.filter((p) => !p.nutrition && p.allergens.length === 0).length;
  const catCount = (id: number) => rows.filter((p) => p.categoryIds.includes(id)).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Ürün" value={total} />
        <Stat label="Bilgisi eksik" value={missing} tone={missing ? "warn" : "ok"} hint="Alerjen ve besin boş" />
        <Stat label="Besin değeri girili" value={rows.filter((p) => p.nutrition).length} hint="100 g başına" />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <div className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip active={only === null} onClick={() => setOnly(null)}>Tümü</Chip>
          <Chip active={only === "none"} onClick={() => setOnly("none")} tone="warn">Eksik bilgi</Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={only === c.id} onClick={() => setOnly(c.id)} count={catCount(c.id)}>
              {c.name}
            </Chip>
          ))}
        </div>
        <div className="relative w-full shrink-0 sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün ara" className="h-9 bg-card pl-9" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="sticky left-0 z-30 w-64 min-w-64 max-w-64 bg-card px-4 py-2.5 text-left font-medium shadow-[inset_-1px_0_0_var(--color-line)]">Ürün</th>
              {ALLERGEN_NAMES.map((a) => (
                <th key={a} className="px-1 py-2.5 text-center font-medium" title={a}>
                  <span className="mx-auto block w-14 -rotate-0 truncate text-[10px] leading-tight">{SHORT[a]}</span>
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-medium">Kalori</th>
              <th className="px-3 py-2.5 text-right font-medium">Yağ</th>
              <th className="px-3 py-2.5 text-right font-medium">Karb.</th>
              <th className="px-3 py-2.5 text-right font-medium">Protein</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.map((p) => {
              const none = p.allergens.length === 0 && !p.nutrition;
              return (
                <tr key={p.id} className="group relative cursor-pointer hover:bg-muted/40" onClick={() => setOpen(p.id)}>
                  <td className="sticky left-0 z-20 w-64 min-w-64 max-w-64 bg-card px-4 py-2.5 shadow-[inset_-1px_0_0_var(--color-line)] group-hover:bg-muted/40">
                    <span className="flex min-w-0 items-center gap-2">
                      {none && <AlertTriangle className="size-3.5 shrink-0 text-amber-500" aria-label="Bilgi eksik" />}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{p.name}</span>
                      </span>
                    </span>
                  </td>
                  {ALLERGEN_NAMES.map((a) => (
                    <td key={a} className="px-1 py-2.5 text-center">
                      {p.allergens.includes(a) ? <span className="mx-auto block size-2.5 rounded-full bg-red-500" title={a} /> : <span className="mx-auto block size-2.5 rounded-full bg-muted" />}
                    </td>
                  ))}
                  <Num v={p.nutrition?.kcal} unit="" />
                  <Num v={p.nutrition?.fat} unit="g" />
                  <Num v={p.nutrition?.carbs} unit="g" />
                  <Num v={p.nutrition?.protein} unit="g" />
                </tr>
              );
            })}
            {!list.length && (
              <tr>
                <td colSpan={ALLERGEN_NAMES.length + 5} className="px-4 py-14 text-center text-muted-foreground">
                  Bu filtrede ürün yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AllergenSheet
        id={open}
        onClose={() => setOpen(null)}
        onSaved={(id, d) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, allergens: d.allergens, nutrition: d.nutrition } : r)))}
      />
    </div>
  );
}

function Num({ v, unit }: { v: number | null | undefined; unit: string }) {
  return <td className={cn("whitespace-nowrap px-3 py-2.5 text-right tabular-nums", v == null && "text-muted-foreground/50")}>{v == null ? "—" : `${v}${unit ? ` ${unit}` : ""}`}</td>;
}

function Stat({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: "warn" | "ok" }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", tone === "warn" && "text-amber-600")}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Chip({ active, onClick, children, count, tone }: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number; tone?: "warn" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? (tone === "warn" ? "border-amber-300 bg-amber-50 text-amber-800" : "border-foreground/20 bg-muted text-foreground") : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {children}
      {count !== undefined && <span className="tabular-nums text-muted-foreground">{count}</span>}
    </button>
  );
}
