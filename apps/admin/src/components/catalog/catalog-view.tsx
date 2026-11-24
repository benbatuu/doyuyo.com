"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Layers, Loader2, Search, Shuffle, Utensils } from "lucide-react";
import type { AdminCategory, AdminProductRow } from "@doyuyo/core";
import { Input } from "@/components/ui/input";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { listProducts, reorderCategories, reorderProducts, setCategoryPublished } from "@/app/(panel)/urunler/actions";
import { ProductSheet } from "./product-sheet";

type Filter = number | "all" | "none";
const fmtPrice = (k: number | null) => (k === null ? "—" : `${(k / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`);

export function CatalogView({ categories: initialCats, initial }: { categories: AdminCategory[]; initial: { items: AdminProductRow[]; total: number } }) {
  const [cats, setCats] = useState(initialCats);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AdminProductRow[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [open, setOpen] = useState<number | null>(null);
  const [loading, start] = useTransition();
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const first = useRef(true);

  const load = (f: Filter, q: string) =>
    start(async () => {
      const r = await listProducts({ categoryId: f === "all" ? undefined : f, search: q });
      setItems(r.items);
      setTotal(r.total);
    });

  // Skip the first run: server data is already there.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => load(filter, search), search ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search]);

  const currentCat = typeof filter === "number" ? cats.find((c) => c.id === filter) : null;
  const orderable = !!currentCat && !search;

  const moveCat = async (i: number, to: number) => {
    if (to < 0 || to >= cats.length) return;
    const next = [...cats];
    const [c] = next.splice(i, 1);
    next.splice(to, 0, c!);
    setCats(next);
    await reorderCategories(next.map((c) => c.id));
  };
  const toggleCat = async (c: AdminCategory) => {
    setCats((cs) => cs.map((x) => (x.id === c.id ? { ...x, published: !x.published } : x)));
    await setCategoryPublished(c.id, !c.published);
  };

  const dropOn = async (target: number) => {
    if (dragId === null || dragId === target) return;
    const from = items.findIndex((x) => x.id === dragId);
    const to = items.findIndex((x) => x.id === target);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [p] = next.splice(from, 1);
    next.splice(to, 0, p!);
    setItems(next);
    if (typeof filter === "number") await reorderProducts(filter, next.map((x) => x.id));
  };
  const moveProduct = async (i: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [p] = next.splice(i, 1);
    next.splice(to, 0, p!);
    setItems(next);
    if (typeof filter === "number") await reorderProducts(filter, next.map((x) => x.id));
  };

  const catName = (id: number) => cats.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[280px_1fr]">
      {/* Categories */}
      <aside className="rounded-xl border bg-card shadow-xs xl:sticky xl:top-6">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Kategoriler</h2>
          <span className="text-xs text-muted-foreground">{cats.length}</span>
        </div>
        <ul className="p-2">
          <FilterRow active={filter === "all"} onClick={() => setFilter("all")} icon={Layers} label="Tüm ürünler" />
          {cats.map((c, i) => (
            <li key={c.id} className="group">
              <div className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors", filter === c.id ? "bg-muted" : "hover:bg-muted/50")}>
                <button type="button" onClick={() => setFilter(c.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                    {c.imagePath ? <img src={mediaUrl(c.imagePath)} alt="" className="size-full object-cover" /> : <Utensils className="size-3.5 text-muted-foreground" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm", filter === c.id ? "font-semibold" : "font-medium", !c.published && "text-muted-foreground line-through")}>{c.name}</span>
                    <span className="text-[11px] text-muted-foreground">{c.productCount} ürün</span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center opacity-60 transition-opacity group-hover:opacity-100">
                  <IconBtn label="Yukarı" disabled={i === 0} onClick={() => moveCat(i, i - 1)}>
                    <ArrowUp />
                  </IconBtn>
                  <IconBtn label="Aşağı" disabled={i === cats.length - 1} onClick={() => moveCat(i, i + 1)}>
                    <ArrowDown />
                  </IconBtn>
                  <IconBtn label={c.published ? "Yayından kaldır" : "Yayınla"} onClick={() => toggleCat(c)}>
                    {c.published ? <Eye /> : <EyeOff />}
                  </IconBtn>
                </div>
              </div>
            </li>
          ))}
          <FilterRow active={filter === "none"} onClick={() => setFilter("none")} icon={Shuffle} label="Kategorisiz" />
        </ul>
      </aside>

      {/* Products */}
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{typeof filter === "number" ? currentCat?.name : filter === "none" ? "Kategorisiz ürünler" : "Tüm ürünler"}</h2>
            <p className="text-xs text-muted-foreground">
              {total} ürün{orderable ? " · sürükle ya da oklarla sırala" : ""}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün ara" className="h-9 bg-card pl-9" />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <ul className="divide-y">
            {items.map((p, i) => (
              <li
                key={p.id}
                draggable={orderable}
                onDragStart={() => setDragId(p.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                onDragOver={(e) => {
                  if (!orderable) return;
                  e.preventDefault();
                  setOverId(p.id);
                }}
                onDrop={() => {
                  dropOn(p.id);
                  setOverId(null);
                }}
                className={cn("group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40", overId === p.id && dragId !== p.id && "bg-primary/5", dragId === p.id && "opacity-40")}
              >
                {orderable && <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground/60" aria-hidden />}
                <button type="button" onClick={() => setOpen(p.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {p.imagePath ? <img src={mediaUrl(p.imagePath)} alt="" loading="lazy" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-[10px] text-muted-foreground">Yok</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm font-medium", !p.published && "text-muted-foreground")}>{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.categoryIds.length ? p.categoryIds.map((id) => catName(id)).join(" · ") : "Kategori yok"}
                    </span>
                  </span>
                </button>
                <span className={cn("hidden w-24 shrink-0 text-right text-sm tabular-nums sm:block", !p.showPrice && "text-muted-foreground")}>{p.showPrice ? fmtPrice(p.priceKurus) : "Fiyat gizli"}</span>
                <span className={cn("hidden shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium md:flex", p.published ? "bg-ok/10 text-ok" : "bg-muted text-muted-foreground")}>
                  <span className={cn("size-1.5 rounded-full", p.published ? "bg-ok" : "bg-muted-foreground/50")} />
                  {p.published ? "Yayında" : "Taslak"}
                </span>
                {orderable && (
                  <div className="flex shrink-0 opacity-60 transition-opacity group-hover:opacity-100">
                    <IconBtn label="Yukarı" disabled={i === 0} onClick={() => moveProduct(i, i - 1)}>
                      <ArrowUp />
                    </IconBtn>
                    <IconBtn label="Aşağı" disabled={i === items.length - 1} onClick={() => moveProduct(i, i + 1)}>
                      <ArrowDown />
                    </IconBtn>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!items.length && !loading && <p className="px-5 py-14 text-center text-sm text-muted-foreground">Bu filtrede ürün yok.</p>}
        </div>
      </section>

      <ProductSheet
        id={open}
        categories={cats}
        onClose={() => setOpen(null)}
        onSaved={(row) => {
          setItems((xs) => xs.map((x) => (x.id === row.id ? row : x)));
        }}
      />
    </div>
  );
}

function FilterRow({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Layers; label: string }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors", active ? "bg-muted font-semibold" : "font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
        <Icon className="size-4" /> {label}
      </button>
    </li>
  );
}

function IconBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}
