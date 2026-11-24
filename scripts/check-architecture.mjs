// Clean-architecture guard: the domain/application core must not import frameworks or storage.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const rules = [
  { dir: "packages/core/src", forbidden: [/from ["'](next|react|drizzle-orm|postgres|@doyuyo\/infrastructure|@doyuyo\/ui)/] },
  { dir: "apps/web/src", forbidden: [/from ["'](drizzle-orm|postgres)/, /@doyuyo\/infrastructure\/src\/db/] },
];
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
let bad = 0;
for (const { dir, forbidden } of rules) {
  for (const file of walk(join(root, dir)).filter((f) => /\.(ts|tsx)$/.test(f))) {
    const src = readFileSync(file, "utf8");
    for (const re of forbidden) if (re.test(src)) (bad++, console.error(`✗ ${file.replace(root, "")} matches ${re}`));
  }
}
if (bad) process.exit(1);
console.log("architecture ok");
