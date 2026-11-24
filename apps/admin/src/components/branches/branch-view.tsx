"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Clock, Globe, ImageOff, Languages, MapPin, MapPinOff, Plus, Search, Store } from "lucide-react";
import type { AdminBranchRow, AdminCity, BranchStatus } from "@doyuyo/core";
import { Input } from "@/components/ui/input";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { setBranchStatus } from "@/app/(panel)/subeler/actions";
import { BranchSheet } from "./branch-sheet";

export const STATUS: Record<BranchStatus, { label: string; dot: string; pill: string }> = {
  open: { label: "Yayında", dot: "bg-ok", pill: "bg-ok/10 text-ok" },
  soon: { label: "Yakında", dot: "bg-amber-500", pill: "bg-amber-400/15 text-amber-700" },
  closed: { label: "Kapalı", dot: "bg-muted-foreground/50", pill: "bg-muted text-muted-foreground" },
};

type StatusFilter = BranchStatus | "all";
type Gap = "geo" | "en" | "photo";
const GAPS: { id: Gap; label: string; icon: typeof MapPinOff; test: (b: AdminBranchRow) => boolean }[] = [
  { id: "geo", label: "Konum yok", icon: MapPinOff, test: (b) => !b.hasGeo },
  { id: "en", label: "İngilizce yok", icon: Languages, test: (b) => !b.hasEn },
  { id: "photo", label: "Fotoğraf yok", icon: ImageOff, test: (b) => !b.imagePath },
];
const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");

export function BranchView({ cities, branches: initial }: { cities: AdminCity[]; branches: AdminBranchRow[] }) {
  const [rows, setRows] = useState(initial);
  const [city, setCity] = useState<number | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [gap, setGap] = useState<Gap | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<number | "new" | null>(null);
  const [error, setError] = useState("");

  const usedCities = cities.filter((c) => c.branchCount > 0);
  const inCity = useMemo(() => (city === "all" ? rows : rows.filter((b) => b.cityId === city)), [rows, city]);
  const counts = useMemo(() => {
    const by = { all: inCity.length, open: 0, soon: 0, closed: 0 } as Record<StatusFilter, number>;
    inCity.forEach((b) => by[b.status]++);
    return by;
  }, [inCity]);
  const gapCounts = useMemo(() => Object.fromEntries(GAPS.map((g) => [g.id, inCity.filter(g.test).length])) as Record<Gap, number>, [inCity]);

  const list = useMemo(() => {
    const q = fold(search.trim());
    const g = GAPS.find((x) => x.id === gap);
    return inCity.filter(
      (b) => (status === "all" || b.status === status) && (!g || g.test(b)) && (!q || fold(`${b.name} ${b.address} ${b.district ?? ""} ${b.cityName} ${b.key}`).includes(q)),
    );
  }, [inCity, status, gap, search]);

  const changeStatus = async (b: AdminBranchRow, next: BranchStatus) => {
    if (next === b.status) return;
    setError("");
    setRows((xs) => xs.map((x) => (x.id === b.id ? { ...x, status: next } : x)));
    const r = await setBranchStatus(b.id, next);
    if (!r.ok) {
      setRows((xs) => xs.map((x) => (x.id === b.id ? { ...x, status: b.status } : x)));
      setError(r.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Toplam şube" value={rows.length} icon={Store} />
        <Stat label="Sitede yayında" value={rows.filter((b) => b.status === "open").length} icon={Globe} tone="ok" />
        <Stat label="Yakında açılacak" value={rows.filter((b) => b.status === "soon").length} icon={Clock} tone="amber" />
        <Stat label="Eksik bilgili" value={rows.filter((b) => GAPS.some((g) => g.test(b))).length} icon={AlertTriangle} tone="red" hint="konum, İngilizce ya da fotoğraf" />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[260px_1fr]">
        {/* Cities */}
        <aside className="rounded-xl border bg-card shadow-xs xl:sticky xl:top-6">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Şehirler</h2>
            <span className="text-xs text-muted-foreground">{usedCities.length}</span>
          </div>
          <ul className="flex gap-1 overflow-x-auto p-2 xl:block xl:max-h-[calc(100svh-9rem)] xl:space-y-0.5 xl:overflow-y-auto">
            <CityRow active={city === "all"} onClick={() => setCity("all")} name="Tüm şehirler" count={rows.length} />
            {usedCities.map((c) => (
              <CityRow key={c.id} active={city === c.id} onClick={() => setCity(c.id)} name={c.name} count={rows.filter((b) => b.cityId === c.id).length} foreign={c.country !== "turkiye"} />
            ))}
          </ul>
        </aside>

        {/* Branches */}
        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border bg-card p-0.5 text-sm shadow-xs">
              {(["all", "open", "soon", "closed"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors", status === s ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {s !== "all" && <span className={cn("size-1.5 rounded-full", STATUS[s].dot)} />}
                  {s === "all" ? "Tümü" : STATUS[s].label}
                  <span className="tabular-nums text-xs text-muted-foreground">{counts[s]}</span>
                </button>
              ))}
            </div>
            <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
              <div className="relative flex-1 sm:w-72 sm:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Şube, AVM, ilçe ara" className="h-9 bg-card pl-9" />
              </div>
              <button type="button" onClick={() => setOpen("new")} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-foreground px-3 text-sm font-medium text-background hover:opacity-90">
                <Plus className="size-4" /> Yeni şube
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Eksikler:</span>
            {GAPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGap(gap === g.id ? null : g.id)}
                disabled={!gapCounts[g.id] && gap !== g.id}
                aria-pressed={gap === g.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40",
                  gap === g.id ? "border-foreground/20 bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <g.icon className="size-3.5" /> {g.label} <span className="tabular-nums opacity-70">{gapCounts[g.id]}</span>
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
              {list.length} şube gösteriliyor
            </span>
          </div>

          {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <ul className="divide-y">
              {list.map((b) => {
                const missing = GAPS.filter((g) => g.test(b));
                return (
                  <li key={b.id} className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40">
                    <button type="button" onClick={() => setOpen(b.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {b.imagePath ? (
                          <img src={mediaUrl(b.imagePath)} alt="" loading="lazy" className="size-full object-cover" />
                        ) : (
                          <span className="grid size-full place-items-center text-muted-foreground">
                            <Store className="size-4" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-sm font-medium", b.status !== "open" && "text-muted-foreground")}>{b.name.replace(/^Doyuyo!\s*/, "")}</span>
                        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">
                            {b.cityName}
                            {b.district ? ` · ${b.district}` : ""} — {b.address || "Adres yok"}
                          </span>
                        </span>
                      </span>
                    </button>
                    <span className="hidden w-36 shrink-0 truncate text-xs tabular-nums text-muted-foreground lg:block" title={b.hours.map((h) => `${h.day} ${h.time}`).join(", ")}>
                      {b.hours[0] ? b.hours[0].time : "Saat yok"}
                      {b.hours.length > 1 ? ` +${b.hours.length - 1}` : ""}
                    </span>
                    <span className="hidden w-14 shrink-0 justify-end gap-1 md:flex">
                      {missing.map((g) => (
                        <span key={g.id} title={g.label} className="grid size-6 place-items-center rounded-md bg-amber-400/15 text-amber-700">
                          <g.icon className="size-3.5" />
                        </span>
                      ))}
                    </span>
                    <StatusSelect value={b.status} onChange={(s) => changeStatus(b, s)} />
                  </li>
                );
              })}
            </ul>
            {!list.length && <p className="px-5 py-14 text-center text-sm text-muted-foreground">Bu filtrede şube yok.</p>}
          </div>
        </section>
      </div>

      <BranchSheet
        id={open}
        cities={cities}
        onCreated={(row) => setRows((xs) => [row, ...xs])}
        onDeleted={(gone) => setRows((xs) => xs.filter((x) => x.id !== gone))}
        onClose={() => setOpen(null)}
        onSaved={(patch) => setRows((xs) => xs.map((x) => (x.id === patch.id ? { ...x, ...patch } : x)))}
      />
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone, hint }: { label: string; value: number; icon: typeof Store; tone?: "ok" | "amber" | "red"; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span
          className={cn(
            "grid size-7 place-items-center rounded-md",
            tone === "ok" ? "bg-ok/10 text-ok" : tone === "amber" ? "bg-amber-400/15 text-amber-700" : tone === "red" ? "bg-red-600/10 text-red-600" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CityRow({ active, onClick, name, count, foreign }: { active: boolean; onClick: () => void; name: string; count: number; foreign?: boolean }) {
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm transition-colors",
          active ? "bg-muted font-semibold" : "font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        )}
      >
        <span className="flex-1 text-left">{name}</span>
        {foreign && <Globe className="size-3 text-muted-foreground" aria-label="Yurt dışı" />}
        <span className="tabular-nums text-xs text-muted-foreground">{count}</span>
      </button>
    </li>
  );
}

export function StatusSelect({ value, onChange }: { value: BranchStatus; onChange: (s: BranchStatus) => void }) {
  return (
    <label className={cn("relative flex shrink-0 items-center gap-1.5 rounded-md py-1 pl-2 pr-1 text-xs font-medium", STATUS[value].pill)}>
      <span className={cn("size-1.5 rounded-full", STATUS[value].dot)} />
      <span className="sr-only">Durum</span>
      <select value={value} onChange={(e) => onChange(e.target.value as BranchStatus)} className="cursor-pointer appearance-none bg-transparent pr-4 outline-none">
        {(Object.keys(STATUS) as BranchStatus[]).map((s) => (
          <option key={s} value={s}>
            {STATUS[s].label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-1.5 text-[9px] opacity-60">▼</span>
    </label>
  );
}
