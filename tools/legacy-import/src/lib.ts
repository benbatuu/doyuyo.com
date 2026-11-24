import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ORIGIN = "https://doyuyo.com";
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const OUT = join(ROOT, "output");
export const RAW = join(OUT, "raw");
export const JSON_DIR = join(OUT, "json");
export const MEDIA = join(OUT, "media");

export const USER_AGENT = "DoyuyoRedesignImporter/1.0 (+content migration)";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const sha = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");

/** Normalize a doyuyo.com URL: absolute, no hash, no trailing slash (except root). */
export function normalizeUrl(href: string, base = ORIGIN): string | null {
  try {
    const u = new URL(href.trim(), base);
    if (u.hostname !== "doyuyo.com" && u.hostname !== "www.doyuyo.com") return null;
    u.hostname = "doyuyo.com";
    u.protocol = "https:";
    u.hash = "";
    let p = u.pathname.replace(/\/+$/, "");
    if (p === "") p = "";
    return `${ORIGIN}${p}${u.search}`;
  } catch {
    return null;
  }
}

/** File-safe key for a page URL. */
export function pageKey(url: string): string {
  const p = url.replace(ORIGIN, "") || "/";
  return p === "/" ? "_home" : p.replace(/^\//, "").replace(/[^a-zA-Z0-9._-]+/g, "__");
}

export async function fetchWithRetry(url: string, tries = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": USER_AGENT }, redirect: "follow" });
      if (res.status >= 500 || res.status === 429) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      lastErr = e;
      await sleep(1000 * (i + 1) ** 2);
    }
  }
  throw lastErr;
}

export async function writeJson(path: string, data: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

/** Collapse whitespace and decode nbsp. */
export const clean = (s: string | undefined | null) =>
  (s ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
