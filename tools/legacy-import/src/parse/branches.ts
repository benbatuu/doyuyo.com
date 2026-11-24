import type { Element } from "domhandler";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JSON_DIR, USER_AGENT, clean, sleep, writeJson } from "../lib.ts";
import type { CrawlEntry } from "../crawl.ts";
import { type Locale, abs, contentNodes, imgSrc, loadRaw, meta, pathOf, slugOf, imageKey, type ContentNode, type PageMeta } from "./common.ts";

export interface Hours {
  day: string;
  time: string;
}
export interface BranchT {
  name: string;
  slug: string;
  url: string;
  aliasUrls: string[];
  address: string;
  hours: Hours[];
  description: ContentNode[];
  meta: PageMeta;
}
export interface Branch {
  id: string; // TR slug
  country: { slug: string; name: Partial<Record<Locale, string>> };
  city: { slug: string; name: Partial<Record<Locale, string>> } | null;
  district: { slug: string; name: Partial<Record<Locale, string>> } | null;
  istanbulSide: "avrupa" | "anadolu" | null;
  geo: { lat: number; lng: number; source: "place" | "embed" | "dms" | "viewport" } | null;
  mapsResolvedUrl: string | null;
  mapsUrl: string | null;
  mapEmbedUrl: string | null;
  cardImage: string | null;
  gallery: string[];
  translations: Partial<Record<Locale, BranchT>>;
}

interface Card {
  href: string;
  name: string;
  address: string;
  hours: Hours[];
  image: string | null;
  mapsUrl: string | null;
}

async function listingCards(key: string) {
  const $ = await loadRaw(key);
  const heading = clean($("#branches-map h1, .branches h1.heading-4").first().text());
  const list: Card[] = $(".branch-card")
    .map((_, c) => {
      const $c = $(c);
      const a = $c.find(".branch-card-body a").first();
      const img = $c.find("img")[0] as Element | undefined;
      return {
        href: abs(a.attr("href")),
        name: clean(a.text()),
        address: clean($c.find("address").first().text()),
        hours: hoursFrom($, $c),
        image: img ? imgSrc($, img) : null,
        mapsUrl: $c.find('a[href*="google."], a[href*="goo.gl"]').attr("href") ?? null,
      };
    })
    .get();
  return { heading, list };
}

function hoursFrom($: Awaited<ReturnType<typeof loadRaw>>, $scope: ReturnType<Awaited<ReturnType<typeof loadRaw>>>): Hours[] {
  return $scope
    .find("table tbody tr")
    .map((_, tr) => {
      const td = $(tr).find("td");
      return { day: clean(td.eq(0).text()), time: clean(td.eq(1).text()) };
    })
    .get()
    .filter((h) => h.day || h.time);
}

/**
 * Coordinates, most precise first:
 * 1. place URL data (!3d lat !4d lng) = the pinned place itself
 * 2. embed center (!3d lat !2d lng), only when zoomed in (span !1d <= 20 km)
 * 3. place URL viewport center (@lat,lng) or DMS in the path
 */
export function geoFrom(embed: string | null, link: string | null): Branch["geo"] {
  const d = link ? decodeURIComponent(link) : "";
  const place = d.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (place) return { lat: +place[1]!, lng: +place[2]!, source: "place" };
  if (embed) {
    const span = +(embed.match(/!1d([\d.]+)/)?.[1] ?? Infinity);
    const lat = embed.match(/!3d(-?\d+\.\d+)/)?.[1];
    const lng = embed.match(/!2d(-?\d+\.\d+)/)?.[1];
    if (lat && lng && span <= 20000) return { lat: +lat, lng: +lng, source: "embed" };
  }
  const dms = d.match(/(\d+)°(\d+)'([\d.]+)"([NS])\s*\+?\s*(\d+)°(\d+)'([\d.]+)"([EW])/);
  if (dms) {
    const conv = (a: string, b: string, c: string, h: string) => (+a + +b / 60 + +c / 3600) * (h === "S" || h === "W" ? -1 : 1);
    return { lat: conv(dms[1]!, dms[2]!, dms[3]!, dms[4]!), lng: conv(dms[5]!, dms[6]!, dms[7]!, dms[8]!), source: "dms" };
  }
  const at = d.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: +at[1]!, lng: +at[2]!, source: "viewport" };
  return null;
}

/** Resolve maps.app.goo.gl short links once (cached), so the place coordinates can be read. */
async function resolveShortLinks(urls: string[]): Promise<Map<string, string>> {
  const cachePath = join(JSON_DIR, "_maps-cache.json");
  let cache: Record<string, string> = {};
  try {
    cache = JSON.parse(await readFile(cachePath, "utf8"));
  } catch {}
  for (const u of urls) {
    if (cache[u] || !/goo\.gl/.test(u)) continue;
    try {
      const res = await fetch(u, { redirect: "manual", headers: { "user-agent": USER_AGENT } });
      const loc = res.headers.get("location");
      if (loc) cache[u] = loc;
    } catch {}
    await sleep(300);
  }
  await writeJson(cachePath, cache);
  return new Map(Object.entries(cache));
}

export async function parseBranches(manifest: CrawlEntry[]) {
  const byUrl = new Map(manifest.filter((e) => e.key).map((e) => [e.url, e]));
  const final = new Map(manifest.map((e) => [e.url, e.finalUrl]));
  const issues: string[] = [];
  const branches = new Map<string, Branch>();
  const byMaps = new Map<string, string>(); // maps url / image id -> TR id

  // Listing pages: country / city / district (most specific wins). TR first, then EN.
  const listing = (loc: Locale) =>
    manifest
      .filter((e) => e.key && e.status === 200)
      .map((e) => ({ e, segs: pathOf(e.url).split("/").filter(Boolean) }))
      .filter(({ segs }) =>
        loc === "tr" ? segs[0] === "subelerimiz" || (segs[0] === "tr" && segs[1] === "subelerimiz") : segs[0] === "en" && segs[1] === "branches",
      )
      .map(({ e, segs }) => ({ e, segs: segs[0] === "subelerimiz" ? segs.slice(1) : segs.slice(2) }))
      // more specific listings last so they overwrite
      .sort((a, b) => a.segs.length - b.segs.length);

  // Country names come from the filter <select> (order: placeholder, Türkiye, UAE).
  const countryNames: Partial<Record<Locale, Record<string, string>>> = {};
  for (const loc of ["tr", "en"] as const) {
    const first = listing(loc)[0];
    if (!first) continue;
    const $c = await loadRaw(first.e.key!);
    const opts = $c("select[name=country] option").map((_, o) => clean($c(o).text())).get();
    countryNames[loc] = { turkiye: opts[1] ?? "", "dol-alamarat-alaarby-almthd": opts[2] ?? "" };
  }

  for (const loc of ["tr", "en"] as const) {
    for (const { e, segs } of listing(loc)) {
      const { heading, list } = await listingCards(e.key!);
      const [country, city, district] = segs;
      const side = segs[0] === "istanbul-avrupa-yakasi" ? "avrupa" : segs[0] === "istanbul-anadolu-yakasi" ? "anadolu" : null;
      // "Adana / Çukurova Doyuyo Şubeleri" -> ["Adana", "Çukurova"]
      const names = heading.replace(/\s*Doyuyo.*$/i, "").split("/").map(clean);
      for (const c of list) {
        const finalUrl = final.get(c.href) ?? c.href;
        let id: string;
        if (loc === "tr") id = slugOf(finalUrl);
        else {
          // Primary: the EN page's own hreflang="tr" link (reciprocal pairing).
          const enEntry = byUrl.get(finalUrl) ?? byUrl.get(c.href);
          let altTr: string | undefined;
          if (enEntry?.key) {
            const href = (await loadRaw(enEntry.key))('link[rel="alternate"][hreflang="tr"]').attr("href");
            if (href) altTr = slugOf(final.get(href) ?? href);
          }
          const m =
            (altTr && branches.has(altTr) ? altTr : undefined) ??
            (branches.has(slugOf(finalUrl)) ? slugOf(finalUrl) : undefined) ??
            (c.mapsUrl ? byMaps.get(c.mapsUrl) : undefined) ??
            byMaps.get(`img:${imageKey(c.image)}`);
          if (!m) {
            if (!issues.includes(`EN branch without TR match: ${c.href}`)) issues.push(`EN branch without TR match: ${c.href}`);
            continue;
          }
          id = m;
        }
        let b = branches.get(id);
        if (!b) {
          if (loc === "en") continue;
          b = {
            id,
            country: { slug: "turkiye", name: {} },
            city: null,
            district: null,
            istanbulSide: null,
            geo: null,
            mapsUrl: c.mapsUrl,
            mapEmbedUrl: null,
            mapsResolvedUrl: null,
            cardImage: c.image,
            gallery: [],
            translations: {},
          };
          branches.set(id, b);
        }
        if (loc === "tr") {
          if (c.mapsUrl) byMaps.set(c.mapsUrl, id);
          if (c.image) byMaps.set(`img:${imageKey(c.image)}`, id);
        }
        if (side) b.istanbulSide = side;
        else if (country) {
          b.country.slug = country;
          b.country.name[loc] = countryNames[loc]?.[country] ?? b.country.name[loc];
          if (city) {
            b.city ??= { slug: city, name: {} };
            if (names[0]) b.city.name[loc] = names[0];
          }
          if (district) {
            b.district ??= { slug: district, name: {} };
            if (names[1]) b.district.name[loc] = names[1];
          }
        }
        const t = b.translations[loc];
        if (!t)
          b.translations[loc] = {
            name: c.name,
            slug: slugOf(finalUrl),
            url: finalUrl,
            aliasUrls: c.href !== finalUrl ? [c.href] : [],
            address: c.address,
            hours: c.hours,
            description: [],
            meta: {} as PageMeta,
          };
      }
    }
  }

  // Detail pages
  for (const b of branches.values()) {
    for (const loc of ["tr", "en"] as const) {
      const t = b.translations[loc];
      if (!t) continue;
      const entry = byUrl.get(t.url);
      if (!entry?.key) {
        issues.push(`branch detail not crawled: ${t.url}`);
        continue;
      }
      const $ = await loadRaw(entry.key);
      const $hero = $("#branch-hero");
      t.name = clean($hero.find("h1").first().text()) || t.name;
      t.address = clean($hero.find("address").first().text()) || t.address;
      const h = hoursFrom($, $hero);
      if (h.length) t.hours = h;
      const free = $hero.find(".free-area")[0];
      t.description = free ? contentNodes($, free) : [];
      t.meta = meta($);
      if (loc === "tr") {
        b.mapEmbedUrl = $hero.find("iframe").attr("src") ?? null;
        const link = $hero.find("a[href*='goo.gl'], a[href*='google.']").attr("href") ?? null;
        if (link && !b.mapsUrl) b.mapsUrl = link;
        b.gallery = $("#branch-gallery img")
          .map((_, i) => imgSrc($, i as Element))
          .get();
      }
    }
    if (!b.translations.tr) continue;
    const enAlt = b.translations.tr.meta.alternates?.en;
    if (!b.translations.en && enAlt) {
      issues.push(`TR branch page links to an EN page that is not this branch: ${b.id} -> ${enAlt} (resolves to ${final.get(enAlt) ?? enAlt})`);
    }
    if (!b.translations.en) issues.push(`branch without EN version: ${b.id}`);
  }

  // Coordinates
  const all = [...branches.values()];
  const resolved = await resolveShortLinks(all.map((b) => b.mapsUrl).filter((u): u is string => !!u));
  for (const b of all) {
    b.mapsResolvedUrl = b.mapsUrl ? (resolved.get(b.mapsUrl) ?? null) : null;
    b.geo = geoFrom(b.mapEmbedUrl, b.mapsResolvedUrl ?? b.mapsUrl);
    if (!b.geo) issues.push(`branch without coordinates: ${b.id}`);
    else if (b.geo.source !== "place") issues.push(`branch coordinates are approximate (${b.geo.source}): ${b.id}`);
  }

  // Legacy /tr/sube/{slug} aliases
  for (const e of manifest) {
    const segs = pathOf(e.url).split("/").filter(Boolean);
    if (segs[0] === "tr" && segs[1] === "sube") {
      const b = branches.get(segs[2]!);
      if (b?.translations.tr && !b.translations.tr.aliasUrls.includes(e.url)) b.translations.tr.aliasUrls.push(e.url);
      else if (!b) issues.push(`legacy /tr/sube page not in listings: ${e.url}`);
    }
  }
  const listed = new Set([...branches.values()].flatMap((b) => Object.values(b.translations).flatMap((t) => [t!.url, ...t!.aliasUrls])));
  const unlisted = manifest
    .filter((e) => /^\/(sube|en\/branch)\//.test(pathOf(e.url)) && !listed.has(e.url) && !listed.has(e.finalUrl))
    .map((e) => e.url);
  for (const u of unlisted) issues.push(`branch page not shown in any listing: ${u}`);

  return { branches: [...branches.values()].sort((a, b) => a.id.localeCompare(b.id)), issues };
}
