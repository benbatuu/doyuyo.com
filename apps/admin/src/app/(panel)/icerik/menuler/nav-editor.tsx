"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, FileText, GripVertical, Link2, Loader2, PanelBottom, PanelTop, Plus, Scale, Trash2, type LucideIcon } from "lucide-react";
import type { NavLink, NavMenu, SiteNav } from "@doyuyo/core";

const NAV_MENUS: NavMenu[] = ["header", "footer", "legal"];
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { saveNav } from "../actions";

export type PageOption = { id: number; title: string; href: string; published: boolean; legal: boolean };

const MENU_META: Record<NavMenu, { label: string; hint: string; icon: LucideIcon }> = {
  header: { label: "Üst menü", hint: "Sitenin üstündeki ana menü. “Menü” linki sabit olarak en başta gelir.", icon: PanelTop },
  footer: { label: "Alt menü", hint: "Sayfanın en altındaki link listesi.", icon: PanelBottom },
  legal: { label: "Yasal linkler", hint: "Alt kısımda telif yazısının yanında görünür.", icon: Scale },
};
const LOCALE_LABEL: Record<string, string> = { tr: "Türkçe", en: "English" };

type Drag = { menu: NavMenu; index: number } | null;
const SAFE = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

export function NavEditor({ initial, options, locales }: { initial: Record<string, SiteNav>; options: Record<string, PageOption[]>; locales: string[] }) {
  const [locale, setLocale] = useState(locales[0]!);
  const [navs, setNavs] = useState(initial);
  const [saved, setSaved] = useState(() => Object.fromEntries(locales.map((l) => [l, JSON.stringify(initial[l])])));
  const [drag, setDrag] = useState<Drag>(null);
  const [over, setOver] = useState<{ menu: NavMenu; index: number } | null>(null);
  const [adding, setAdding] = useState<NavMenu | null>(null);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();

  const nav = navs[locale]!;
  const dirty = (l: string) => JSON.stringify(navs[l]) !== saved[l];
  const invalid = NAV_MENUS.some((m) => nav[m].some((l) => !l.label.trim() || !SAFE.test(l.href.trim())));

  const setNav = (fn: (n: SiteNav) => SiteNav) => {
    setState("idle");
    setNavs((all) => ({ ...all, [locale]: fn(all[locale]!) }));
  };
  const move = (from: { menu: NavMenu; index: number }, to: { menu: NavMenu; index: number }) =>
    setNav((n) => {
      const next = { header: [...n.header], footer: [...n.footer], legal: [...n.legal] };
      const [item] = next[from.menu].splice(from.index, 1);
      let at = to.index;
      if (from.menu === to.menu && from.index < to.index) at -= 1; // list shrank above the drop point
      next[to.menu].splice(Math.max(0, Math.min(at, next[to.menu].length)), 0, item!);
      return next;
    });
  const update = (menu: NavMenu, i: number, patch: Partial<NavLink>) => setNav((n) => ({ ...n, [menu]: n[menu].map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const remove = (menu: NavMenu, i: number) => setNav((n) => ({ ...n, [menu]: n[menu].filter((_, j) => j !== i) }));
  const add = (menu: NavMenu, link: NavLink) => setNav((n) => ({ ...n, [menu]: [...n[menu], link] }));

  const save = () => {
    if (!dirty(locale) || invalid || pending) return;
    start(async () => {
      try {
        const fresh = await saveNav(locale, nav);
        setNavs((all) => ({ ...all, [locale]: fresh }));
        setSaved((s) => ({ ...s, [locale]: JSON.stringify(fresh) }));
        setState("saved");
      } catch {
        setState("error");
      }
    });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  useEffect(() => {
    if (!locales.some(dirty)) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border bg-card p-1 shadow-xs">
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", l === locale ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {LOCALE_LABEL[l] ?? l}
              {dirty(l) && <span className="size-1.5 rounded-full bg-amber-400" title="Kaydedilmemiş değişiklik" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {invalid ? (
              <span className="text-red-600">Boş isim veya geçersiz adres var</span>
            ) : state === "saved" && !dirty(locale) ? (
              "Kaydedildi"
            ) : state === "error" ? (
              <span className="text-red-600">Kaydedilemedi</span>
            ) : dirty(locale) ? (
              "⌘ + S ile kaydet"
            ) : (
              ""
            )}
          </span>
          <Button size="sm" onClick={save} disabled={!dirty(locale) || invalid || pending}>
            {pending ? <Loader2 className="animate-spin" /> : state === "saved" && !dirty(locale) ? <Check /> : null} Kaydet
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {NAV_MENUS.map((menu) => {
          const meta = MENU_META[menu];
          const items = nav[menu];
          return (
            <section
              key={menu}
              className={cn("rounded-xl border bg-card shadow-xs transition-colors", drag && drag.menu !== menu && "border-dashed border-primary/40")}
              onDragOver={(e) => {
                if (!drag) return;
                e.preventDefault();
                if (!items.length) setOver({ menu, index: 0 });
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (drag && over) move(drag, over);
                setDrag(null);
                setOver(null);
              }}
            >
              <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
                <div>
                  <h2 className="flex items-center gap-2 font-semibold">
                    <meta.icon className="size-4 text-muted-foreground" /> {meta.label}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{meta.hint}</p>
                </div>
                <span className="rounded-md bg-muted px-1.5 text-xs tabular-nums">{items.length}</span>
              </div>

              <ul className="space-y-1.5 p-3">
                {menu === "header" && (
                  <li className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                    <span className="w-4" />
                    {locale === "en" ? "Menu" : "Menü"} <span className="ml-auto text-[11px]">Sabit</span>
                  </li>
                )}
                {items.map((l, i) => (
                  <li
                    key={`${menu}-${i}-${l.href}`}
                    draggable
                    onDragStart={(e) => {
                      setDrag({ menu, index: i });
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDrag(null);
                      setOver(null);
                    }}
                    onDragOver={(e) => {
                      if (!drag) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const r = e.currentTarget.getBoundingClientRect();
                      setOver({ menu, index: e.clientY < r.top + r.height / 2 ? i : i + 1 });
                    }}
                    className={cn(
                      "group relative rounded-lg border bg-background p-2 transition-shadow",
                      drag?.menu === menu && drag.index === i && "opacity-40",
                      over?.menu === menu && over.index === i && "before:absolute before:-top-1 before:inset-x-1 before:h-0.5 before:rounded before:bg-primary",
                      over?.menu === menu && over.index === i + 1 && i === items.length - 1 && "after:absolute after:-bottom-1 after:inset-x-1 after:h-0.5 after:rounded after:bg-primary",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground/60 active:cursor-grabbing" aria-hidden />
                      <input
                        value={l.label}
                        onChange={(e) => update(menu, i, { label: e.target.value })}
                        aria-label="Link adı"
                        placeholder="Link adı"
                        className={cn("h-8 min-w-0 flex-1 rounded-md bg-transparent px-2 text-sm font-medium outline-none hover:bg-muted/60 focus:bg-muted/60", !l.label.trim() && "ring-1 ring-red-300")}
                      />
                      <div className="flex shrink-0 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <Mini label="Yukarı" disabled={i === 0} onClick={() => move({ menu, index: i }, { menu, index: i - 1 })}>
                          <ArrowUp />
                        </Mini>
                        <Mini label="Aşağı" disabled={i === items.length - 1} onClick={() => move({ menu, index: i }, { menu, index: i + 2 })}>
                          <ArrowDown />
                        </Mini>
                        <Mini label="Kaldır" danger onClick={() => remove(menu, i)}>
                          <Trash2 />
                        </Mini>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2 pl-6">
                      <input
                        value={l.href}
                        onChange={(e) => update(menu, i, { href: e.target.value })}
                        aria-label="Adres"
                        className={cn(
                          "h-7 min-w-0 flex-1 rounded-md bg-transparent px-2 font-mono text-xs text-muted-foreground outline-none hover:bg-muted/60 focus:bg-muted/60",
                          !SAFE.test(l.href.trim()) && "text-red-600 ring-1 ring-red-300",
                        )}
                      />
                      <select
                        value=""
                        onChange={(e) => e.target.value && move({ menu, index: i }, { menu: e.target.value as NavMenu, index: nav[e.target.value as NavMenu].length })}
                        aria-label="Başka menüye taşı"
                        className="h-7 shrink-0 rounded-md border bg-transparent px-1.5 text-[11px] text-muted-foreground"
                      >
                        <option value="">Taşı…</option>
                        {NAV_MENUS.filter((m) => m !== menu).map((m) => (
                          <option key={m} value={m}>
                            {MENU_META[m].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                ))}
                {!items.length && (
                  <li className={cn("rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground", over?.menu === menu && "border-primary bg-primary/5")}>
                    Buraya link sürükle ya da ekle
                  </li>
                )}
              </ul>

              <div className="border-t px-3 py-2">
                <button type="button" onClick={() => setAdding(menu)} className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Plus className="size-4" /> Link ekle
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <AddLinkDialog
        menu={adding}
        onClose={() => setAdding(null)}
        options={options[locale] ?? []}
        used={new Set(NAV_MENUS.flatMap((m) => nav[m].map((l) => l.href)))}
        onAdd={(link) => adding && add(adding, link)}
      />
    </div>
  );
}

function Mini({ label, disabled, danger, onClick, children }: { label: string; disabled?: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-3.5",
        danger ? "hover:text-red-600" : "hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function AddLinkDialog({ menu, onClose, options, used, onAdd }: { menu: NavMenu | null; onClose: () => void; options: PageOption[]; used: Set<string>; onAdd: (l: NavLink) => void }) {
  const [mode, setMode] = useState<"page" | "custom">("page");
  const [q, setQ] = useState("");
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  useEffect(() => {
    if (!menu) return;
    setMode("page");
    setQ("");
    setLabel("");
    setHref("");
  }, [menu]);

  const list = useMemo(() => {
    const t = q.trim().toLocaleLowerCase("tr");
    return options
      .filter((o) => (menu === "legal" ? o.legal : true))
      .filter((o) => !t || o.title.toLocaleLowerCase("tr").includes(t) || o.href.includes(t));
  }, [options, q, menu]);

  const pick = (l: NavLink) => {
    onAdd(l);
    onClose();
  };

  return (
    <Dialog open={!!menu} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{menu ? `${MENU_META[menu].label} · link ekle` : ""}</DialogTitle>
          <DialogDescription>Bir sayfa seç ya da özel bir adres gir.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg border p-1">
          {(
            [
              ["page", "Sayfa seç", FileText],
              ["custom", "Özel link", Link2],
            ] as const
          ).map(([m, l, I]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", mode === m ? "bg-muted" : "text-muted-foreground hover:text-foreground")}
            >
              <I className="size-4" /> {l}
            </button>
          ))}
        </div>

        {mode === "page" ? (
          <div className="space-y-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sayfa ara" autoFocus />
            <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
              {list.map((o) => {
                const already = used.has(o.href);
                return (
                  <li key={o.id}>
                    <button type="button" onClick={() => pick({ label: o.title, href: o.href })} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/60">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{o.title}</span>
                        <span className="block truncate font-mono text-xs text-muted-foreground">{o.href}</span>
                      </span>
                      {!o.published && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Taslak</span>}
                      {already && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">Menüde</span>}
                    </button>
                  </li>
                );
              })}
              {!list.length && <li className="px-3 py-8 text-center text-sm text-muted-foreground">Sayfa bulunamadı.</li>}
            </ul>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (label.trim() && SAFE.test(href.trim())) pick({ label: label.trim(), href: href.trim() });
            }}
          >
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Link adı" autoFocus />
            <Input value={href} onChange={(e) => setHref(e.target.value)} placeholder="/tr/… veya https://…" className="font-mono text-sm" aria-invalid={!!href && !SAFE.test(href.trim())} />
            {href && !SAFE.test(href.trim()) && <p className="text-xs text-red-600">Adres https://, /, mailto: veya tel: ile başlamalı.</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Vazgeç
              </Button>
              <Button type="submit" disabled={!label.trim() || !SAFE.test(href.trim())}>
                Ekle
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
