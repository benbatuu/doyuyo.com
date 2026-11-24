// Smoke test against a running server: every route 200 without legacy media links,
// every legacy redirect lands on a 200 in exactly one hop.
// Usage: BASE=http://localhost:3100 node scripts/smoke-urls.mjs
import { execSync } from "node:child_process";

const BASE = process.env.BASE ?? "http://localhost:3000";
const q = (sql) =>
  execSync(`docker exec doyuyo-db psql -U doyuyo -At -F '\t' -c "${sql}"`, { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));

const routes = q("select path from routes order by path").map(([p]) => p);
const redirects = q("select from_path, to_path from redirects order by from_path");

const pool = async (items, n, fn) => {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
};

const bad = [];
await pool(routes, 6, async (path) => {
  const res = await fetch(BASE + encodeURI(path), { redirect: "manual" });
  const body = res.status === 200 ? await res.text() : "";
  if (res.status !== 200) bad.push(`route ${res.status} ${path}`);
  else if (/doyuyo\.com\/(storage|files)/.test(body)) bad.push(`route links legacy media ${path}`);
});
await pool(redirects, 6, async ([from, to]) => {
  const res = await fetch(BASE + encodeURI(from), { redirect: "manual" });
  const loc = res.headers.get("location");
  if (![301, 308].includes(res.status) || !loc) return bad.push(`redirect ${res.status} ${from}`);
  const target = new URL(loc, BASE);
  if (decodeURI(target.pathname) !== to) bad.push(`redirect ${from} -> ${decodeURI(target.pathname)} (expected ${to})`);
  const hop = await fetch(target, { redirect: "manual" });
  if (hop.status !== 200) bad.push(`redirect target ${hop.status} ${to}`);
});
for (const p of ["/ar", "/ar/menu", "/yok-boyle-sayfa", "/en/branches/diyarbakir/forum-diyarbakir-avm"]) {
  const res = await fetch(BASE + p, { redirect: "manual" });
  if (res.status !== 404) bad.push(`expected 404 for ${p}, got ${res.status}`);
}
console.log(`routes: ${routes.length}, redirects: ${redirects.length}, problems: ${bad.length}`);
bad.slice(0, 40).forEach((b) => console.log(" ✗", b));
process.exit(bad.length ? 1 : 0);
