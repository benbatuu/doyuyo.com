// Copy the Phase 0 media export into the web app's public folder (kept out of git).
// 1) everything under /media/legacy (old URLs keep working)
// 2) SEO-named copies under /img (paths the database points to, see seed/seo-media.ts)
// Copy instead of symlink: `next build` and most hosts do not follow symlinks in public/.
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const from = join(root, "tools/legacy-import/output/media");
const legacy = join(root, "apps/web/public/media/legacy");
const pub = join(root, "apps/web/public");
if (!existsSync(from)) {
  console.error(`No media export at ${from}. Run the legacy-import tool first.`);
  process.exit(1);
}
mkdirSync(legacy, { recursive: true });
const mapFile = join(root, "tools/legacy-import/output/seo-media-map.json");
// Files that got an SEO name are shipped under /img or /docs only (no duplicate copy).
const renamed = new Set(existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, "utf8")).map((m) => join(from, m.from)) : []);
cpSync(from, legacy, { recursive: true, force: true, filter: (src) => !renamed.has(src) });
console.log(`media copied -> ${legacy}`);

if (existsSync(mapFile)) {
  const map = JSON.parse(readFileSync(mapFile, "utf8"));
  let n = 0;
  for (const { from: f, to } of map) {
    const src = join(from, f);
    if (existsSync(src)) {
      mkdirSync(join(pub, to, ".."), { recursive: true });
      copyFileSync(src, join(pub, to));
      n++;
    } else console.warn(`missing source: ${f}`);
  }
  console.log(`${n} SEO-named files -> ${pub}/img and ${pub}/docs`);
} else console.warn("seo-media-map.json not found: run `pnpm db:seed` first");
