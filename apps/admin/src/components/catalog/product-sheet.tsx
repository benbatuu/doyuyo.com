"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { ALLERGEN_NAMES, type AdminCategory, type AdminNutrition, type AdminProductDetail, type AdminProductPatch, type AdminProductRow } from "@doyuyo/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MediaPicker } from "@/components/media/media-picker";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { getProduct, saveProduct } from "@/app/(panel)/urunler/actions";

type Tr = AdminProductPatch["translations"][keyof AdminProductPatch["translations"]];
const EMPTY: NonNullable<Tr> = { name: "", shortDescription: "", description: "", imageAlt: "" };
const LOCALES = [
  { id: "tr", label: "Türkçe" },
  { id: "en", label: "English" },
] as const;
export const field =
  "w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Right-side editor for one product. Saves through the server (rules checked there too). */
export function ProductSheet({ id, categories, onClose, onSaved }: { id: number | null; categories: AdminCategory[]; onClose: () => void; onSaved: (row: AdminProductRow) => void }) {
  const [detail, setDetail] = useState<AdminProductDetail | null>(null);
  const [draft, setDraft] = useState<AdminProductPatch | null>(null);
  const [saved, setSaved] = useState("");
  const [locale, setLocale] = useState<"tr" | "en">("tr");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    if (id === null) return;
    setLoading(true);
    setError("");
    getProduct(id).then((d) => {
      setLoading(false);
      if (!d) return setError("Ürün bulunamadı");
      setDetail(d);
      const patch: AdminProductPatch = {
        published: d.published,
        priceKurus: d.priceKurus,
        showPrice: d.showPrice,
        spiceLevel: d.spiceLevel,
        imageId: d.imageId,
        categoryIds: d.categoryIds,
        allergens: d.allergens,
        nutrition: d.nutrition,
        translations: Object.fromEntries(LOCALES.map((l) => [l.id, { ...EMPTY, ...d.translations[l.id] }])) as AdminProductPatch["translations"],
      };
      setDraft(patch);
      setSaved(JSON.stringify(patch));
    });
  }, [id]);

  const dirty = !!draft && JSON.stringify(draft) !== saved;
  const set = (p: Partial<AdminProductPatch>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const setT = (k: keyof NonNullable<Tr>, v: string) =>
    setDraft((d) => (d ? { ...d, translations: { ...d.translations, [locale]: { ...(d.translations[locale] ?? EMPTY), [k]: v } } } : d));
  const cur = draft?.translations[locale] ?? EMPTY;

  const toggleCat = (cid: number) => {
    if (!draft) return;
    const has = draft.categoryIds.includes(cid);
    set({ categoryIds: has ? draft.categoryIds.filter((x) => x !== cid) : [...draft.categoryIds, cid] });
  };
  const moveCat = (cid: number, dir: -1 | 1) => {
    if (!draft) return;
    const arr = [...draft.categoryIds];
    const i = arr.indexOf(cid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    set({ categoryIds: arr });
  };

  const save = () => {
    if (!draft || !dirty || id === null || pending) return;
    setError("");
    start(async () => {
      const r = await saveProduct(id, draft);
      if (!r.ok) return setError(r.error);
      setSaved(JSON.stringify(draft));
      const d = await getProduct(id);
      if (d) {
        setDetail(d);
        onSaved({
          id: d.id,
          key: d.key,
          name: d.translations.tr?.name ?? d.key,
          published: d.published,
          priceKurus: d.priceKurus,
          showPrice: d.showPrice,
          imagePath: d.imagePath,
          categoryIds: d.categoryIds,
          sort: 0,
          allergens: d.allergens,
          nutrition: d.nutrition,
        });
      }
    });
  };

  return (
    <Sheet open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="truncate pr-6">{draft?.translations.tr?.name || detail?.key || "Ürün"}</SheetTitle>
          <SheetDescription className="font-mono text-xs">{detail?.key}</SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {draft && detail && (
          <div className="space-y-6 p-5">
            {/* Image */}
            <div className="flex gap-4">
              <button type="button" onClick={() => setPicker(true)} className="group relative size-28 shrink-0 overflow-hidden rounded-xl border bg-muted">
                {detail.imagePath && draft.imageId === detail.imageId ? (
                  <img src={mediaUrl(detail.imagePath)} alt="" className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-xs text-muted-foreground">Görsel seç</span>
                )}
                <span className="absolute inset-0 grid place-items-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">Değiştir</span>
              </button>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Görsel açıklaması (alt)</span>
                  <input value={cur.imageAlt} onChange={(e) => setT("imageAlt", e.target.value)} placeholder="Ör. Çıtır tavuk ve patates" className={cn(field, "h-9")} />
                </div>
                <p className="text-xs text-muted-foreground">Görsel de medya kütüphanesinden seçilir.</p>
              </div>
            </div>

            {/* Text per locale */}
            <div>
              <div className="flex gap-1 border-b">
                {LOCALES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLocale(l.id)}
                    className={cn("-mb-px border-b-2 px-3 pb-2 text-sm font-medium", l.id === locale ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <div className="space-y-4 pt-4">
                <Labeled label="Ürün adı">
                  <Input value={cur.name} onChange={(e) => setT("name", e.target.value)} className="h-10 font-semibold" />
                </Labeled>
                <Labeled label="Kısa açıklama" hint={`${cur.shortDescription.length}/300`}>
                  <textarea rows={2} value={cur.shortDescription} onChange={(e) => setT("shortDescription", e.target.value)} className={cn(field, "resize-y")} />
                </Labeled>
                <Labeled label="Açıklama" hint={`${cur.description.length}/3000`}>
                  <textarea rows={4} value={cur.description} onChange={(e) => setT("description", e.target.value)} className={cn(field, "resize-y")} />
                </Labeled>
              </div>
            </div>

            {/* Price and flags */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Labeled label="Fiyat (₺)">
                <Input
                  inputMode="decimal"
                  value={draft.priceKurus === null ? "" : (draft.priceKurus / 100).toString()}
                  onChange={(e) => {
                    const v = e.target.value.replace(",", ".").trim();
                    set({ priceKurus: v === "" ? null : Math.round(Number(v) * 100) });
                  }}
                  placeholder="0,00"
                  className="h-10 tabular-nums"
                />
              </Labeled>
              <Labeled label="Acı seviyesi">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set({ spiceLevel: n === 0 ? null : n })}
                      className={cn("h-10 flex-1 rounded-md border text-sm font-semibold", (draft.spiceLevel ?? 0) === n ? "border-foreground/25 bg-muted" : "text-muted-foreground hover:bg-muted/60")}
                    >
                      {n === 0 ? "—" : n}
                    </button>
                  ))}
                </div>
              </Labeled>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label="Yayında" on={draft.published} onChange={(v) => set({ published: v })} />
              <Toggle label="Fiyatı göster" on={draft.showPrice && draft.priceKurus !== null} disabled={draft.priceKurus === null} onChange={(v) => set({ showPrice: v })} />
            </div>

            {/* Categories */}
            <Labeled label="Kategoriler" hint="İlk seçilen ana kategoridir, ürün adresi onunla oluşur.">
              <ul className="divide-y rounded-lg border">
                {categories.map((c) => {
                  const on = draft.categoryIds.includes(c.id);
                  const idx = draft.categoryIds.indexOf(c.id);
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleCat(c.id)}
                        aria-pressed={on}
                        className={cn("grid size-5 place-items-center rounded border", on ? "border-primary bg-primary text-primary-foreground" : "border-border")}
                      >
                        {on && <Check className="size-3.5" />}
                      </button>
                      <span className={cn("flex-1 text-sm", !on && "text-muted-foreground")}>{c.name}</span>
                      {on && idx === 0 && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">Ana</span>}
                      {on && (
                        <span className="flex gap-0.5">
                          <button type="button" disabled={idx <= 0} onClick={() => moveCat(c.id, -1)} className="rounded px-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label="Ana kategori yap">
                            ↑
                          </button>
                          <button type="button" disabled={idx < 0 || idx >= draft.categoryIds.length - 1} onClick={() => moveCat(c.id, 1)} className="rounded px-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label="Aşağı taşı">
                            ↓
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Labeled>

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

        <MediaPicker
          folder="product"
          open={picker}
          onOpenChange={setPicker}
          onPick={(m) => set({ imageId: m.id })}
        />
      </SheetContent>
    </Sheet>
  );
}

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        {hint && <span className="tabular-nums text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, on, disabled, onChange }: { label: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium disabled:opacity-50"
    >
      {label}
      <span className={cn("relative h-5 w-9 rounded-full transition-colors", on ? "bg-ok" : "bg-muted-foreground/30")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-all", on ? "left-4.5" : "left-0.5")} />
      </span>
    </button>
  );
}

type NutKey = keyof AdminNutrition;
const NUT: { key: NutKey; label: string; unit: string }[] = [
  { key: "kcal", label: "Kalori", unit: "kcal" },
  { key: "kj", label: "Enerji", unit: "kJ" },
  { key: "fat", label: "Yağ", unit: "g" },
  { key: "carbs", label: "Karbonhidrat", unit: "g" },
  { key: "protein", label: "Protein", unit: "g" },
];

/** Five values per 100 g. Saved all together or not at all (the site needs a complete row). */
export function NutritionFields({ value, onChange }: { value: AdminNutrition | null; onChange: (n: AdminNutrition | null) => void }) {
  const cur: AdminNutrition = value ?? { kcal: null, kj: null, fat: null, carbs: null, protein: null };
  const filled = NUT.filter((n) => cur[n.key] !== null).length;
  const partial = filled > 0 && filled < NUT.length;
  const setN = (k: NutKey, raw: string) => {
    const v = raw.replace(",", ".").trim();
    const next = { ...cur, [k]: v === "" ? null : Number(v) };
    onChange(Object.values(next).every((x) => x === null) ? null : next);
  };
  return (
    <Labeled label="Besin değerleri (100 g)" hint={partial ? "Beşi birden girilmeli" : filled ? "Tam" : "Boş"}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {NUT.map((n) => (
          <label key={n.key} className="space-y-1">
            <span className="block text-[11px] font-medium text-muted-foreground">
              {n.label} <span className="text-muted-foreground/70">({n.unit})</span>
            </span>
            <input
              inputMode="decimal"
              value={cur[n.key] === null ? "" : String(cur[n.key])}
              onChange={(e) => setN(n.key, e.target.value)}
              className={cn(field, "h-9 tabular-nums", partial && cur[n.key] === null && "border-amber-400")}
            />
          </label>
        ))}
      </div>
    </Labeled>
  );
}
