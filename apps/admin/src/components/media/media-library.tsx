"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MediaKind } from "@doyuyo/core";
import type { UsageFilter } from "./usage";
import { MediaDetails } from "./media-details";
import { MediaGrid } from "./media-grid";
import type { MediaDTO } from "./types";

export function MediaLibrary({ initial, counts, usage }: { initial: { items: MediaDTO[]; total: number }; counts: Record<MediaKind, number>; usage: Record<UsageFilter, number> }) {
  const router = useRouter();
  const [open, setOpen] = useState<MediaDTO | null>(null);
  const [saved, setSaved] = useState<MediaDTO | null>(null);
  const [removedId, setRemovedId] = useState<number | null>(null);
  return (
    <>
      <MediaGrid initial={initial} counts={counts} usageCounts={usage} selectedId={open?.id} onOpen={setOpen} refreshKey={saved} removedId={removedId} />
      <MediaDetails
        item={open}
        onClose={() => setOpen(null)}
        onSaved={(m) => {
          setSaved(m);
          setOpen(m);
        }}
        onDeleted={(id) => {
          setRemovedId(id);
          router.refresh(); // tab counts come from the server
        }}
      />
    </>
  );
}
