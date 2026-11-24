import { FileText, File as FileIcon } from "lucide-react";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { MediaDTO } from "./types";

/** Square-ish preview for any media kind. */
export function MediaThumb({ item, className, controls }: { item: Pick<MediaDTO, "path" | "kind" | "mime" | "texts">; className?: string; controls?: boolean }) {
  const src = mediaUrl(item.path);
  if (item.kind === "image")
    return <img src={src} alt={item.texts.tr?.alt ?? ""} loading="lazy" className={cn("size-full object-cover", item.mime === "image/svg+xml" && "object-contain p-4", className)} />;
  if (item.kind === "video") return <video src={`${src}#t=0.5`} preload="metadata" muted playsInline controls={controls} className={cn("size-full bg-black object-cover", className)} />;
  const Icon = item.kind === "document" ? FileText : FileIcon;
  return (
    <div className={cn("grid size-full place-items-center bg-muted text-muted-foreground", className)}>
      <div className="flex flex-col items-center gap-1">
        <Icon className="size-8" />
        <span className="text-[11px] font-semibold uppercase">{item.path.split(".").pop()}</span>
      </div>
    </div>
  );
}
