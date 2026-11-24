import type { Element } from "domhandler";
import { clean } from "../lib.ts";
import { type Locale, abs, contentNodes, imgSrc, loadRaw, meta, slugOf, imageKey, type ContentNode, type PageMeta } from "./common.ts";
import type { CrawlEntry } from "../crawl.ts";

export interface CategoryT {
  name: string;
  slug: string;
  url: string;
  description: string;
  meta: PageMeta;
}
export interface Category {
  id: string; // TR slug
  order: number;
  image: string | null; // card image from menu index
  banner: string | null;
  productIds: string[];
  translations: Partial<Record<Locale, CategoryT>>;
}
export interface ProductT {
  name: string;
  slug: string;
  url: string;
  aliasUrls: string[];
  shortDescription: string;
  description: string;
  content: ContentNode[];
  imageAlt: string;
  meta: PageMeta;
}
export interface Product {
  id: string; // TR slug
  image: string | null; // original from detail page
  cardImage: string | null;
  categoryIds: string[];
  translations: Partial<Record<Locale, ProductT>>;
}

interface Card {
  name: string;
  href: string;
  text: string;
  image: string | null;
}

function cards($: Awaited<ReturnType<typeof loadRaw>>): Card[] {
  return $("#menu-list .menu-card")
    .map((_, c) => {
      const $c = $(c);
      const a = $c.find(".menu-card-body a").first();
      const img = $c.find("img")[0] as Element | undefined;
      return {
        name: clean(a.text()),
        href: abs(a.attr("href")),
        text: clean($c.find(".menu-card-body span").first().text()),
        image: img ? imgSrc($, img) : null,
      };
    })
    .get();
}

export async function parseMenu(manifest: CrawlEntry[]) {
  const final = new Map(manifest.map((e) => [e.url, e.finalUrl]));
  const byUrl = new Map(manifest.filter((e) => e.key).map((e) => [e.url, e]));
  const resolve = (u: string) => final.get(u) ?? u;

  // Index pages give category order + card image + description.
  const idx = { tr: await loadRaw("menuler"), en: await loadRaw("en__menus") };
  const idxCards = { tr: cards(idx.tr), en: cards(idx.en) };

  const categories: Category[] = [];
  const products = new Map<string, Product>();
  const productByImage = new Map<string, string>(); // image file name -> TR product id
  const issues: string[] = [];

  for (let i = 0; i < idxCards.tr.length; i++) {
    const trCard = idxCards.tr[i]!;
    const enCard = idxCards.en[i];
    const cat: Category = {
      id: slugOf(trCard.href),
      order: i + 1,
      image: trCard.image,
      banner: null,
      productIds: [],
      translations: {},
    };
    for (const [loc, card] of [["tr", trCard], ["en", enCard]] as const) {
      if (!card) continue;
      const entry = byUrl.get(card.href);
      if (!entry?.key) {
        issues.push(`category page not crawled: ${card.href}`);
        continue;
      }
      const $ = await loadRaw(entry.key);
      cat.banner ??= $("#breadcrumb img")[0] ? imgSrc($, $("#breadcrumb img")[0] as Element) : null;
      cat.translations[loc] = {
        name: clean($("#menu-list .head h2").first().text()) || card.name,
        slug: slugOf(card.href),
        url: card.href,
        description: clean($("#menu-list .head p").first().text()) || card.text,
        meta: meta($),
      };
      // Products in this category
      for (const pc of cards($)) {
        const finalUrl = resolve(pc.href);
        const pEntry = byUrl.get(pc.href) ?? byUrl.get(finalUrl);
        let pid: string;
        if (loc === "tr") {
          pid = slugOf(finalUrl);
        } else {
          const sid = imageKey(pc.image);
          const match = sid ? productByImage.get(sid) : undefined;
          if (!match) {
            issues.push(`EN product without TR match (by image): ${pc.href}`);
            continue;
          }
          pid = match;
        }
        let p = products.get(pid);
        if (!p) {
          p = { id: pid, image: null, cardImage: pc.image, categoryIds: [], translations: {} };
          products.set(pid, p);
        }
        if (loc === "tr") {
          if (!p.categoryIds.includes(cat.id)) p.categoryIds.push(cat.id);
          if (!cat.productIds.includes(pid)) cat.productIds.push(pid);
          const sid = imageKey(pc.image);
          if (sid) productByImage.set(sid, pid);
        }
        const existing = p.translations[loc];
        if (existing) {
          if (!existing.aliasUrls.includes(pc.href) && pc.href !== existing.url) existing.aliasUrls.push(pc.href);
          continue;
        }
        let detail: Partial<ProductT> = {};
        if (pEntry?.key) {
          const $p = await loadRaw(pEntry.key);
          const $d = $p("#menu-detail");
          const img = $d.find(".img img")[0] as Element | undefined;
          if (img && loc === "tr") p.image = imgSrc($p, img);
          detail = {
            name: clean($d.find(".head h1").first().text()),
            description: clean($d.find(".body-explanation").first().text()),
            content: contentNodes($p, $d.find(".content")[0] ?? $d[0]!).filter(
              (n) => !(n.type === "image" && n.src === p!.image),
            ),
            imageAlt: img ? clean($p(img).attr("alt")) : "",
            meta: meta($p),
          };
        } else issues.push(`product page not crawled: ${pc.href}`);
        p.translations[loc] = {
          name: detail.name || pc.name,
          slug: slugOf(finalUrl),
          url: finalUrl,
          aliasUrls: pc.href !== finalUrl ? [pc.href] : [],
          shortDescription: pc.text,
          description: detail.description ?? "",
          content: detail.content ?? [],
          imageAlt: detail.imageAlt ?? "",
          meta: detail.meta ?? ({} as PageMeta),
        };
      }
    }
    categories.push(cat);
  }

  // Product URLs that exist on the site but are not linked from any category card.
  const known = new Set([...products.values()].flatMap((p) => Object.values(p.translations).flatMap((t) => [t!.url, ...t!.aliasUrls])));
  const orphanProductUrls = manifest
    .filter((e) => e.key && /^\/(en\/)?menu\//.test(new URL(e.url).pathname))
    .filter((e) => !known.has(e.url) && !known.has(e.finalUrl))
    .map((e) => e.url);

  return { categories, products: [...products.values()], orphanProductUrls, issues };
}
