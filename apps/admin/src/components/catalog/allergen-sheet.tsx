"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { ALLERGEN_NAMES, type AdminNutrition } from "@doyuyo/core";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getProduct } from "@/app/(panel)/urunler/actions";
import { saveAllergens } from "@/app/(panel)/alerjenler/actions";
import { NutritionFields } from "./product-sheet";

type Draft = { allergens: string[]; nutrition: AdminNutrition | null };

/** Only allergens and 100 g nutrition. Name, price, categories and image are edited in "Menü ve ürünler". */
export function AllergenSheet({ id, onClose, onSaved }: { id: number | null; onClose: () => void; onSaved: (id: number, d: Draft) => void }) {
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (id === null) return;
    setLoading(true);
    setError("");
    getProduct(id).then((d) => {
      setLoading(false);
      if (!d) return setError("Ürün bulunamadı");
      setName(d.translations.tr?.name ?? d.key);
      const next = { allergens: d.allergens, nutrition: d.nutrition };
      setDraft(next);
      setSaved(JSON.stringify(next));
    });
  }, [id]);

  const dirty = !!draft && JSON.stringify(draft) !== saved;
  const toggle = (a: string) =>
    setDraft((d) => (d ? { ...d, allergens: d.allergens.includes(a) ? d.allergens.filter((x) => x !== a) : [...d.allergens, a] } : d));

  const save = () => {
    if (!draft || !dirty || id === null || pending) return;
    setError("");
    start(async () => {
      const r = await saveAllergens(id, draft.allergens, draft.nutrition);
      if (!r.ok) return setError(r.error);
      setSaved(JSON.stringify(draft));
      onSaved(id, draft);
    });
  };

  return (
    <Sheet open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="truncate pr-6">{name || "Ürün"}</SheetTitle>
          <SheetDescription>Alerjenler ve 100 g besin değerleri</SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {draft && (
          <div className="space-y-6 p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Alerjenler</span>
                <span className="tabular-nums text-muted-foreground">{draft.allergens.length} seçili</span>
              </div>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {ALLERGEN_NAMES.map((a) => {
                  const on = draft.allergens.includes(a);
                  return (
                    <li key={a}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(a)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                          on ? "border-red-200 bg-red-50 text-red-800" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        <span className={cn("grid size-5 shrink-0 place-items-center rounded border", on ? "border-red-500 bg-red-500 text-white" : "border-border")}>
                          {on && <Check className="size-3.5" />}
                        </span>
                        {a}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {draft.allergens.length === 0 && <p className="text-xs text-muted-foreground">Hiç alerjen seçili değil. Ürün alerjen içermiyorsa bunu boş bırakabilirsin.</p>}
            </div>

            <NutritionFields value={draft.nutrition} onChange={(n) => setDraft((d) => (d ? { ...d, nutrition: n } : d))} />

            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>
        )}

        {draft && (
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-background/95 p-4 backdrop-blur">
            <span className="text-xs text-muted-foreground">{dirty ? "Kaydedilmemiş değişiklik" : "Kaydedildi"}</span>
            <Button size="sm" onClick={save} disabled={!dirty || pending}>
              {pending && <Loader2 className="animate-spin" />} Kaydet
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
