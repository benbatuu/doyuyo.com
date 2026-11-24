/**
 * Download every media file referenced by the parsed JSON.
 * For Laravel Media Library conversions (/storage/{id}/conversions/{name}-{conv}.webp)
 * the original upload is tried first, so the new site gets the highest resolution.
 * Writes output/media/<same path as on doyuyo.com> and output/json/media.json.
 */
import { mkdir, readFile, readdir, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { imageSize } from "image-size";
import pLimit from "p-limit";
import { JSON_DIR, MEDIA, ORIGIN, RAW, USER_AGENT, readJson, sha, sleep, writeJson } from "./lib.ts";

const MEDIA_RE = /https?:\/\/(?:www\.)?doyuyo\.com\/(?:storage|files|assets\/images|images)\/[^"'\s<>]+/g;

/** File names contain "(2)"; drop only an unbalanced closing paren (e.g. from CSS url(...)). */
function trimParen(u: string) {
  while (u.endsWith(")") && (u.match(/\)/g) ?? []).length > (u.match(/\(/g) ?? []).length) u = u.slice(0, -1);
  return u;
}
const CONV_SUFFIX = /-(optimize-\d+|middle|desktop|mobile|thumb|small|large|poster)$/;

export interface MediaItem {
  sourceUrl: string; // URL referenced by the old site
  downloadedUrl: string | null; // URL actually saved (original when found)
  localPath: string | null; // relative to output/media
  isOriginal: boolean;
  bytes: number;
  sha256: string | null;
  contentType: string;
  width: number | null;
  height: number | null;
  status: number;
}

function collect(value: unknown, out: Set<string>) {
  if (typeof value === "string") {
    for (const m of value.matchAll(MEDIA_RE)) out.add(trimParen(m[0]).replace("://www.", "://"));
  } else if (Array.isArray(value)) value.forEach((v) => collect(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collect(v, out));
}

function originalCandidates(url: string): string[] {
  const u = new URL(url);
  const m = u.pathname.match(/^\/storage\/(\d+)\/conversions\/(.+)\.(\w+)$/);
  if (!m) return [];
  let base = decodeURIComponent(m[2]!);
  while (CONV_SUFFIX.test(base)) base = base.replace(CONV_SUFFIX, "");
  return ["jpg", "jpeg", "png", "webp", "JPG", "PNG"].map((ext) => `${ORIGIN}/storage/${m[1]}/${encodeURIComponent(base).replace(/%2F/g, "/")}.${ext}`);
}

async function get(url: string): Promise<{ status: number; type: string; buf: Buffer | null }> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok) return { status: res.status, type, buf: null };
      // The site answers missing files with an HTML 404 page sometimes served as 200.
      if (type.includes("text/html")) return { status: 404, type, buf: null };
      return { status: res.status, type, buf: Buffer.from(await res.arrayBuffer()) };
    } catch {
      await sleep(800 * (i + 1));
    }
  }
  return { status: -1, type: "", buf: null };
}

async function main() {
  // robots.txt disallows /storage/ for generic bots. This is a content migration for the site owner:
  // run only once Doyuyo!/PardoFood has approved it.
  if (!process.argv.includes("--client-approved")) {
    console.error("Media download needs the site owner's approval. Re-run with --client-approved once it is given.");
    process.exit(2);
  }
  const urls = new Set<string>();
  for (const f of await readdir(JSON_DIR)) {
    if (!f.endsWith(".json") || f.startsWith("_") || f === "media.json" || f === "crawl-manifest.json") continue;
    collect(await readJson(join(JSON_DIR, f)), urls);
  }
  // Files that are linked but not parsed into JSON (PDFs, redirects to /files/...).
  const manifest = await readJson<{ finalUrl: string; contentType: string }[]>(join(JSON_DIR, "crawl-manifest.json"));
  manifest.filter((e) => !e.contentType.includes("text/html")).forEach((e) => collect(e.finalUrl, urls));
  // Every media URL on any crawled page (EN-only images, banners, partner logos...).
  for (const f of await readdir(RAW)) {
    if (f.endsWith(".html")) collect(await readFile(join(RAW, f), "utf8"), urls);
  }

  console.log(`media references: ${urls.size}`);
  const items: MediaItem[] = [];
  const limit = pLimit(4);
  let done = 0;
  await Promise.all(
    [...urls].sort().map((sourceUrl) =>
      limit(async () => {
        let chosen: { url: string; type: string; buf: Buffer } | null = null;
        let isOriginal = false;
        for (const cand of originalCandidates(sourceUrl)) {
          const r = await get(cand);
          if (r.buf && (!chosen || r.buf.length > chosen.buf.length)) {
            chosen = { url: cand, type: r.type, buf: r.buf };
            isOriginal = true;
          }
          await sleep(80);
        }
        let status = 200;
        if (!chosen) {
          const r = await get(sourceUrl);
          status = r.status;
          if (r.buf) chosen = { url: sourceUrl, type: r.type, buf: r.buf };
          isOriginal = !sourceUrl.includes("/conversions/");
        }
        const item: MediaItem = {
          sourceUrl,
          downloadedUrl: chosen?.url ?? null,
          localPath: null,
          isOriginal,
          bytes: chosen?.buf.length ?? 0,
          sha256: null,
          contentType: chosen?.type ?? "",
          width: null,
          height: null,
          status,
        };
        if (chosen) {
          const rel = decodeURIComponent(new URL(chosen.url).pathname).replace(/^\//, "");
          const abs = join(MEDIA, rel);
          await mkdir(dirname(abs), { recursive: true });
          const exists = await stat(abs).then(() => true, () => false);
          if (!exists) await writeFile(abs, chosen.buf);
          item.localPath = rel;
          item.sha256 = sha(chosen.buf);
          try {
            const d = imageSize(chosen.buf);
            item.width = d.width ?? null;
            item.height = d.height ?? null;
          } catch {}
        }
        items.push(item);
        process.stdout.write(`\r${++done}/${urls.size}   `);
        await sleep(100);
      }),
    ),
  );
  console.log();
  items.sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl));
  await writeJson(join(JSON_DIR, "media.json"), items);
  const ok = items.filter((i) => i.localPath);
  console.log({
    total: items.length,
    saved: ok.length,
    originals: ok.filter((i) => i.isOriginal).length,
    failed: items.filter((i) => !i.localPath).map((i) => `${i.status} ${i.sourceUrl}`),
    uniqueFiles: new Set(ok.map((i) => i.sha256)).size,
    mb: +(new Set(ok.map((i) => i.localPath)).size && ok.reduce((s, i) => s + i.bytes, 0) / 1e6).toFixed(1),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
