"use client";
import { useEffect, useState } from "react";
import { Icons } from "@doyuyo/ui";

const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");

/** Filters rows marked [data-allergen-row] in the table below by product name. */
export function AllergenFilter({ label }: { label: string }) {
  const [q, setQ] = useState("");
  useEffect(() => {
    const f = fold(q.trim());
    document.querySelectorAll<HTMLElement>("[data-allergen-row]").forEach((tr) => {
      tr.hidden = !!f && !fold(tr.dataset.allergenRow ?? "").includes(f);
    });
  }, [q]);
  return (
    <label className="relative block max-w-md">
      <span className="sr-only">{label}</span>
      <Icons.Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted" />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={label} className="h-12 w-full rounded-full border-2 border-line bg-white pl-11 pr-4 font-bold outline-none focus:border-navy-900" />
    </label>
  );
}
