"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, UploadCloud, X } from "lucide-react";
import { UPLOAD_ACCEPT } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { UploadJob } from "./use-upload";
import { USAGE_META } from "./usage";
import { MEDIA_USAGES } from "@doyuyo/core";

/** Drop area + file input + per-file progress list. */
export function UploadZone({
  jobs,
  onFiles,
  onClearErrors,
  accept = UPLOAD_ACCEPT,
  compact,
  folder,
  onFolderChange,
}: {
  jobs: UploadJob[];
  onFiles: (f: FileList) => void;
  onClearErrors: () => void;
  accept?: string;
  compact?: boolean;
  folder: string;
  onFolderChange: (f: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-1 font-medium text-muted-foreground">Yüklenecek grup:</span>
        {MEDIA_USAGES.map((u) => {
          const m = USAGE_META[u];
          const active = folder === u;
          return (
            <button
              key={u}
              type="button"
              onClick={() => onFolderChange(active ? "" : u)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1 rounded-md border px-2 py-1 font-medium transition-colors",
                active ? cn("border-transparent", m.chip) : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <m.icon className="size-3.5" /> {m.label}
            </button>
          );
        })}
        {!folder && <span className="text-amber-700">· Grup seçilmezse “Kullanılmayan” altında durur</span>}
      </div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full items-center justify-center gap-3 rounded-xl border border-dashed bg-card text-sm transition-colors hover:border-foreground/30 hover:bg-muted/40",
          compact ? "px-4 py-4" : "px-6 py-8",
          over && "border-primary bg-primary/5",
        )}
      >
        <UploadCloud className="size-5 text-muted-foreground" />
        <span>
          <span className="font-semibold">Dosya yükle</span> <span className="text-muted-foreground">veya buraya sürükle · görsel, video, PDF · en fazla 50 MB</span>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {jobs.length > 0 && (
        <ul className="space-y-1.5">
          {jobs.map((j) => (
            <li key={j.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
              {j.error ? <AlertCircle className="size-4 text-red-600" /> : j.done ? <CheckCircle2 className="size-4 text-ok" /> : <UploadCloud className="size-4 text-muted-foreground" />}
              <span className="min-w-0 flex-1 truncate">{j.name}</span>
              {j.error ? (
                <span className="text-xs text-red-600">{j.error}</span>
              ) : (
                <span className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${j.progress}%` }} />
                </span>
              )}
            </li>
          ))}
          {jobs.some((j) => j.error) && (
            <button type="button" onClick={onClearErrors} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <X className="size-3" /> Hataları temizle
            </button>
          )}
        </ul>
      )}
    </div>
  );
}
