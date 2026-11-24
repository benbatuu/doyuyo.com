// SEO / GEO audit over every URL in the sitemap. Usage: BASE=http://localhost:3100 node scripts/seo-audit.mjs
// Checks title, description, canonical, hreflang (reciprocal), Open Graph, one H1, image alts, JSON-LD validity,
// duplicate titles/descriptions, legacy media links, robots.txt / sitemap / llms.txt.
const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/$/, "");
const get = async (p, opts) => fetch(p.startsWith("http") ? p : BASE + p, { redirect: "manual", ...opts });
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const attr = (tag, name) => tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1];
const dec = (s = "") => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const index = await (await get("/sitemap.xml")).text();
const children = locs(index);
const urls = [...new Set((await Promise.all(children.filter((c) => !c.endsWith("images.xml")).map(async (c) => locs(await (await get(new URL(c).pathname)).text())))).flat())];
const imageXml = await (await get("/sitemaps/images.xml")).text();

const pages = new Map();
const issues = [];
const add = (level, url, msg) => issues.push({ level, url, msg });

async function auditOne(u) {
  const path = new URL(u).pathname;
  const res = await get(path);
  if (res.status !== 200) return add("error", path, `HTTP ${res.status}`);
  const html = await res.text();
  const title = dec(html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] ?? "").trim();
  const metas = [...html.matchAll(/<meta\s[^>]*>/g)].map((m) => m[0]);
  const meta = (key, by = "name") => dec(attr(metas.find((m) => attr(m, by) === key) ?? "", "content") ?? "");
  const description = meta("description");
  const canonical = attr([...html.matchAll(/<link\s[^>]*>/g)].map((m) => m[0]).find((l) => attr(l, "rel") === "canonical") ?? "", "href");
  const links = [...html.matchAll(/<link\s[^>]*>/g)].map((m) => m[0]);
  const hreflang = Object.fromEntries(links.filter((l) => attr(l, "rel") === "alternate" && attr(l, "hreflang")).map((l) => [attr(l, "hreflang"), attr(l, "href")]));
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  const lang = html.match(/<html[^>]*\slang="([^"]+)"/)?.[1];
  const imgs = [...html.matchAll(/<img\s[^>]*>/g)].map((m) => m[0]);
  const noAlt = imgs.filter((i) => !/\salt=/.test(i) && !/aria-hidden/.test(i));
  const fileAlt = imgs.filter((i) => /\salt="[^"]*\.(png|jpe?g|webp|svg)"/i.test(i) || /\salt="[0-9a-f]{20,}"/i.test(i));
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const types = [];
  let ldBad = 0;
  for (const j of ld) {
    try {
      const o = JSON.parse(j);
      for (const n of o["@graph"] ?? [o]) types.push(n["@type"]);
    } catch {
      ldBad++;
    }
  }
  const legacy = (html.match(/doyuyo\.com\/(storage|files)\//g) ?? []).length + (html.match(/\/media\/legacy\/storage/g) ?? []).length;
  pages.set(path, { title, description, canonical, hreflang, types });

  if (!title) add("error", path, "no <title>");
  else if (title.length < 10 || title.length > 70) add("warn", path, `title length ${title.length}: "${title}"`);
  if (!description) add("error", path, "no meta description");
  else if (description.length < 50 || description.length > 175) add("warn", path, `description length ${description.length}`);
  if (!canonical) add("error", path, "no canonical");
  else if (new URL(canonical).pathname !== path) add("error", path, `canonical points to ${canonical}`);
  if (h1 !== 1) add("error", path, `${h1} <h1> elements`);
  if (!lang) add("error", path, "no <html lang>");
  if (!meta("og:title", "property") || !meta("og:image", "property")) add("error", path, "missing og:title / og:image");
  if (!meta("twitter:card")) add("warn", path, "missing twitter:card");
  if (noAlt.length) add("error", path, `${noAlt.length} <img> without alt attribute`);
  if (fileAlt.length) add("warn", path, `${fileAlt.length} <img> with file-name alt`);
  if (ldBad) add("error", path, `${ldBad} invalid JSON-LD block(s)`);
  if (!types.includes("BreadcrumbList") && path.split("/").length > 2) add("warn", path, "no BreadcrumbList JSON-LD");
  if (legacy) add("error", path, `${legacy} link(s) to legacy media`);
  if (!hreflang["x-default"] && Object.keys(hreflang).length) add("warn", path, "hreflang without x-default");
}

const queue = [...urls];
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await auditOne(queue.shift()); }));

// Cross-page checks
const dup = (key, label) => {
  const m = new Map();
  for (const [p, v] of pages) if (v[key]) m.set(v[key], [...(m.get(v[key]) ?? []), p]);
  for (const [val, ps] of m) {
    // Language versions of the same page (linked by hreflang) may legitimately share a brand/place name.
    const distinct = ps.filter((p) => !Object.values(pages.get(ps[0]).hreflang).some((h) => new URL(h).pathname === p));
    if (distinct.length > 1 || (ps.length > 1 && distinct.length === 1 && ps[0] !== distinct[0])) add("warn", ps[0], `${label} shared by ${ps.length} different pages: "${val.slice(0, 70)}"`);
  }
};
dup("title", "title");
dup("description", "description");
for (const [p, v] of pages) {
  for (const [hl, href] of Object.entries(v.hreflang)) {
    if (hl === "x-default" || !href) continue;
    const other = pages.get(new URL(href).pathname);
    if (!other) continue;
    const back = Object.values(other.hreflang).map((h) => new URL(h).pathname);
    if (!back.includes(p)) add("error", p, `hreflang ${hl} -> ${new URL(href).pathname} does not link back`);
  }
}

// Site files
const robots = await (await get("/robots.txt")).text();
if (!/Sitemap:/i.test(robots)) add("warn", "/robots.txt", "no Sitemap line (expected on the live domain; localhost is noindex)");
for (const f of ["/llms.txt", "/llms-full.txt", "/manifest.webmanifest", "/icons/favicon-32x32.png"]) if ((await get(f)).status !== 200) add("error", f, "not found");
const imgCount = (imageXml.match(/<image:image>/g) ?? []).length;
if (!imgCount) add("error", "/sitemaps/images.xml", "no images");
const badNames = [...imageXml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((m) => m[1]).filter((u) => /filigran|Web_\d+x\d+|\(\d+\)|[A-Z]/.test(new URL(u).pathname.split("/").pop()));
if (badNames.length) add("warn", "/sitemaps/images.xml", `${badNames.length} image names still old-style, e.g. ${badNames[0]}`);

const by = (l) => issues.filter((i) => i.level === l);
const group = (arr) => {
  const m = new Map();
  for (const i of arr) m.set(i.msg.replace(/\d+/g, "N").replace(/"[^"]*"/g, '"…"'), [...(m.get(i.msg.replace(/\d+/g, "N").replace(/"[^"]*"/g, '"…"')) ?? []), i]);
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
};
console.log(`pages audited: ${pages.size}/${urls.length} · sitemap images: ${imgCount} · JSON-LD types: ${[...new Set([...pages.values()].flatMap((p) => p.types))].join(", ")}`);
for (const lvl of ["error", "warn"]) {
  console.log(`\n${lvl.toUpperCase()}: ${by(lvl).length}`);
  for (const [msg, list] of group(by(lvl)).slice(0, 14)) console.log(`  ${String(list.length).padStart(4)} × ${msg}  (e.g. ${list[0].url})`);
}
process.exit(by("error").length ? 1 : 0);
