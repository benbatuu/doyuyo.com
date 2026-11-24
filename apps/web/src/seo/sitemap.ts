import "server-only";
import { app } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";
import { DEFAULT_LOCALE, HREFLANG, PUBLISHED_LOCALES, type Locale } from "@doyuyo/i18n";

export const SITEMAP_GROUPS = {
  "pages.xml": ["home", "page", "menu", "branches"],
  "menu.xml": ["category", "product"],
  "branches.xml": ["city", "branch"],
  "images.xml": [],
} as const;
export type SitemapName = keyof typeof SITEMAP_GROUPS;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (p: string) => (p.startsWith("http") ? p : `${SITE_URL}${p}`);
const iso = (d: Date) => d.toISOString();
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/image/1.1"';

interface Group {
  type: string;
  id: number;
  paths: Partial<Record<Locale, string>>;
  updatedAt: Date;
}

async function groups(types: readonly string[]) {
  const rows = (await app().routes.listCanonical()).filter((r) => types.includes(r.type) && PUBLISHED_LOCALES.includes(r.locale));
  const map = new Map<string, Group>();
  for (const r of rows) {
    const k = `${r.type}:${r.id}`;
    const g = map.get(k) ?? { type: r.type, id: r.id, paths: {}, updatedAt: r.updatedAt };
    g.paths[r.locale] = r.path;
    if (r.updatedAt > g.updatedAt) g.updatedAt = r.updatedAt;
    map.set(k, g);
  }
  return [...map.values()].sort((a, b) => (a.paths.tr ?? a.paths.en ?? "").localeCompare(b.paths.tr ?? b.paths.en ?? ""));
}

const alternateLinks = (g: Group) =>
  [
    ...PUBLISHED_LOCALES.filter((l) => g.paths[l]).map((l) => `<xhtml:link rel="alternate" hreflang="${HREFLANG[l]}" href="${esc(abs(g.paths[l]!))}"/>`),
    g.paths[DEFAULT_LOCALE] ? `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(abs(g.paths[DEFAULT_LOCALE]!))}"/>` : "",
  ].join("");

export async function sitemapIndex() {
  const names = Object.keys(SITEMAP_GROUPS) as SitemapName[];
  const now = iso(new Date());
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${names.map((n) => `<sitemap><loc>${SITE_URL}/sitemaps/${n}</loc><lastmod>${now}</lastmod></sitemap>`).join("")}</sitemapindex>\n`;
}

export async function sitemapFor(name: SitemapName) {
  if (name === "images.xml") return imageSitemap();
  const gs = await groups(SITEMAP_GROUPS[name]);
  const urls = gs.flatMap((g) =>
    PUBLISHED_LOCALES.filter((l) => g.paths[l]).map(
      (l) => `<url><loc>${esc(abs(g.paths[l]!))}</loc><lastmod>${iso(g.updatedAt)}</lastmod>${alternateLinks(g)}</url>`,
    ),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${NS}>${urls.join("")}</urlset>\n`;
}

async function imageSitemap() {
  const [images, all] = await Promise.all([app().routes.listImages(), groups(["product", "branch"])]);
  const byKey = new Map(all.map((g) => [`${g.type}:${g.id}`, g]));
  const urls: string[] = [];
  for (const img of images) {
    const g = byKey.get(`${img.type}:${img.id}`);
    if (!g) continue;
    for (const l of PUBLISHED_LOCALES) {
      if (!g.paths[l]) continue;
      urls.push(`<url><loc>${esc(abs(g.paths[l]!))}</loc><image:image><image:loc>${esc(abs(img.src))}</image:loc>${img.titles[l] ? `<image:title>${esc(img.titles[l]!)}</image:title>` : ""}</image:image></url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${NS}>${urls.join("")}</urlset>\n`;
}
