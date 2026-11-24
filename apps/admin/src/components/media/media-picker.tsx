"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { MediaKind } from "@doyuyo/core";
import { MediaGrid } from "./media-grid";
import type { MediaDTO } from "./types";

/** Pick (or upload) a file from the library. */
export function MediaPicker({
  open,
  onOpenChange,
  onPick,
  kind = "image",
  folder = "",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (m: MediaDTO) => void;
  kind?: MediaKind;
  folder?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-3xl">
        <SheetHeader className="border-b p-5">
          <SheetTitle>Medyadan seç</SheetTitle>
          <SheetDescription>Bir dosyaya tıkla ya da yenisini yükle.</SheetDescription>
        </SheetHeader>
        <div className="p-5">
          {open && (
            <MediaGrid
              lockKind={kind}
              defaultFolder={folder}
              columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
              onOpen={(m) => {
                onPick(m);
                onOpenChange(false);
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
