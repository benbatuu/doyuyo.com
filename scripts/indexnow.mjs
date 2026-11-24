// Tell Bing, Yandex and other IndexNow engines about every URL in the sitemap.
// Usage (after deploy): NEXT_PUBLIC_SITE_URL=https://doyuyo.com INDEXNOW_KEY=<key> node scripts/indexnow.mjs
// The key file must be public at <site>/<key>.txt (apps/web/public/<key>.txt).
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
const KEY = process.env.INDEXNOW_KEY;
if (!SITE || !KEY) (console.error("Set NEXT_PUBLIC_SITE_URL and INDEXNOW_KEY"), process.exit(1));
if (!/^https:\/\/(www\.)?doyuyo\.com$/.test(SITE)) (console.error(`Refusing to ping for ${SITE}: only the live domain.`), process.exit(1));

const text = async (u) => (await fetch(u)).text();
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const children = locs(await text(`${SITE}/sitemap.xml`)).filter((u) => !u.endsWith("images.xml"));
const urls = [...new Set((await Promise.all(children.map(async (c) => locs(await text(c))))).flat())];
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${urls.length} URLs -> HTTP ${res.status}`);
process.exit(res.ok ? 0 : 1);
