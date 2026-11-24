/**
 * Crawl doyuyo.com: start from sitemap.xml + home, follow same-site HTML links.
 * Saves raw HTML to output/raw/{key}.html and a manifest to output/json/crawl-manifest.json.
 * Polite: limited concurrency, delay between requests.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { JSON_DIR, ORIGIN, RAW, fetchWithRetry, normalizeUrl, pageKey, sleep, writeJson } from "./lib.ts";

const CONCURRENCY = 3;
const DELAY_MS = 250;
const MAX_PAGES = 1500;

// Paths that are files/assets, not pages.
const SKIP = /^\/(storage|assets|build|images|frontend|cdn-cgi|livewire)\//;
const FILE_EXT = /\.(pdf|jpe?g|png|webp|svg|gif|mp4|zip|css|js|ico|xml)$/i;

export interface CrawlEntry {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  key: string | null;
  source: "sitemap" | "link";
  foundOn?: string;
  lastmod?: string;
}

async function main() {
  await mkdir(RAW, { recursive: true });

  const sitemapXml = await (await fetchWithRetry(`${ORIGIN}/sitemap.xml`)).text();
  await writeFile(join(RAW, "_sitemap.xml"), sitemapXml);
  const $s = cheerio.load(sitemapXml, { xml: true });
  const lastmods = new Map<string, string>();
  const seeds: string[] = [];
  $s("url").each((_, el) => {
    const loc = normalizeUrl($s(el).find("loc").text());
    if (!loc) return;
    seeds.push(loc);
    lastmods.set(loc, $s(el).find("lastmod").text());
  });
  console.log(`sitemap: ${seeds.length} URLs`);

  const seen = new Map<string, CrawlEntry>();
  const queue: { url: string; source: CrawlEntry["source"]; foundOn?: string }[] = [];
  const enqueue = (url: string, source: CrawlEntry["source"], foundOn?: string) => {
    if (seen.has(url) || queue.some((q) => q.url === url)) return;
    const path = new URL(url).pathname;
    if (SKIP.test(path) || FILE_EXT.test(path) || new URL(url).search) return;
    queue.push({ url, source, foundOn });
  };
  enqueue(ORIGIN, "sitemap");
  seeds.forEach((u) => enqueue(u, "sitemap"));

  const limit = pLimit(CONCURRENCY);
  while (queue.length && seen.size < MAX_PAGES) {
    const batch = queue.splice(0, CONCURRENCY * 4);
    await Promise.all(
      batch.map((item) =>
        limit(async () => {
          if (seen.has(item.url)) return;
          const entry: CrawlEntry = {
            url: item.url,
            finalUrl: item.url,
            status: 0,
            contentType: "",
            key: null,
            source: item.source,
            foundOn: item.foundOn,
            lastmod: lastmods.get(item.url),
          };
          seen.set(item.url, entry);
          try {
            const res = await fetchWithRetry(item.url);
            entry.status = res.status;
            entry.finalUrl = normalizeUrl(res.url) ?? res.url;
            entry.contentType = res.headers.get("content-type") ?? "";
            if (res.ok && entry.contentType.includes("text/html")) {
              const html = await res.text();
              entry.key = pageKey(item.url);
              await writeFile(join(RAW, `${entry.key}.html`), html);
              const $ = cheerio.load(html);
              $("a[href]").each((_, a) => {
                const n = normalizeUrl($(a).attr("href") ?? "", item.url);
                if (n) enqueue(n, "link", item.url);
              });
            } else {
              await res.arrayBuffer();
            }
          } catch (e) {
            entry.status = -1;
            console.error(`FAIL ${item.url}: ${(e as Error).message}`);
          }
          await sleep(DELAY_MS);
        }),
      ),
    );
    process.stdout.write(`\rcrawled ${seen.size}, queue ${queue.length}   `);
  }
  console.log();
  const entries = [...seen.values()].sort((a, b) => a.url.localeCompare(b.url));
  await writeJson(join(JSON_DIR, "crawl-manifest.json"), entries);
  const byStatus = entries.reduce<Record<string, number>>((m, e) => ((m[e.status] = (m[e.status] ?? 0) + 1), m), {});
  console.log("done", entries.length, byStatus);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
