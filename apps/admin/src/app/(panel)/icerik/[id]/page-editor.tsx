"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Heading,
  Hash,
  Link2,
  List,
  Loader2,
  MousePointerClick,
  Pilcrow,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { PAGE_TEMPLATE_LABEL, type ContentNode, type ContentSection, type PageTranslationEdit } from "@doyuyo/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RichText } from "./rich-text";
import { MediaPicker } from "@/components/media/media-picker";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BlockBuilder } from "./block-builder";
import { isBuilderPage } from "@doyuyo/core";
import { mediaUrl } from "@/lib/media";
import { deletePage, savePageTranslation, setPagePublished } from "../actions";

type Draft = Omit<PageTranslationEdit, "path">;
type EditorPage = {
  id: number;
  key: string;
  template: string;
  published: boolean;
  updatedAt: string;
  translations: Partial<Record<string, PageTranslationEdit>>;
};

const LOCALE_LABEL: Record<string, string> = { tr: "Türkçe", en: "English", ar: "العربية" };
const SECTION_LABEL = (key: string | null, i: number) => (key ? key.replace(/[-_]/g, " ") : `Bölüm ${i + 1}`);

const NEW_NODE: { type: ContentNode["type"]; label: string; icon: LucideIcon; make: () => ContentNode }[] = [
  { type: "heading", label: "Başlık", icon: Heading, make: () => ({ type: "heading", level: 2, text: "" }) },
  { type: "paragraph", label: "Paragraf", icon: Pilcrow, make: () => ({ type: "paragraph", html: "", text: "" }) },
  { type: "list", label: "Liste", icon: List, make: () => ({ type: "list", ordered: false, items: [] }) },
  { type: "button", label: "Buton", icon: MousePointerClick, make: () => ({ type: "button", text: "", href: "" }) },
  { type: "stat", label: "Rakam", icon: Hash, make: () => ({ type: "stat", value: "", label: "" }) },
];

const toDraft = (t?: PageTranslationEdit): Draft | null =>
  t ? { title: t.title, seoTitle: t.seoTitle, seoDescription: t.seoDescription, sections: structuredClone(t.sections) } : null;

export function PageEditor({ page, locales, site, back }: { page: EditorPage; locales: string[]; site: string; back: { href: string; label: string } }) {
  const [locale, setLocale] = useState(locales.find((l) => page.translations[l]) ?? locales[0]!);
  const [drafts, setDrafts] = useState<Record<string, Draft | null>>(() => Object.fromEntries(locales.map((l) => [l, toDraft(page.translations[l])])));
  const [saved, setSaved] = useState<Record<string, string>>(() => Object.fromEntries(locales.map((l) => [l, JSON.stringify(drafts[l])])));
  const [published, setPublished] = useState(page.published);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const draft = drafts[locale] ?? null;
  const isDirty = (l: string) => JSON.stringify(drafts[l]) !== saved[l];
  const anyDirty = locales.some(isDirty);
  const path = page.translations[locale]?.path ?? null;

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!anyDirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [anyDirty]);

  const update = (fn: (d: Draft) => Draft) => {
    setSaveState("idle");
    setDrafts((all) => ({ ...all, [locale]: all[locale] ? fn(all[locale]!) : null }));
  };
  const updateNode = (si: number, ni: number, node: ContentNode) =>
    update((d) => ({ ...d, sections: d.sections.map((s, i) => (i === si ? { ...s, nodes: s.nodes.map((n, j) => (j === ni ? node : n)) } : s)) }));
  const moveNode = (si: number, ni: number, dir: -1 | 1) =>
    update((d) => ({
      ...d,
      sections: d.sections.map((s, i) => {
        if (i !== si) return s;
        const nodes = [...s.nodes];
        const [n] = nodes.splice(ni, 1);
        nodes.splice(ni + dir, 0, n!);
        return { ...s, nodes };
      }),
    }));
  const removeNode = (si: number, ni: number) =>
    update((d) => ({ ...d, sections: d.sections.map((s, i) => (i === si ? { ...s, nodes: s.nodes.filter((_, j) => j !== ni) } : s)) }));
  const addNode = (si: number, node: ContentNode) =>
    update((d) => ({ ...d, sections: d.sections.map((s, i) => (i === si ? { ...s, nodes: [...s.nodes, node] } : s)) }));

  const save = () => {
    if (!draft || !isDirty(locale) || pending) return;
    setError("");
    start(async () => {
      try {
        await savePageTranslation(page.id, locale, draft);
        setSaved((s) => ({ ...s, [locale]: JSON.stringify(draft) }));
        setSaveState("saved");
      } catch (e) {
        setSaveState("error");
        setError(e instanceof Error ? e.message : "Kaydedilemedi");
      }
    });
  };

  // ⌘/Ctrl+S saves the open language.
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

  const togglePublished = async () => {
    const next = !published;
    setPublished(next);
    try {
      await setPagePublished(page.id, next);
    } catch {
      setPublished(!next);
    }
  };

  const startFrom = (src: string) => {
    const from = drafts[src];
    setDrafts((all) => ({ ...all, [locale]: from ? structuredClone(from) : { title: "", seoTitle: "", seoDescription: "", sections: [] } }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-4">
        <Link href={back.href} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {back.label}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">
              {drafts.tr?.title || draft?.title || page.key}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {PAGE_TEMPLATE_LABEL[page.template] ?? page.template} · Son güncelleme {page.updatedAt}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={published}
              onClick={togglePublished}
              className="flex h-8 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium shadow-xs hover:bg-muted"
            >
              <span className={cn("relative h-4 w-7 rounded-full transition-colors", published ? "bg-ok" : "bg-muted-foreground/30")}>
                <span className={cn("absolute top-0.5 size-3 rounded-full bg-white shadow transition-all", published ? "left-3.5" : "left-0.5")} />
              </span>
              {published ? "Yayında" : "Taslak"}
            </button>
            {isBuilderPage(page) && <DeletePageButton id={page.id} title={drafts.tr?.title || page.key} />}
            {path && (
              <Button asChild variant="outline" size="sm" className="bg-card">
                <a href={`${site}${path}`} target="_blank" rel="noopener">
                  <ExternalLink /> Sitede gör
                </a>
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={!draft || !isDirty(locale) || pending}>
              {pending ? <Loader2 className="animate-spin" /> : saveState === "saved" && !isDirty(locale) ? <Check /> : null}
              {saveState === "saved" && !isDirty(locale) ? "Kaydedildi" : "Kaydet"}
            </Button>
          </div>
        </div>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </header>

      {/* Locale tabs */}
      <nav className="flex gap-1 border-b" aria-label="Dil">
        {locales.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors",
              l === locale ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {LOCALE_LABEL[l] ?? l.toUpperCase()}
            {!drafts[l] && <span className="rounded border border-dashed px-1 text-[10px] text-muted-foreground">yok</span>}
            {isDirty(l) && <span className="size-1.5 rounded-full bg-amber-400" title="Kaydedilmemiş değişiklik" />}
          </button>
        ))}
        <span className="ml-auto self-center pb-2 text-xs text-muted-foreground">⌘ + S ile kaydet</span>
      </nav>

      {!draft ? (
        <section className="grid place-items-center gap-3 rounded-xl border border-dashed bg-card px-5 py-16 text-center">
          <p className="font-medium">Bu sayfanın {LOCALE_LABEL[locale]} çevirisi yok</p>
          <p className="max-w-md text-sm text-muted-foreground">Türkçe içerikten kopyalayıp çevirebilir ya da boş başlayabilirsin. Adres (URL) ayrıca tanımlanmalı.</p>
          <div className="flex gap-2">
            {drafts.tr && locale !== "tr" && (
              <Button size="sm" onClick={() => startFrom("tr")}>
                <Copy /> Türkçeden kopyala
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => startFrom("")}>
              Boş başla
            </Button>
          </div>
        </section>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
          {/* Content */}
          <div className="space-y-6">
            <section className="rounded-xl border bg-card p-5 shadow-xs">
              <label htmlFor="title" className="text-xs font-medium text-muted-foreground">
                Sayfa başlığı
              </label>
              <Input id="title" value={draft.title} onChange={(e) => update((d) => ({ ...d, title: e.target.value }))} className="mt-2 h-11 text-base font-medium" />
            </section>

            {isBuilderPage(page) ? (
              <BlockBuilder sections={draft.sections} onChange={(sections) => update((d) => ({ ...d, sections }))} />
            ) : null}
            {!isBuilderPage(page) && draft.sections.length === 0 && (
              <p className="rounded-xl border border-dashed bg-card px-5 py-10 text-center text-sm text-muted-foreground">Bu sayfada düzenlenebilir içerik bölümü yok.</p>
            )}

            {!isBuilderPage(page) && draft.sections.map((s, si) => (
              <section key={si} className="rounded-xl border bg-card shadow-xs">
                <div className="flex items-center justify-between border-b px-5 py-3">
                  <h2 className="text-sm font-semibold capitalize">{SECTION_LABEL(s.key, si)}</h2>
                  <span className="text-xs text-muted-foreground">{s.nodes.length} blok</span>
                </div>
                <div className="divide-y">
                  {s.nodes.map((n, ni) => (
                    <NodeRow
                      key={ni}
                      node={n}
                      first={ni === 0}
                      last={ni === s.nodes.length - 1}
                      onChange={(node) => updateNode(si, ni, node)}
                      onMove={(dir) => moveNode(si, ni, dir)}
                      onRemove={() => removeNode(si, ni)}
                    />
                  ))}
                </div>
                <AddNode onAdd={(node) => addNode(si, node)} />
              </section>
            ))}
          </div>

          {/* Side */}
          <aside className="space-y-6 xl:sticky xl:top-6">
            <SeoCard draft={draft} path={path} site={site} onChange={(patch) => update((d) => ({ ...d, ...patch }))} />
            <section className="rounded-xl border bg-card p-5 text-sm shadow-xs">
              <h2 className="font-semibold">Sayfa bilgisi</h2>
              <dl className="mt-3 space-y-2.5">
                <Info k="Adres" v={path ? <span className="font-mono text-xs">{path}</span> : "Tanımlı değil"} />
                <Info k="Şablon" v={PAGE_TEMPLATE_LABEL[page.template] ?? page.template} />
                <Info k="Anahtar" v={<span className="font-mono text-xs">{page.key}</span>} />
              </dl>
              {page.template !== "static" && (
                <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Bu sayfanın yerleşimi sabit. Buradan sadece metinleri ve görselleri değiştirebilirsin.
                </p>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

function Info({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 break-words">{v}</dd>
    </div>
  );
}

function SeoCard({ draft, path, site, onChange }: { draft: Draft; path: string | null; site: string; onChange: (p: Partial<Draft>) => void }) {
  const title = draft.seoTitle || draft.title;
  const host = site.replace(/^https?:\/\//, "");
  return (
    <section className="rounded-xl border bg-card shadow-xs">
      <h2 className="border-b px-5 py-3.5 font-semibold">Arama görünümü</h2>
      <div className="space-y-4 p-5">
        {/* Google-like preview */}
        <div className="rounded-lg border bg-white p-4">
          <p className="truncate text-xs text-muted-foreground">
            {host}
            {path}
          </p>
          <p className="mt-1 line-clamp-1 text-[17px] leading-snug text-[#1a0dab]">{title || "Başlık yok"}</p>
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[#4d5156]">{draft.seoDescription || "Açıklama yok. Google sayfadan bir parça seçer."}</p>
        </div>
        <Counted label="SEO başlığı" value={draft.seoTitle} max={60} placeholder={draft.title} onChange={(v) => onChange({ seoTitle: v })} />
        <Counted label="Açıklama" value={draft.seoDescription} max={160} multiline onChange={(v) => onChange({ seoDescription: v })} />
      </div>
    </section>
  );
}

function Counted({ label, value, max, multiline, placeholder, onChange }: { label: string; value: string; max: number; multiline?: boolean; placeholder?: string; onChange: (v: string) => void }) {
  const over = value.length > max;
  const cls =
    "w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className={cn("tabular-nums", over ? "font-semibold text-red-600" : "text-muted-foreground")}>
          {value.length}/{max}
        </span>
      </div>
      {multiline ? (
        <textarea rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(cls, "resize-y")} />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(cls, "h-9")} />
      )}
    </div>
  );
}

function AddNode({ onAdd }: { onAdd: (n: ContentNode) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t px-5 py-3">
      {open ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {NEW_NODE.map((t) => (
            <Button
              key={t.type}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onAdd(t.make());
                setOpen(false);
              }}
            >
              <t.icon /> {t.label}
            </Button>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Vazgeç
          </Button>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <Plus className="size-4" /> Blok ekle
        </button>
      )}
    </div>
  );
}

const NODE_META: Record<ContentNode["type"], { label: string; icon: LucideIcon }> = {
  heading: { label: "Başlık", icon: Heading },
  paragraph: { label: "Paragraf", icon: Pilcrow },
  list: { label: "Liste", icon: List },
  image: { label: "Görsel", icon: Link2 },
  button: { label: "Buton", icon: MousePointerClick },
  stat: { label: "Rakam", icon: Hash },
  embed: { label: "Gömülü içerik", icon: Link2 },
  video: { label: "Video", icon: Link2 },
  table: { label: "Tablo", icon: List },
};

function NodeRow({
  node,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  node: ContentNode;
  first: boolean;
  last: boolean;
  onChange: (n: ContentNode) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const meta = NODE_META[node.type];
  const [ask, setAsk] = useState(false);
  return (
    <div className="group flex gap-4 px-5 py-4">
      <div className="flex w-24 shrink-0 flex-col gap-2 pt-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <meta.icon className="size-3.5" /> {meta.label}
        </span>
        <div className="flex gap-0.5 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <MiniButton label="Yukarı taşı" disabled={first} onClick={() => onMove(-1)}>
            <ChevronUp />
          </MiniButton>
          <MiniButton label="Aşağı taşı" disabled={last} onClick={() => onMove(1)}>
            <ChevronDown />
          </MiniButton>
          <MiniButton label="Sil" onClick={() => setAsk(true)} danger>
            <Trash2 />
          </MiniButton>
          <ConfirmDialog
            open={ask}
            onOpenChange={setAsk}
            title={`${meta.label} bloğu silinsin mi?`}
            description="Blok bu dildeki sayfadan kaldırılır. Kaydetmeden çıkarsan değişiklik uygulanmaz."
            onConfirm={() => {
              setAsk(false);
              onRemove();
            }}
          />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <NodeFields node={node} onChange={onChange} />
      </div>
    </div>
  );
}

function MiniButton({ label, disabled, danger, onClick, children }: { label: string; disabled?: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-3.5",
        danger ? "hover:text-red-600" : "hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

const field =
  "w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function NodeFields({ node, onChange }: { node: ContentNode; onChange: (n: ContentNode) => void }) {
  switch (node.type) {
    case "heading":
      return (
        <div className="flex gap-2">
          <select value={node.level} onChange={(e) => onChange({ ...node, level: Number(e.target.value) })} className={cn(field, "h-9 w-20 px-2")} aria-label="Başlık seviyesi">
            {[2, 3, 4].map((l) => (
              <option key={l} value={l}>
                H{l}
              </option>
            ))}
          </select>
          <input value={node.text} onChange={(e) => onChange({ ...node, text: e.target.value })} placeholder="Başlık" className={cn(field, "h-9 font-semibold")} />
        </div>
      );
    case "paragraph":
      return <RichText value={node.html} onChange={(html) => onChange({ ...node, html, text: html.replace(/<[^>]+>/g, "") })} />;
    case "list":
      return (
        <div className="space-y-2">
          <textarea
            rows={Math.min(10, Math.max(3, node.items.length + 1))}
            value={node.items.join("\n")}
            onChange={(e) => onChange({ ...node, items: e.target.value.split("\n") })}
            placeholder="Her satır bir madde"
            className={cn(field, "resize-y font-normal")}
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={node.ordered} onChange={(e) => onChange({ ...node, ordered: e.target.checked })} /> Numaralı liste
          </label>
        </div>
      );
    case "button":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={node.text} onChange={(e) => onChange({ ...node, text: e.target.value })} placeholder="Buton yazısı" className={cn(field, "h-9")} />
          <input value={node.href} onChange={(e) => onChange({ ...node, href: e.target.value })} placeholder="/tr/iletisim veya https://…" className={cn(field, "h-9 font-mono text-xs")} />
        </div>
      );
    case "stat":
      return (
        <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
          <input value={node.value} onChange={(e) => onChange({ ...node, value: e.target.value })} placeholder="91" className={cn(field, "h-9 font-semibold")} />
          <input value={node.label} onChange={(e) => onChange({ ...node, label: e.target.value })} placeholder="Şube sayımız" className={cn(field, "h-9")} />
        </div>
      );
    case "image":
      return <ImageField node={node} onChange={onChange} />;
    case "embed":
    case "video":
      return <p className="truncate pt-1.5 font-mono text-xs text-muted-foreground">{node.type === "embed" ? node.src : node.href}</p>;
    case "table":
      return <p className="pt-1.5 text-sm text-muted-foreground">{node.rows.length} satırlık tablo. Tablo düzenleme yakında.</p>;
  }
}

function ImageField({ node, onChange }: { node: Extract<ContentNode, { type: "image" }>; onChange: (n: ContentNode) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted text-xs text-muted-foreground"
        title="Görseli değiştir"
      >
        {node.src ? <img src={mediaUrl(node.src)} alt="" className="size-full object-cover" /> : "Görsel seç"}
        <span className="absolute inset-0 grid place-items-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">Değiştir</span>
      </button>
      <div className="min-w-0 flex-1 space-y-2">
        <input value={node.alt} onChange={(e) => onChange({ ...node, alt: e.target.value })} placeholder="Görsel açıklaması (alt)" className={cn(field, "h-9")} />
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{node.src || "Görsel yok"}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            Medyadan seç
          </Button>
        </div>
      </div>
      <MediaPicker
        folder="page"
        open={open}
        onOpenChange={setOpen}
        onPick={(m) => onChange({ ...node, mediaId: m.id, src: m.path, alt: node.alt || m.texts.tr?.alt || "" })}
      />
    </div>
  );
}

function DeletePageButton({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const remove = () =>
    start(async () => {
      setError("");
      try {
        const r = await deletePage(id);
        if (!r.ok) return setError(r.error);
        router.push("/icerik");
      } catch {
        setError("Silinemedi");
      }
    });
  return (
    <>
      <Button variant="outline" size="sm" className="bg-card text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { setError(""); setOpen(true); }}>
        <Trash2 /> Sil
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Sayfa silinsin mi?"
        description={
          <>
            <span className="font-medium text-foreground">{title}</span> ve tüm dillerdeki içeriği kalıcı olarak silinecek. Eski adresler 410 (kalıcı olarak kaldırıldı) döner. Bu işlem geri alınamaz.
          </>
        }
        pending={pending}
        error={error}
        onConfirm={remove}
      />
    </>
  );
}
