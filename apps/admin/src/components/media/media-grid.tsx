"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { FileText, Film, Image as ImageIcon, Layers, Loader2, Search } from "lucide-react";
import type { MediaKind } from "@doyuyo/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { listMedia } from "@/app/(panel)/medya/actions";
import { MediaThumb } from "./media-thumb";
import { UploadZone } from "./upload-zone";
import { useUpload } from "./use-upload";
import type { MediaDTO } from "./types";
import { USAGE_META, USAGE_ORDER, type UsageFilter } from "./usage";

const PAGE = 48;
const FILTERS: { kind?: MediaKind; label: string; icon: typeof Layers }[] = [
  { label: "Her tür", icon: Layers },
  { kind: "image", label: "Görseller", icon: ImageIcon },
  { kind: "video", label: "Videolar", icon: Film },
  { kind: "document", label: "Belgeler", icon: FileText },
];

/**
 * Searchable, filterable media grid with upload. Used by the Medya page and the picker.
 * `lockKind` pins the filter (e.g. picker for images only).
 */
export function MediaGrid({
  initial,
  counts,
  usageCounts,
  lockKind,
  selectedId,
  onOpen,
  columns = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
  refreshKey,
  removedId,
  defaultFolder = "",
}: {
  initial?: { items: MediaDTO[]; total: number };
  counts?: Record<MediaKind, number>;
  usageCounts?: Record<UsageFilter, number>;
  lockKind?: MediaKind;
  selectedId?: number | null;
  onOpen: (m: MediaDTO) => void;
  columns?: string;
  refreshKey?: MediaDTO | null;
  removedId?: number | null;
  defaultFolder?: string;
}) {
  const [kind, setKind] = useState<MediaKind | undefined>(lockKind);
  const [q, setQ] = useState("");
  const [usage, setUsage] = useState<UsageFilter>("all");
  const [folder, setFolder] = useState(defaultFolder);
  // Picking a group tab also makes it the upload target.
  useEffect(() => {
    if (usage !== "all" && usage !== "unused") setFolder(usage);
  }, [usage]);
  const [items, setItems] = useState<MediaDTO[]>(initial?.items ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [loading, start] = useTransition();
  const first = useRef(!!initial);

  const load = (opts: { kind?: MediaKind; q: string; offset: number }) =>
    start(async () => {
      const r = await listMedia({ ...opts, usage: usage === "all" ? undefined : usage, limit: PAGE });
      setItems((cur) => (opts.offset ? [...cur, ...r.items] : r.items));
      setTotal(r.total);
    });

  // Reload on filter/search change (debounced search). Skip the first run when SSR data exists.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => load({ kind, q, offset: 0 }), q ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, q, usage]);

  // Reflect edits made in the details panel.
  useEffect(() => {
    if (refreshKey) setItems((cur) => cur.map((m) => (m.id === refreshKey.id ? refreshKey : m)));
  }, [refreshKey]);

  useEffect(() => {
    if (!removedId) return;
    setItems((cur) => cur.filter((m) => m.id !== removedId));
    setTotal((t) => Math.max(0, t - 1));
  }, [removedId]);

  const { jobs, upload, clearErrors } = useUpload((item) => {
    setItems((cur) => [item, ...cur.filter((m) => m.id !== item.id)]);
    setTotal((t) => t + 1);
  });

  return (
    <div className="space-y-4">
      {/* Usage groups */}
      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b px-1" aria-label="Kullanım yeri">
        {USAGE_ORDER.map((u) => {
          const m = USAGE_META[u];
          const active = u === usage;
          return (
            <button
              key={u}
              type="button"
              title={m.hint}
              onClick={() => setUsage(u)}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors",
                active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <m.icon className="size-4" />
              {m.label}
              {usageCounts && <span className={cn("rounded-md px-1.5 text-xs tabular-nums", active ? "bg-primary/10 text-primary" : "bg-muted")}>{usageCounts[u]}</span>}
            </button>
          );
        })}
      </nav>
      {usage !== "all" && <p className="text-sm text-muted-foreground">{USAGE_META[usage].hint}.</p>}

      <UploadZone jobs={jobs} onFiles={(f) => upload(f, folder || null)} onClearErrors={clearErrors} folder={folder} onFolderChange={setFolder} compact={!!lockKind} accept={lockKind === "image" ? "image/*" : undefined} />

      <div className="flex flex-wrap items-center gap-3">
        {!lockKind && (
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => {
              const active = f.kind === kind;
              const n = counts ? (f.kind ? counts[f.kind] : Object.values(counts).reduce((a, b) => a + b, 0)) : undefined;
              return (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setKind(f.kind)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    active ? "border-foreground/20 bg-card text-foreground shadow-xs" : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground",
                  )}
                >
                  <f.icon className="size-3.5" />
                  {f.label}
                  {n !== undefined && usage === "all" && <span className="tabular-nums text-muted-foreground">{n}</span>}
                </button>
              );
            })}
          </div>
        )}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dosya adı veya alt metin ara" className="h-9 bg-card pl-9" />
        </div>
      </div>

      {items.length === 0 && !loading ? (
        <p className="rounded-xl border border-dashed bg-card px-5 py-16 text-center text-sm text-muted-foreground">{q ? "Sonuç yok." : "Henüz dosya yok."}</p>
      ) : (
        <ul className={cn("grid gap-3", columns, loading && !items.length && "opacity-50")}>
          {items.map((m) => {
            const alt = m.texts.tr?.alt;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onOpen(m)}
                  className={cn(
                    "group block w-full overflow-hidden rounded-xl border bg-card text-left shadow-xs transition hover:border-foreground/20 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    selectedId === m.id && "border-primary ring-2 ring-primary/30",
                  )}
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <MediaThumb item={m} className="transition-transform duration-300 group-hover:scale-[1.03]" />
                    {m.kind === "video" && <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">VIDEO</span>}
                    {m.kind === "image" && !alt && (
                      <span className="absolute right-2 top-2 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-navy-900" title="Alt metin eksik">
                        ALT
                      </span>
                    )}
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="truncate text-xs font-medium">{m.originalName ?? m.path.split("/").pop()}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{alt || "Alt metin yok"}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {m.usage.length ? (
                        m.usage.map((u) => (
                          <span key={u} className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", USAGE_META[u].chip)}>
                            {USAGE_META[u].label}
                          </span>
                        ))
                      ) : (
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", USAGE_META.unused.chip)}>Kullanılmıyor</span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {items.length} / {total}
        </span>
        {items.length < total && (
          <Button variant="outline" size="sm" className="bg-card" disabled={loading} onClick={() => load({ kind, q, offset: items.length })}>
            {loading && <Loader2 className="animate-spin" />} Daha fazla
          </Button>
        )}
      </div>
    </div>
  );
}
