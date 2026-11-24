"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Loader2, Trash2 } from "lucide-react";
import type { MediaTexts } from "@doyuyo/core";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fmtBytes, mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { deleteMedia, saveMediaTexts, setMediaFolder } from "@/app/(panel)/medya/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MEDIA_USAGES } from "@doyuyo/core";
import { MediaThumb } from "./media-thumb";
import type { MediaDTO } from "./types";
import { USAGE_META } from "./usage";

const LOCALES = [
  { id: "tr", label: "Türkçe" },
  { id: "en", label: "English" },
] as const;
const KIND_LABEL = { image: "Görsel", video: "Video", document: "Belge", other: "Dosya" } as const;
const empty: MediaTexts = { alt: "", title: "", caption: "" };

/** Right-side panel: preview, file facts and per-language texts. */
export function MediaDetails({
  item,
  onClose,
  onSaved,
  onDeleted,
}: {
  item: MediaDTO | null;
  onClose: () => void;
  onSaved: (m: MediaDTO) => void;
  onDeleted?: (id: number) => void;
}) {
  const [locale, setLocale] = useState<"tr" | "en">("tr");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [askDelete, setAskDelete] = useState(false);
  useEffect(() => {
    setDeleteError("");
    setAskDelete(false);
  }, [item?.id]);

  const remove = async () => {
    if (!item) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const r = await deleteMedia(item.id);
      if (r.ok) {
        setAskDelete(false);
        onDeleted?.(item.id);
        onClose();
      } else setDeleteError(r.error);
    } catch {
      setDeleteError("Silinemedi");
    } finally {
      setDeleting(false);
    }
  };
  const [texts, setTexts] = useState<Record<string, MediaTexts>>({});
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!item) return;
    setTexts(Object.fromEntries(LOCALES.map((l) => [l.id, { ...empty, ...item.texts[l.id] }])));
    setState("idle");
  }, [item]);

  const dirty = !!item && LOCALES.some((l) => JSON.stringify(texts[l.id]) !== JSON.stringify({ ...empty, ...item.texts[l.id] }));
  const cur = texts[locale] ?? empty;
  const set = (k: keyof MediaTexts, v: string) => {
    setState("idle");
    setTexts((t) => ({ ...t, [locale]: { ...(t[locale] ?? empty), [k]: v } }));
  };

  const save = () =>
    item &&
    start(async () => {
      try {
        const next = await saveMediaTexts(item.id, texts);
        if (next) onSaved(next);
        setState("saved");
      } catch {
        setState("error");
      }
    });

  const url = item ? mediaUrl(item.path) : "";
  const field =
    "w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        {item && (
          <>
            <SheetHeader className="border-b p-5">
              <SheetTitle className="truncate pr-6">{item.originalName ?? item.path.split("/").pop()}</SheetTitle>
              <SheetDescription>
                {KIND_LABEL[item.kind]} · {fmtBytes(item.bytes)}
                {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 p-5">
              <div className="aspect-video overflow-hidden rounded-lg border bg-[repeating-conic-gradient(#f1f4f6_0%_25%,white_0%_50%)] bg-[length:16px_16px]">
                <MediaThumb item={item} controls className="object-contain" />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check /> : <Copy />} {copied ? "Kopyalandı" : "Adresi kopyala"}
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={url} target="_blank" rel="noopener">
                    <ExternalLink /> Aç
                  </a>
                </Button>
              </div>

              <FolderPicker item={item} onSaved={onSaved} />

              {/* Texts per language */}
              <div>
                <div className="flex gap-1 border-b">
                  {LOCALES.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLocale(l.id)}
                      className={cn(
                        "-mb-px border-b-2 px-3 pb-2 text-sm font-medium",
                        l.id === locale ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {l.label}
                      {!texts[l.id]?.alt && item.kind === "image" && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-amber-400 align-middle" title="Alt metin eksik" />}
                    </button>
                  ))}
                </div>
                <div className="space-y-4 pt-4">
                  <Field label="Alt metin" hint="Görme engelliler ve Google için görseli bir cümleyle anlat." count={cur.alt.length} max={125}>
                    <textarea rows={2} value={cur.alt} onChange={(e) => set("alt", e.target.value)} placeholder="Ör. Çıtır tavuk menüsü ve patates" className={cn(field, "resize-y")} />
                  </Field>
                  <Field label="Başlık (SEO)" hint="Görselin adı; fareyle üzerine gelince ve aramalarda görünür." count={cur.title.length} max={70}>
                    <input value={cur.title} onChange={(e) => set("title", e.target.value)} className={cn(field, "h-9")} />
                  </Field>
                  <Field label="Açıklama" hint="Görselin altında gösterilecek metin (isteğe bağlı)." count={cur.caption.length} max={300}>
                    <textarea rows={3} value={cur.caption} onChange={(e) => set("caption", e.target.value)} className={cn(field, "resize-y")} />
                  </Field>
                </div>
              </div>

              <dl className="space-y-2 rounded-lg bg-muted/60 p-3 text-xs">
                <Row
                  k="Görünür"
                  v={
                    <span className="flex flex-wrap gap-1">
                      {item.usage.length
                        ? item.usage.map((u) => (
                            <span key={u} className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", USAGE_META[u].chip)}>
                              {USAGE_META[u].label}
                            </span>
                          ))
                        : "Sitede kullanılmıyor"}
                    </span>
                  }
                />
                <Row k="Adres" v={<span className="break-all font-mono">{item.path}</span>} />
                <Row k="Tür" v={item.mime} />
                <Row k="Eklendi" v={new Date(item.createdAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })} />
              </dl>
            </div>

            <div className="sticky bottom-0 space-y-2 border-t bg-background/95 p-4 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" size="sm" onClick={() => setAskDelete(true)} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                  <Trash2 /> Sil
                </Button>
                <ConfirmDialog
                  open={askDelete}
                  onOpenChange={(o) => {
                    setAskDelete(o);
                    if (!o) setDeleteError("");
                  }}
                  title="Dosya silinsin mi?"
                  description={
                    <>
                      <span className="font-medium text-foreground">{item.originalName ?? item.path.split("/").pop()}</span> kalıcı olarak silinecek. Bu işlem geri alınamaz.
                    </>
                  }
                  pending={deleting}
                  error={deleteError}
                  onConfirm={remove}
                >
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
                    <span className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                      <MediaThumb item={item} />
                    </span>
                    <span className="min-w-0 text-xs text-muted-foreground">
                      <span className="block truncate font-mono">{item.path}</span>
                      {fmtBytes(item.bytes)}
                    </span>
                  </div>
                </ConfirmDialog>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {state === "saved" && !dirty ? "Kaydedildi" : state === "error" ? <span className="text-red-600">Kaydedilemedi</span> : dirty ? "Kaydedilmemiş değişiklik" : ""}
                  </span>
                  <Button size="sm" onClick={save} disabled={!dirty || pending}>
                    {pending && <Loader2 className="animate-spin" />} Kaydet
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, hint, count, max, children }: { label: string; hint: string; count: number; max: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className={cn("tabular-nums", count > max ? "font-semibold text-red-600" : "text-muted-foreground")}>
          {count}/{max}
        </span>
      </div>
      {children}
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Group the file belongs to; saves on click. Real use on the site is shown separately. */
function FolderPicker({ item, onSaved }: { item: MediaDTO; onSaved: (m: MediaDTO) => void }) {
  const [folder, setFolder] = useState(item.folder ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  useEffect(() => {
    setFolder(item.folder ?? "");
  }, [item.id, item.folder]);

  const pick = async (next: string) => {
    const prev = folder;
    setFolder(next);
    setState("saving");
    try {
      const m = await setMediaFolder(item.id, next || null);
      if (m) onSaved(m);
      setState("saved");
    } catch {
      setFolder(prev);
      setState("error");
    }
  };

  const usedIn = item.usage.filter((u) => u !== item.folder);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium">Grup</span>
        <span className={cn("text-muted-foreground", state === "error" && "text-red-600")}>
          {state === "saving" ? "Kaydediliyor…" : state === "saved" ? "Kaydedildi" : state === "error" ? "Kaydedilemedi" : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MEDIA_USAGES.map((u) => {
          const m = USAGE_META[u];
          const active = folder === u;
          return (
            <button
              key={u}
              type="button"
              aria-pressed={active}
              onClick={() => pick(active ? "" : u)}
              className={cn(
                "flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                active ? cn("border-transparent", m.chip) : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <m.icon className="size-3.5" /> {m.label}
            </button>
          );
        })}
      </div>
      {usedIn.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Sitede kullanıldığı yer: {usedIn.map((u) => USAGE_META[u].label).join(", ")}</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0">{v}</dd>
    </div>
  );
}
