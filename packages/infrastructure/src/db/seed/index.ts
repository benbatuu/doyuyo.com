/**
 * Seed the database from the Phase 0 export (tools/legacy-import/output/json).
 * Idempotent: truncates content tables, then rebuilds everything.
 * Rules: text is copied verbatim; every legacy media URL and internal link is rewritten
 * to the new site; every legacy page URL gets a one-hop 301 to its new path.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { slugify, localePath, SECTION_SEGMENT, type Locale } from "@doyuyo/i18n";
import { createDb } from "../client.ts";
import * as s from "../schema/index.ts";
import { buildMatcher } from "./allergen-matching.ts";
import { seoRenameMedia } from "./seo-media.ts";
import type { LAllergens, LBranch, LCategory, LLegacyUrl, LMedia, LNode, LPage, LProduct, LSite } from "./legacy-types.ts";

const ROOT = join(import.meta.dirname, "../../../../..");
const JSON_DIR = join(ROOT, "tools/legacy-import/output/json");
const load = <T>(f: string): T => JSON.parse(readFileSync(join(JSON_DIR, f), "utf8")) as T;
const LOCALES = ["tr", "en"] as const satisfies readonly Locale[];
const MEDIA_PREFIX = "/media/legacy/";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Seed check failed: ${msg}`);
}
const legacyPath = (u: string) => {
  const url = new URL(u);
  return decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
};

/** Static page key -> slug per locale (null = no page in that language). */
type PageEntity = "home" | "page" | "menu" | "branches";
const PAGE_SLUGS: Record<string, { type: PageEntity; tr: string | null; en: string | null }> = {
  home: { type: "home", tr: "", en: "" },
  about: { type: "page", tr: "hakkimizda", en: "about-us" },
  flavors: { type: "page", tr: "lezzetlerimiz", en: "flavors" },
  ingredients: { type: "page", tr: "malzemelerimiz", en: "ingredients" },
  investor: { type: "page", tr: SECTION_SEGMENT.investor.tr, en: SECTION_SEGMENT.investor.en },
  careers: { type: "page", tr: "kariyer", en: "careers" },
  contact: { type: "page", tr: "iletisim", en: "contact" },
  menu: { type: "menu", tr: SECTION_SEGMENT.menu.tr, en: SECTION_SEGMENT.menu.en },
  branches: { type: "branches", tr: SECTION_SEGMENT.branches.tr, en: SECTION_SEGMENT.branches.en },
  "crispy-chicken": { type: "page", tr: "citir-tavuk", en: null },
  "fried-chicken": { type: "page", tr: "kizarmis-tavuk", en: "fried-chicken" },
  allergens: { type: "page", tr: "alerjen-ve-besin-degerleri", en: "allergens-and-nutrition" },
  "legal-privacy": { type: "page", tr: `${SECTION_SEGMENT.legal.tr}/gizlilik-sozlesmesi`, en: `${SECTION_SEGMENT.legal.en}/non-disclosure-agreement` },
  "legal-kvkk": {
    type: "page",
    tr: `${SECTION_SEGMENT.legal.tr}/kisisel-verilerin-korunmasi`,
    en: `${SECTION_SEGMENT.legal.en}/personal-data-protection`,
  },
};
/** Page titles that exist on the old site as link text but not as a page of their own. */
const EXTRA_PAGE_TITLES: Record<string, Record<"tr" | "en", string>> = {
  allergens: { tr: "Alerjen ve Besin Değerleri", en: "Allergens and Nutritional Values" },
};

/** The old EN pages often carried the Turkish title/description. Same text as TR = not translated = leave empty (a real one is generated). */
const untranslated = (loc: Locale, own: string | undefined, tr: string | undefined) => (loc !== "tr" && own && own === tr ? "" : (own ?? ""));

const branchSlug = (name: string) => slugify(name.replace(/^Doyuyo!?\s*/i, ""));
const COUNTRY_KEY: Record<string, string> = { turkiye: "turkiye", "dol-alamarat-alaarby-almthd": "uae" };

async function main() {
  const target = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(target) && process.env.SEED_CONFIRM !== "yes") {
    throw new Error("Seed TRUNCATES content tables. DATABASE_URL is not local: set SEED_CONFIRM=yes to continue.");
  }
  const db = createDb();
  const categories = load<LCategory[]>("categories.json");
  let products = load<LProduct[]>("products.json");
  const branches = load<LBranch[]>("branches.json");
  const pages = load<LPage[]>("pages.json");
  const media = load<LMedia[]>("media.json");
  const site = load<Record<"tr" | "en", LSite>>("site.json");
  const allergens = load<LAllergens>("allergens.json");
  const legacyUrls = load<LLegacyUrl[]>("legacy-urls.json");

  // Expected counts from the Phase 0 report.
  assert(categories.length === 9, `9 categories, got ${categories.length}`);
  assert(products.length === 48, `48 products, got ${products.length}`);
  assert(branches.length === 93, `93 branches, got ${branches.length}`);
  assert(pages.length === 13, `13 pages, got ${pages.length}`);

  // The old site listed the same item twice under different categories (e.g. SPICY WINGS 6'LI in Acısever and in Spicy Wings),
  // which makes duplicate pages. Merge them: one product, listed in both categories; the old URLs redirect to it.
  const norm = (x?: string) => (x ?? "").toLocaleLowerCase("tr").replace(/[^a-z0-9çğıöşü]+/g, " ").trim();
  const signature = (p: LProduct) => `${norm(p.translations.tr?.name)}|${norm(p.translations.tr?.shortDescription)}`;
  const seenProducts = new Map<string, LProduct>();
  const aliasOf = new Map<string, string>();
  for (const p of products) {
    const primary = seenProducts.get(signature(p));
    if (!primary) {
      seenProducts.set(signature(p), p);
      continue;
    }
    aliasOf.set(p.id, primary.id);
    for (const c of p.categoryIds) if (!primary.categoryIds.includes(c)) primary.categoryIds.push(c);
    for (const loc of LOCALES) {
      const from = p.translations[loc];
      const to = primary.translations[loc];
      if (!from) continue;
      if (!to) primary.translations[loc] = from;
      else to.aliasUrls.push(from.url, ...from.aliasUrls);
    }
  }
  products = products.filter((p) => !aliasOf.has(p.id));
  for (const c of categories) c.productIds = [...new Set(c.productIds.map((id) => aliasOf.get(id) ?? id))];

  await db.execute(sql`TRUNCATE media, media_translations, routes, redirects, pages, page_translations, categories, category_translations,
    products, product_translations, product_categories, cities, city_translations, branches, branch_translations, settings RESTART IDENTITY CASCADE`);

  // ---------------- media
  const mediaIdByUrl = new Map<string, number>();
  const mediaPathByUrl = new Map<string, string>();
  const byPath = new Map<string, LMedia[]>();
  for (const m of media) if (m.localPath) byPath.set(m.localPath, [...(byPath.get(m.localPath) ?? []), m]);
  for (const [localPath, items] of byPath) {
    const first = items[0]!;
    const path = MEDIA_PREFIX + localPath.split("/").map(encodeURIComponent).join("/");
    const [row] = await db
      .insert(s.media)
      .values({ path, mime: first.contentType.split(";")[0] ?? "", width: first.width, height: first.height, bytes: first.bytes, sha256: first.sha256, legacyUrl: first.sourceUrl })
      .returning({ id: s.media.id });
    for (const it of items) {
      for (const key of [it.sourceUrl, it.sourceUrl.split("?")[0]!]) {
        mediaIdByUrl.set(key, row!.id);
        mediaPathByUrl.set(key, path);
      }
    }
  }
  const mediaId = (u: string | null | undefined) => (u ? (mediaIdByUrl.get(u) ?? mediaIdByUrl.get(u.split("?")[0]!) ?? null) : null);

  // ---------------- new paths (computed first, so content links can be rewritten)
  const newPath = new Map<string, string>(); // legacy path -> new path
  const routes: { locale: Locale; path: string; entityType: string; entityId: number }[] = [];
  const addLegacy = (legacyUrl: string | undefined, to: string) => {
    if (!legacyUrl) return;
    const from = legacyPath(legacyUrl);
    if (!newPath.has(from)) newPath.set(from, to);
  };

  // pages
  const pageRows = new Map<string, number>();
  for (const key of Object.keys(PAGE_SLUGS)) {
    const lp = pages.find((p) => p.id === key);
    const [row] = await db.insert(s.pages).values({ key, template: PAGE_SLUGS[key]!.type === "page" ? (key === "allergens" ? "allergens" : "static") : PAGE_SLUGS[key]!.type, bannerId: mediaId(lp?.translations.tr?.banner.image) }).returning({ id: s.pages.id });
    pageRows.set(key, row!.id);
    for (const loc of LOCALES) {
      const slug = PAGE_SLUGS[key]![loc];
      if (slug === null) continue;
      const t = lp?.translations[loc];
      if (lp && (!t || t.status !== 200)) continue;
      const path = localePath(loc, slug);
      routes.push({ locale: loc, path, entityType: PAGE_SLUGS[key]!.type, entityId: row!.id });
      addLegacy(t?.url, path);
    }
  }

  // categories
  const catIdByKey = new Map<string, number>();
  const catSlug = new Map<string, Record<string, string>>();
  for (const c of categories) {
    const [row] = await db.insert(s.categories).values({ key: c.id, sort: c.order, imageId: mediaId(c.image), bannerId: mediaId(c.banner) }).returning({ id: s.categories.id });
    catIdByKey.set(c.id, row!.id);
    const slugs: Record<string, string> = {};
    for (const loc of LOCALES) {
      const t = c.translations[loc];
      if (!t) continue;
      slugs[loc] = slugify(t.name);
      const path = localePath(loc, SECTION_SEGMENT.menu[loc], slugs[loc]!);
      routes.push({ locale: loc, path, entityType: "category", entityId: row!.id });
      addLegacy(t.url, path);
    }
    catSlug.set(c.id, slugs);
  }

  // products
  const prodIdByKey = new Map<string, number>();
  const seenProductPaths = new Set<string>();
  const matchAllergens = buildMatcher(allergens);
  for (const p of products) {
    const tr = p.translations.tr!;
    const [row] = await db
      .insert(s.products)
      .values({ key: p.id, imageId: mediaId(p.image), cardImageId: mediaId(p.cardImage), allergenInfo: matchAllergens(tr.name, tr.shortDescription) })
      .returning({ id: s.products.id });
    prodIdByKey.set(p.id, row!.id);
    const primary = p.categoryIds[0]!;
    for (const loc of LOCALES) {
      const t = p.translations[loc];
      if (!t) continue;
      const path = localePath(loc, SECTION_SEGMENT.menu[loc], catSlug.get(primary)![loc]!, slugify(t.name));
      assert(!seenProductPaths.has(path), `duplicate product path ${path}`);
      seenProductPaths.add(path);
      routes.push({ locale: loc, path, entityType: "product", entityId: row!.id });
      addLegacy(t.url, path);
      t.aliasUrls.forEach((a) => addLegacy(a, path));
    }
  }

  // cities + branches
  const cityIdByKey = new Map<string, number>();
  const citySlug = new Map<string, Record<string, string>>();
  for (const b of branches) {
    const c = b.city!;
    if (cityIdByKey.has(c.slug)) continue;
    const [row] = await db.insert(s.cities).values({ key: c.slug, country: COUNTRY_KEY[b.country.slug] ?? b.country.slug }).returning({ id: s.cities.id });
    cityIdByKey.set(c.slug, row!.id);
    const slugs: Record<string, string> = {};
    for (const loc of LOCALES) {
      const name = c.name[loc] ?? c.name.tr!;
      slugs[loc] = slugify(name);
      await db.insert(s.cityTranslations).values({ cityId: row!.id, locale: loc, name, slug: slugs[loc]! });
      // A city page exists in a language only if at least one of its branches does.
      const hasBranch = branches.some((x) => x.city?.slug === c.slug && x.translations[loc]);
      if (hasBranch) routes.push({ locale: loc, path: localePath(loc, SECTION_SEGMENT.branches[loc], slugs[loc]!), entityType: "city", entityId: row!.id });
    }
    citySlug.set(c.slug, slugs);
  }
  const branchIdByKey = new Map<string, number>();
  const seenBranchPaths = new Set<string>();
  for (const b of branches) {
    const [row] = await db
      .insert(s.branches)
      .values({
        key: b.id,
        cityId: cityIdByKey.get(b.city!.slug)!,
        district: b.district?.name.tr ?? null,
        lat: b.geo?.lat ?? null,
        lng: b.geo?.lng ?? null,
        geoPrecise: b.geo?.source === "place",
        mapsUrl: b.mapsUrl,
        imageId: mediaId(b.cardImage),
      })
      .returning({ id: s.branches.id });
    branchIdByKey.set(b.id, row!.id);
    for (const loc of LOCALES) {
      const t = b.translations[loc];
      if (!t) continue;
      const path = localePath(loc, SECTION_SEGMENT.branches[loc], citySlug.get(b.city!.slug)![loc]!, branchSlug(t.name));
      assert(!seenBranchPaths.has(path), `duplicate branch path ${path}`);
      seenBranchPaths.add(path);
      routes.push({ locale: loc, path, entityType: "branch", entityId: row!.id });
      addLegacy(t.url, path);
      t.aliasUrls.forEach((a) => addLegacy(a, path));
    }
  }

  // Legacy listing URLs (/subelerimiz/turkiye/{city}/..., /en/branches/turkiye/{city}/...) -> city or branch index.
  const cityByLegacySlug = (slug: string) => (cityIdByKey.has(slug) ? slug : null);
  for (const { url, finalUrl } of legacyUrls) {
    const p = legacyPath(url);
    if (newPath.has(p)) continue;
    const segs = p.split("/").filter(Boolean);
    const en = segs[0] === "en";
    const loc: Locale = en ? "en" : "tr";
    const rest = en ? segs.slice(1) : segs[0] === "tr" ? segs.slice(1) : segs;
    if (rest[0] === "subelerimiz" || rest[0] === "branches") {
      const country = rest[1];
      let city = rest[2] ? cityByLegacySlug(rest[2]) : null;
      if (country === "istanbul-avrupa-yakasi" || country === "istanbul-anadolu-yakasi") city = "istanbul";
      if (country === "dol-alamarat-alaarby-almthd") city = "dubai";
      const cityPath = city ? localePath(loc, SECTION_SEGMENT.branches[loc], citySlug.get(city)![loc]!) : null;
      // City pages exist only where the city has a branch in that language; else fall back to the branch index.
      const to = cityPath && routes.some((r) => r.path === cityPath) ? cityPath : localePath(loc, SECTION_SEGMENT.branches[loc]);
      newPath.set(p, to);
    } else if (finalUrl !== url && newPath.has(legacyPath(finalUrl))) {
      newPath.set(p, newPath.get(legacyPath(finalUrl))!);
    }
  }
  // Known one-offs from the Phase 0 report.
  const route = (key: string, loc: Locale) => routes.find((r) => r.entityType !== "category" && r.entityId === pageRows.get(key) && r.locale === loc && ["page", "home", "menu", "branches"].includes(r.entityType))!.path;
  newPath.set("/tr/yasal-metin/kisisel-verilerin-korunmasi-ve-islenmesi-politikasi", route("legal-kvkk", "tr"));
  newPath.set("/tr/yasal-metin/gizlilik-sozlesmesi", route("legal-privacy", "tr"));
  newPath.set("/alerjenler-ve-besin-degerleri", route("allergens", "tr"));
  newPath.set("/en/alerjenler-ve-besin-degerleri", route("allergens", "en"));
  newPath.set("/en/citir-tavuk", route("crispy-chicken", "tr"));
  newPath.set("/citir-tavuk", route("crispy-chicken", "tr"));
  newPath.set("/kizarmis-tavuk", route("fried-chicken", "tr"));
  newPath.set("/en/menus", route("menu", "en"));
  newPath.set("/tr", route("home", "tr"));
  // EN product page not linked from any category (report §7): same product as TR "spicy-wings-9-lu".
  newPath.set("/en/menu/spicy-wings-9", routes.find((r) => r.entityType === "product" && r.entityId === prodIdByKey.get("spicy-wings-9-lu") && r.locale === "en")!.path);

  // Every legacy HTML page must land somewhere.
  const unmapped = legacyUrls.filter((u) => u.type === "text/html" && !newPath.has(legacyPath(u.url))).map((u) => u.url);
  assert(unmapped.length === 0, `legacy URLs without a new path:\n${unmapped.join("\n")}`);

  // ---------------- link + media rewriting for content
  const rewriteUrl = (u: string): string => {
    if (!u) return u;
    const m = mediaPathByUrl.get(u) ?? mediaPathByUrl.get(u.split("?")[0]!);
    if (m) return m;
    try {
      const url = new URL(u, "https://doyuyo.com");
      if (/(^|\.)doyuyo\.com$/.test(url.hostname)) {
        const p = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
        if (p === "/") return "/tr";
        return newPath.get(p) ?? mediaPathByUrl.get(`https://doyuyo.com${url.pathname}`) ?? p;
      }
    } catch {}
    return u;
  };
  const rewriteHtml = (html: string) => html.replace(/href="([^"]+)"/g, (_, h: string) => `href="${rewriteUrl(h.replace(/&amp;/g, "&"))}"`);
  // Alt text: keep a real description; replace empty / file-name / "slider" alts with the nearest heading.
  const BAD_ALT = /^(|slider|doyuyo|image|img|banner|logo|[0-9a-f]{32}\.(png|jpe?g|webp|gif)|.+\.(png|jpe?g|webp|gif|svg))$/i;
  // Group logos on the About page all carried the alt "PardoFood": name each brand.
  const brandAlt = (src: string) => (/carmelo/i.test(src) ? "Carmelo Coffee" : /panartisan|pan-artisan/i.test(src) ? "Pan Artisan" : /doyuyo/i.test(src) ? "Doyuyo!" : /pardofood/i.test(src) ? "PardoFood" : undefined);
  const HERO_ALT: Record<Locale, string> = {
    tr: "Doyuyo! restoranında çıtır tavuk ve burger menüsü yiyen müşteri",
    en: "Customer enjoying a crispy chicken and burger tray at a Doyuyo! restaurant",
    ar: "",
  };
  const rewriteNodes = (nodes: LNode[], fallbackAlt = "", locale: Locale = "tr", forceAlt?: string | ((src: string) => string | undefined)): unknown[] => {
    let heading = "";
    return nodes.map((n) => {
      if (n.type === "heading") heading = String(n.text ?? "");
      switch (n.type) {
        case "image": {
          const given = String(n.alt ?? "").trim();
          const forced = typeof forceAlt === "function" ? forceAlt(String(n.src ?? "")) : forceAlt;
          const alt = forced ?? (BAD_ALT.test(given) ? heading || fallbackAlt : given);
          void locale;
          return { type: "image", mediaId: mediaId(n.src as string), src: rewriteUrl(n.src as string), alt };
        }
        case "paragraph":
          return { ...n, html: rewriteHtml(n.html as string) };
        case "list":
          return { ...n, items: (n.items as string[]).map(rewriteHtml) };
        case "button":
          return { ...n, href: rewriteUrl(n.href as string) };
        case "video":
          return { ...n, thumbnail: n.thumbnail ? rewriteUrl(n.thumbnail as string) : null };
        default:
          return n;
      }
    });
  };

  // ---------------- translations
  for (const key of Object.keys(PAGE_SLUGS)) {
    const lp = pages.find((p) => p.id === key);
    for (const loc of LOCALES) {
      if (!routes.some((r) => r.entityId === pageRows.get(key) && r.locale === loc && r.entityType === PAGE_SLUGS[key]!.type)) continue;
      const t = lp?.translations[loc];
      const h1 = t?.sections.flatMap((x) => x.nodes).find((n) => n.type === "heading" && n.level === 1)?.text as string | undefined;
      await db.insert(s.pageTranslations).values({
        pageId: pageRows.get(key)!,
        locale: loc,
        title: t?.banner.title || h1 || t?.meta.title || EXTRA_PAGE_TITLES[key]?.[loc] || key,
        sections: (t?.sections ?? []).map((sec) => ({
          key: sec.id,
          nodes: rewriteNodes(sec.nodes, t?.banner.title || h1 || key, loc, sec.id === "homepage-hero" ? HERO_ALT[loc] : sec.id === "about-pardo" ? brandAlt : undefined),
        })),
        seoTitle: untranslated(loc, t?.meta.title, lp?.translations.tr?.meta.title),
        seoDescription: untranslated(loc, t?.meta.description, lp?.translations.tr?.meta.description),
        sourceUrl: t?.url ?? null,
      });
    }
  }

  for (const c of categories) {
    for (const loc of LOCALES) {
      const t = c.translations[loc];
      if (!t) continue;
      await db.insert(s.categoryTranslations).values({
        categoryId: catIdByKey.get(c.id)!,
        locale: loc,
        name: t.name,
        slug: catSlug.get(c.id)![loc]!,
        description: t.description,
        seoTitle: untranslated(loc, t.meta.title, c.translations.tr?.meta.title),
        seoDescription: untranslated(loc, t.meta.description, c.translations.tr?.meta.description),
        sourceUrl: t.url,
      });
    }
  }

  for (const p of products) {
    for (const loc of LOCALES) {
      const t = p.translations[loc];
      if (!t) continue;
      await db.insert(s.productTranslations).values({
        productId: prodIdByKey.get(p.id)!,
        locale: loc,
        name: t.name,
        slug: slugify(t.name),
        shortDescription: t.shortDescription,
        description: t.description,
        content: rewriteNodes(t.content, t.name, loc),
        imageAlt: t.imageAlt,
        seoTitle: untranslated(loc, t.meta.title, p.translations.tr?.meta.title),
        seoDescription: untranslated(loc, t.meta.description, p.translations.tr?.meta.description),
        sourceUrl: t.url,
      });
    }
  }
  for (const c of categories) {
    for (const [i, pid] of c.productIds.entries()) {
      const p = products.find((x) => x.id === pid)!;
      await db.insert(s.productCategories).values({ productId: prodIdByKey.get(pid)!, categoryId: catIdByKey.get(c.id)!, sort: i, isPrimary: p.categoryIds[0] === c.id });
    }
  }

  for (const b of branches) {
    for (const loc of LOCALES) {
      const t = b.translations[loc];
      if (!t) continue;
      await db.insert(s.branchTranslations).values({
        branchId: branchIdByKey.get(b.id)!,
        locale: loc,
        name: t.name,
        slug: branchSlug(t.name),
        address: t.address,
        hours: t.hours,
        description: rewriteNodes(t.description, t.name, loc),
        seoTitle: untranslated(loc, t.meta.title, b.translations.tr?.meta.title),
        seoDescription: untranslated(loc, t.meta.description, b.translations.tr?.meta.description),
        sourceUrl: t.url,
      });
    }
  }

  // ---------------- routes + redirects
  await db.insert(s.routes).values(routes);
  const routePaths = new Set(routes.map((r) => r.path));
  const redirectRows = [...newPath.entries()]
    // "/" is the locale detector (next-intl), not a fixed redirect.
    .filter(([from, to]) => from !== "/" && from !== to && !routePaths.has(from))
    .map(([fromPath, toPath]) => ({ fromPath, toPath, status: 301, source: "legacy" }));
  for (let i = 0; i < redirectRows.length; i += 500) await db.insert(s.redirects).values(redirectRows.slice(i, i + 500));
  // Legacy files (PDFs) keep working too.
  for (const [url, path] of mediaPathByUrl) {
    const from = legacyPath(url);
    if (from.startsWith("/files/") || from.endsWith(".pdf")) {
      await db.insert(s.redirects).values({ fromPath: from, toPath: decodeURIComponent(path), status: 301, source: "legacy" }).onConflictDoNothing();
    }
  }

  // ---------------- settings
  const contact = pages.find((p) => p.id === "contact")!;
  for (const loc of LOCALES) {
    const st = site[loc];
    const buttons = contact.translations[loc]!.sections.flatMap((x) => x.nodes).filter((n) => n.type === "button") as unknown as { text: string; href: string }[];
    const phone = buttons.find((b) => b.href.startsWith("tel:"));
    const office = buttons.find((b) => /maps|goo\.gl/.test(b.href));
    const legalHrefs = new Set([route("legal-kvkk", loc), route("legal-privacy", loc)]);
    const nav = (links: { text: string; href: string }[]) => links.map((l) => ({ label: l.text, href: rewriteUrl(l.href) }));
    const footer = nav(st.footerNav);
    await db.insert(s.settings).values({
      key: "site",
      locale: loc,
      value: {
        logoMediaId: mediaId(st.logo),
        // Header/footer pardo.svg was referenced with a relative URL and is not in the export; use the PardoFood logo from the About page.
        partnerLogoMediaId: mediaId("https://doyuyo.com/storage/186/PardoFood-Logo.webp"),
        headerNav: nav(st.headerNav),
        footerNav: footer.filter((l) => !legalHrefs.has(l.href)),
        legalNav: footer.filter((l) => legalHrefs.has(l.href)),
        social: st.social.map((href) => ({ network: new URL(href).hostname.replace(/^www\./, "").split(".")[0]!, href })),
        phone: phone ? { label: phone.text, href: phone.href } : null,
        headOffice: office ? { address: office.text, mapsUrl: office.href } : null,
        orderPlatforms: {
          title: st.orderPlatforms?.title ?? "",
          text: st.orderPlatforms?.text ?? "",
          items: (st.orderPlatforms?.items ?? []).map((i) => ({ name: i.name, href: i.href, logoMediaId: mediaId(i.logo) })),
        },
        cookie: { text: st.cookieText, button: st.cookieButton },
        copyright: st.copyright,
      },
    });
  }
  await db.insert(s.settings).values({
    key: "allergens",
    locale: "*",
    value: {
      columns: allergens.allergenColumns,
      rows: allergens.allergens,
      nutrition: allergens.nutrition,
      notes: allergens.notes,
      pdfMediaId: mediaId("https://doyuyo.com/files/Alerjenler-ve-Besin-Icerikleri-Tablosu.pdf"),
      source: allergens.source,
    },
  });

  // ---------------- checks
  const count = async (t: string) => Number(((await db.execute(sql.raw(`select count(*)::int as n from ${t}`))) as unknown as { n: number }[])[0]!.n);
  const enBranches = await db.execute(sql`select count(*)::int as n from branch_translations where locale = 'en'`);
  const stats = {
    media: await count("media"),
    routes: await count("routes"),
    redirects: await count("redirects"),
    pages: await count("pages"),
    categories: await count("categories"),
    products: await count("products"),
    branches: await count("branches"),
    enBranches: (enBranches as unknown as { n: number }[])[0]!.n,
    cities: await count("cities"),
  };
  assert(stats.enBranches === 92, `92 EN branches, got ${stats.enBranches}`);
  // Every product listed in a category has an EN translation (EN pairing is by image file name, see legacy-import).
  for (const c of categories) {
    const enNames = c.productIds.map((id) => products.find((p) => p.id === id)!.translations.en?.name);
    assert(enNames.every(Boolean), `EN names for all products in ${c.id}`);
  }
  // No content may still point at the old site's storage.
  const leftovers = await db.execute(sql`
    select 'page' as t, page_id::text as id from page_translations where sections::text like '%doyuyo.com/storage%' or sections::text like '%doyuyo.com/files%'
    union all select 'product', product_id::text from product_translations where content::text like '%doyuyo.com/storage%'
    union all select 'branch', branch_id::text from branch_translations where description::text like '%doyuyo.com/storage%'
    union all select 'settings', key from settings where value::text like '%doyuyo.com/storage%'`);
  assert((leftovers as unknown as unknown[]).length === 0, `content still links legacy storage: ${JSON.stringify(leftovers)}`);

  await seoRenameMedia(db, join(ROOT, "tools/legacy-import/output/seo-media-map.json"));
  console.log("seed ok", stats);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
