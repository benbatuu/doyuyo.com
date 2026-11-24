"use client";
import { useEffect, useRef } from "react";
import { preconnect } from "react-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import { isOpenNow, type OpeningHours } from "@doyuyo/core";
import { istanbulMinutes } from "./open-status";

export interface MapPoint {
  id: number;
  lat: number;
  lng: number;
  name: string;
  href: string;
  /** Optional details: when present the pin opens a full branch card. */
  address?: string;
  hours?: OpeningHours[];
  image?: string | null;
  mapsUrl?: string | null;
  city?: string | null;
}

export interface MapLabels {
  details: string;
  directions: string;
  openNow: string;
  closedNow: string;
}

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ICON_CLOCK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const ICON_PIN = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';

/** Full branch card shown inside the map popup (plain DOM string: MapLibre popups are not React). */
function cardHtml(p: MapPoint, labels?: MapLabels) {
  if (!labels || (!p.address && !p.image)) return `<a href="${esc(p.href)}" style="font-weight:800;color:#01243c">${esc(p.name)}</a>`;
  const open = p.hours ? isOpenNow(p.hours, istanbulMinutes()) : null;
  const img = p.image ? `<img class="bp-img" alt="" loading="lazy" src="/_next/image?url=${encodeURIComponent(p.image)}&w=640&q=80" />` : "";
  const status = open === null ? "" : `<span class="bp-status ${open ? "is-open" : "is-closed"}"><i></i>${esc(open ? labels.openNow : labels.closedNow)}</span>`;
  const hours = (p.hours ?? []).slice(0, 1).map((h) => `<div class="bp-row">${ICON_CLOCK}<span>${esc(h.day)} · ${esc(h.time)}</span></div>`).join("");
  const dir = p.mapsUrl ? `<a class="bp-btn bp-btn-out" href="${esc(p.mapsUrl)}" target="_blank" rel="noopener noreferrer">${ICON_PIN}${esc(labels.directions)}</a>` : "";
  return `<div class="bp-card">${img}<div class="bp-body">
    <div class="bp-top">${p.city ? `<span class="bp-city">${esc(p.city)}</span>` : ""}${status}</div>
    <h3 class="bp-name">${esc(p.name)}</h3>
    ${p.address ? `<p class="bp-addr">${esc(p.address)}</p>` : ""}
    ${hours}
    <div class="bp-actions"><a class="bp-btn bp-btn-dark" href="${esc(p.href)}">${esc(labels.details)}</a>${dir}</div>
  </div></div>`;
}

// Free vector tiles, no API key (OpenFreeMap / OpenStreetMap data).
const STYLE = "https://tiles.openfreemap.org/styles/positron";

/**
 * Branch map. Loads MapLibre only on the client and only when the map scrolls into view.
 * Points without coordinates are simply not passed in.
 */
export function BranchMap({ points, activeId, onSelect, className = "", labels }: { points: MapPoint[]; activeId?: number | null; onSelect?: (id: number) => void; className?: string; labels?: MapLabels }) {
  // Warm the connection to the tile server before the map scrolls into view.
  preconnect("https://tiles.openfreemap.org");
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<import("maplibre-gl").Map | null>(null);
  const markers = useRef(new Map<number, import("maplibre-gl").Marker>());
  const openPopup = useRef<import("maplibre-gl").Popup | null>(null);

  useEffect(() => {
    let cancelled = false;
    const node = el.current;
    if (!node) return;
    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry?.isIntersecting || map.current) return;
      io.disconnect();
      const maplibre = await import("maplibre-gl");
      if (cancelled) return;
      maplibre.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");
      const m = new maplibre.Map({ container: node, style: STYLE, center: [32.8, 39.2], zoom: 4.6, attributionControl: { compact: true }, cooperativeGestures: true });
      m.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.current = m;
      m.on("load", () => draw(maplibre));
    });
    io.observe(node);
    // Keep the canvas sized when the container is shown/hidden or resized (mobile List/Map switch).
    const ro = new ResizeObserver(() => map.current?.resize());
    ro.observe(node);
    return () => {
      ro.disconnect();
      cancelled = true;
      io.disconnect();
      map.current?.remove();
      map.current = null;
      markers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = (maplibre: typeof import("maplibre-gl")) => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current.clear();
    const bounds = new maplibre.LngLatBounds();
    points.forEach((p, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "branch-pin";
      dot.style.animationDelay = `${Math.min(i * 18, 900)}ms`;
      dot.setAttribute("aria-label", p.name);
      const rich = !!labels && !!(p.address || p.image);
      // Card opens above or below the pin, whichever side has room (chosen on click).
      const makePopup = (anchor?: "top" | "bottom") => {
        const pp = new maplibre.Popup({
          offset: rich ? 0 : 18,
          closeButton: rich,
          maxWidth: rich ? "320px" : "240px",
          className: rich ? "branch-popup" : undefined,
          anchor: rich ? "center" : anchor,
        }).setHTML(cardHtml(p, labels));
        // One card at a time.
        pp.on("open", () => {
          const prev = openPopup.current;
          if (prev && prev !== pp) {
            // Fade the old card out, then remove it, so the switch does not jump.
            prev.getElement()?.classList.add("is-leaving");
            setTimeout(() => prev.remove(), 200);
          }
          openPopup.current = pp;
          // Card is centred on the pin: glide the map so the pin lands in the middle.
          if (rich && m) m.flyTo({ center: [p.lng, p.lat], duration: 900, curve: 1.3, essential: true });
        });
        return pp;
      };
      const popup = makePopup();
      dot.addEventListener("click", () => {
        onSelect?.(p.id);
        if (!rich) return;
        const mk = markers.current.get(p.id);
        if (mk) mk.setPopup(makePopup());
      });
      const mk = new maplibre.Marker({ element: dot }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(m);
      markers.current.set(p.id, mk);
    });
    // Frame the main cluster: with many pins, leave far outliers (e.g. Dubai) out of the initial view.
    const lngs = points.map((p) => p.lng).sort((a, b) => a - b);
    const median = lngs[Math.floor(lngs.length / 2)] ?? 0;
    const framed = points.length > 5 ? points.filter((p) => Math.abs(p.lng - median) < 15) : points;
    framed.forEach((p) => bounds.extend([p.lng, p.lat]));
    if (points.length === 1) m.jumpTo({ center: [points[0]!.lng, points[0]!.lat], zoom: 14 });
    else if (points.length > 1) m.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 600 });
  };

  // Redraw when the filtered list changes.
  useEffect(() => {
    if (!map.current?.loaded()) return;
    void import("maplibre-gl").then((mod) => draw(mod));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  // Focus the active branch.
  useEffect(() => {
    const p = points.find((x) => x.id === activeId);
    if (!p || !map.current) return;
    map.current.flyTo({ center: [p.lng, p.lat], zoom: 14, duration: 800 });
    const mk = markers.current.get(p.id);
    if (mk && !mk.getPopup()?.isOpen()) mk.togglePopup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  return <div ref={el} className={`relative overflow-hidden rounded-[var(--radius-card)] bg-sky-50 ${className}`} role="region" aria-label="Map" />;
}
