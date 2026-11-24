"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { nearestBranches, type BranchSummary, type CitySummary } from "@doyuyo/core";
import { Icons, buttonClass } from "@doyuyo/ui";
import { BranchMap, type MapPoint } from "./branch-map";
import { OpenStatus } from "./open-status";

export interface ExplorerLabels {
  search: string;
  allCities: string;
  nearMe: string;
  locating: string;
  locationDenied: string;
  openNow: string;
  closedNow: string;
  directions: string;
  details: string;
  noResults: string;
  count: string; // "{count}" placeholder
  list: string;
  map: string;
  more: string;
}

const PAGE = 20;
const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");

/**
 * App-like branch finder: on desktop a full-height split (scrolling list panel + map that fills the
 * rest), on phones a List / Map switch. Search, city chips and "nearest to me" (location asked only
 * on click). The list renders in pages of 20.
 */
export function BranchExplorer({ branches, cities, labels, initialCity, title }: { branches: BranchSummary[]; cities: CitySummary[]; labels: ExplorerLabels; initialCity?: number; title?: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<number | null>(initialCity ?? null);
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "denied">("idle");
  const [active, setActive] = useState<number | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [view, setView] = useState<"list" | "map">("list");
  const listRef = useRef<HTMLDivElement>(null);

  const cityName = (id: number | null) => cities.find((c) => c.id === id)?.name;
  const filtered = useMemo(() => {
    const q = fold(query.trim());
    const list = branches.filter((b) => (!city || b.city?.name === cityName(city)) && (!q || fold(`${b.name} ${b.address} ${b.district ?? ""} ${b.city?.name ?? ""}`).includes(q)));
    if (!here) return list.map((b) => ({ b, km: undefined as number | undefined }));
    const km = new Map(nearestBranches(list, here, list.length).map((r) => [r.branch.id, r.km]));
    return [...list].sort((a, b) => (km.get(a.id) ?? 1e9) - (km.get(b.id) ?? 1e9)).map((b) => ({ b, km: km.get(b.id) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, query, city, here]);

  const points: MapPoint[] = useMemo(() => filtered.filter(({ b }) => b.geo).map(({ b }) => ({ id: b.id, lat: b.geo!.lat, lng: b.geo!.lng, name: b.name, href: b.path, address: b.address, hours: b.hours, image: b.image?.src ?? null, mapsUrl: b.mapsUrl, city: b.city?.name ?? null })), [filtered]);
  const reset = () => {
    setShown(PAGE);
    listRef.current?.scrollTo({ top: 0 });
  };

  const locate = () => {
    if (!navigator.geolocation) return setGeoState("denied");
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCity(null);
        setGeoState("idle");
        reset();
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const select = (id: number) => {
    setActive(id);
    const i = filtered.findIndex((x) => x.b.id === id);
    if (i >= shown) setShown(i + 1);
    requestAnimationFrame(() => document.getElementById(`branch-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper shadow-[var(--shadow-card)] lg:h-[calc(100svh-5rem)] lg:flex-row lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none">
      {/* list panel */}
      <div className={clsx("flex min-h-0 flex-col border-line bg-paper lg:w-[30rem] lg:shrink-0 lg:border-r xl:w-[34rem]", view === "map" && "max-lg:hidden")}>
        <div className="space-y-3 border-b border-line p-4 md:p-5">
          {title}
          <label className="relative block">
            <span className="sr-only">{labels.search}</span>
            <Icons.Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => (setQuery(e.target.value), reset())}
              placeholder={labels.search}
              className="h-12 w-full rounded-full border-2 border-line bg-white pl-11 pr-4 font-bold outline-none transition focus:border-navy-900"
            />
          </label>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            <button type="button" onClick={locate} className={buttonClass(here ? "dark" : "outline", "sm", "shrink-0")} aria-pressed={!!here}>
              <Icons.Crosshair /> {geoState === "loading" ? labels.locating : labels.nearMe}
            </button>
            {cities.length > 1 && (
              <button type="button" onClick={() => (setCity(null), reset())} className={chip(city === null && !here)}>
                {labels.allCities}
              </button>
            )}
            {cities.map((c) => (
              <button key={c.id} type="button" onClick={() => (setCity(c.id), setHere(null), reset())} className={chip(city === c.id)}>
                {c.name} <span className="opacity-60">{c.branchCount}</span>
              </button>
            ))}
          </div>
          {geoState === "denied" && <p className="text-sm font-bold text-red-600">{labels.locationDenied}</p>}
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-muted" aria-live="polite">
              {labels.count.replace("{count}", String(filtered.length))}
            </p>
            <div className="flex rounded-full bg-white p-1 text-sm font-extrabold shadow-[0_1px_0_rgb(1_36_60/0.08)] lg:hidden" role="tablist">
              {(["list", "map"] as const).map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={clsx("rounded-full px-4 py-1.5", view === v ? "bg-navy-900 text-white" : "")}>
                  {v === "list" ? labels.list : labels.map}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 md:p-4">
          <ul className="space-y-2">
            {filtered.slice(0, shown).map(({ b, km }) => (
              <li key={b.id} id={`branch-${b.id}`}>
                <article
                  onMouseEnter={() => b.geo && setActive(b.id)}
                  className={clsx(
                    "rounded-2xl border-2 bg-white p-4 transition",
                    active === b.id ? "border-navy-900 shadow-[var(--shadow-card)]" : "border-transparent hover:border-line",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-extrabold leading-tight">
                      <Link href={b.path} className="hover:text-red-600">
                        {b.name}
                      </Link>
                    </h3>
                    {km !== undefined && <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-extrabold text-navy-900">{km.toFixed(1)} km</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted">{b.address}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <OpenStatus hours={b.hours} openLabel={labels.openNow} closedLabel={labels.closedNow} />
                    {b.hours.map((h, i) => (
                      <span key={i} className="inline-flex items-center gap-1 font-bold">
                        <Icons.Clock className="text-muted" /> {h.day} · {h.time}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link href={b.path} className={buttonClass("dark", "sm", "h-8 px-3 text-xs")}>
                      {labels.details}
                    </Link>
                    {b.mapsUrl && (
                      <a href={b.mapsUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm", "h-8 px-3 text-xs")}>
                        <Icons.MapPin /> {labels.directions}
                      </a>
                    )}
                    {b.geo && (
                      <button type="button" onClick={() => (setActive(b.id), setView("map"))} className="ml-auto text-xs font-extrabold text-red-600 lg:hidden">
                        {labels.map}
                      </button>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ul>
          {shown < filtered.length && (
            <button type="button" onClick={() => setShown((s) => s + PAGE)} className={buttonClass("outline", "md", "mt-4 w-full")}>
              {labels.more} ({filtered.length - shown})
            </button>
          )}
          {!filtered.length && <p className="rounded-2xl bg-white p-8 text-center font-bold text-muted">{labels.noResults}</p>}
        </div>
      </div>

      {/* map */}
      <div className={clsx("relative min-h-[70svh] flex-1 lg:min-h-0", view === "list" && "max-lg:hidden")}>
        <div className="absolute inset-0">
          <BranchMap points={points} activeId={active} onSelect={select} labels={labels} className="h-full w-full rounded-none!" />
        </div>
      </div>
    </div>
  );
}

const chip = (on: boolean) => clsx("h-9 shrink-0 rounded-full px-4 text-sm font-extrabold transition", on ? "bg-navy-900 text-white" : "bg-white text-navy-900 hover:bg-cream-100");
