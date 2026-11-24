import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { ORIGIN, RAW, clean, normalizeUrl } from "../lib.ts";

export type Locale = "tr" | "en";
export type $ = cheerio.CheerioAPI;

export interface PageMeta {
  title: string;
  description: string;
  canonical: string | null;
  ogTitle: string;
  ogDescription: string;
  ogImage: string | null;
  ogType: string;
  alternates: Record<string, string>;
}

export interface ImageRef {
  src: string;
  alt: string;
}

export type ContentNode =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; html: string; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "image"; src: string; alt: string }
  | { type: "button"; text: string; href: string }
  | { type: "stat"; value: string; label: string }
  | { type: "embed"; src: string }
  | { type: "video"; href: string; thumbnail: string | null }
  | { type: "table"; rows: string[][] };

export interface Section {
  id: string | null;
  nodes: ContentNode[];
}

export const localeOf = (url: string): Locale => (new URL(url).pathname.startsWith("/en") ? "en" : "tr");
export const pathOf = (url: string) => new URL(url).pathname || "/";

export async function loadRaw(key: string): Promise<$> {
  return cheerio.load(await readFile(join(RAW, `${key}.html`), "utf8"));
}

/** Absolute media/page URL from an attribute value. */
export function abs(href: string | undefined): string {
  if (!href) return "";
  try {
    return new URL(href.trim(), ORIGIN).toString().replace("://www.doyuyo.com", "://doyuyo.com");
  } catch {
    return href;
  }
}

export function imgSrc($: $, el: Element): string {
  const $el = $(el);
  return abs($el.attr("data-src") || $el.attr("src") || $el.attr("data-srcset") || "");
}

export function meta($: $): PageMeta {
  const m = (sel: string) => clean($(sel).attr("content"));
  const alternates: Record<string, string> = {};
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    alternates[$(el).attr("hreflang")!] = abs($(el).attr("href"));
  });
  return {
    title: clean($("title").first().text()),
    description: m('meta[name="description"]'),
    canonical: $('link[rel="canonical"]').attr("href") ?? null,
    ogTitle: m('meta[property="og:title"]'),
    ogDescription: m('meta[property="og:description"]'),
    ogImage: m('meta[property="og:image"]') || null,
    ogType: m('meta[property="og:type"]'),
    alternates,
  };
}

/** Inner banner (breadcrumb section): h1 + background image + breadcrumb trail. */
export function banner($: $) {
  const $b = $("#breadcrumb").first();
  return {
    title: clean($b.find("h1").first().text()),
    image: $b.find("img").length ? imgSrc($, $b.find("img")[0] as Element) : null,
    breadcrumb: $b
      .find("li")
      .map((_, li) => ({
        text: clean($(li).text()),
        href: $(li).find("a").attr("href") ? abs($(li).find("a").attr("href")) : null,
      }))
      .get(),
  };
}

const INLINE_OK = new Set(["strong", "b", "em", "i", "u", "a", "br", "span", "sup", "sub"]);

/** Keep only safe inline formatting; unwrap everything else. */
export function inlineHtml($: $, el: AnyNode): string {
  // Whitespace inside <strong>…</strong> is significant ("<strong>Baby filetodan </strong>hazırlanan"): trim only at the top.
  return inlineInner($, el)
    .replace(/\s+/g, " ")
    .replace(/\s+(<\/(strong|em|u|a|sup|sub)>)/g, "$1 ")
    .replace(/(<br>\s*)+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inlineInner($: $, el: AnyNode): string {
  let out = "";
  $(el)
    .contents()
    .each((_, n) => {
      if (n.type === "text") {
        out += escapeHtml((n as unknown as { data: string }).data.replace(/ /g, " "));
        return;
      }
      if (n.type !== "tag") return;
      const tag = (n as Element).tagName.toLowerCase();
      if (tag === "br") {
        out += "<br>";
        return;
      }
      if (tag === "i" && ($(n).attr("class") ?? "").includes("icon")) return;
      const inner = inlineInner($, n);
      if (!INLINE_OK.has(tag) || tag === "span") {
        out += inner;
        return;
      }
      const t = tag === "b" ? "strong" : tag === "i" ? "em" : tag;
      if (t === "a") {
        const href = abs($(n).attr("href"));
        out += `<a href="${escapeAttr(href)}">${inner}</a>`;
      } else out += `<${t}>${inner}</${t}>`;
    });
  return out;
}

export const htmlToText = (html: string) =>
  clean(
    html
      .replace(/<br>/g, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&"),
  );

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s: string) => escapeHtml(s).replace(/"/g, "&quot;");

/** Walk an element in document order and produce a flat, ordered content stream. */
export function contentNodes($: $, root: AnyNode): ContentNode[] {
  const nodes: ContentNode[] = [];
  const walk = (el: AnyNode) => {
    $(el)
      .children()
      .each((_, c) => {
        const $c = $(c);
        const tag = c.tagName.toLowerCase();
        const cls = $c.attr("class") ?? "";
        if (["script", "style", "svg", "noscript", "form", "button", "source"].includes(tag)) return;
        if (/^h[1-6]$/.test(tag)) {
          const text = clean($c.text());
          if (text) nodes.push({ type: "heading", level: Number(tag[1]), text });
          return;
        }
        if (tag === "p") {
          const html = inlineHtml($, c);
          const text = htmlToText(html); // <br> -> space, so words don't glue together
          if (text) nodes.push({ type: "paragraph", html, text });
          $c.find("img").each((_, i) => pushImage(i as Element));
          return;
        }
        if ((tag === "ul" || tag === "ol") && !$c.closest(".swiper, nav, #breadcrumb").length) {
          const items = $c
            .children("li")
            .map((_, li) => inlineHtml($, li))
            .get()
            .filter(Boolean);
          if (items.length) nodes.push({ type: "list", ordered: tag === "ol", items });
          return;
        }
        if (tag === "table") {
          const rows = $c
            .find("tr")
            .map((_, tr) => [$(tr).find("th,td").map((_, td) => clean($(td).text())).get()])
            .get() as string[][];
          if (rows.length) nodes.push({ type: "table", rows });
          return;
        }
        if (tag === "img") return pushImage(c);
        if (tag === "iframe") {
          nodes.push({ type: "embed", src: $c.attr("src") || $c.attr("data-src") || "" });
          return;
        }
        if (tag === "a") {
          const href = abs($c.attr("href"));
          if (/youtube\.com|youtu\.be/.test(href)) {
            const t = $c.find("img")[0];
            nodes.push({ type: "video", href, thumbnail: t ? imgSrc($, t as Element) : null });
            return;
          }
          if (cls.includes("btn") || cls.includes("contact-row") || /^(tel|mailto):/.test($c.attr("href") ?? "")) {
            nodes.push({ type: "button", text: clean($c.text()), href });
            return;
          }
        }
        if (tag === "span" && cls.includes("count")) {
          const label = clean($c.nextAll("span").first().text() || $c.parent().find(".body-explanation").first().text());
          nodes.push({ type: "stat", value: clean($c.text()), label });
          return;
        }
        if (tag === "span" && $c.prevAll("span.count").length) return; // stat label, already used
        walk(c);
      });
  };
  const pushImage = (i: Element) => {
    const src = imgSrc($, i);
    if (src && !src.startsWith("data:")) nodes.push({ type: "image", src, alt: clean($(i).attr("alt")) });
  };
  walk(root);
  return nodes;
}

/** Top-level content sections of <main> (excludes the breadcrumb banner). */
export function sections($: $): Section[] {
  return $("main section.structure")
    .filter((_, s) => $(s).parents("section").length === 0 && $(s).attr("id") !== "breadcrumb")
    .map((_, s) => ({ id: $(s).attr("id") ?? null, nodes: contentNodes($, s) }))
    .get();
}

/** Image identity across locales: EN copies get a new storage id but keep the file name. */
export function imageKey(url: string | null): string | null {
  if (!url) return null;
  const base = url.split("?")[0]!.split("/").pop() ?? "";
  return base ? decodeURIComponent(base) : null;
}

export function storageId(url: string): string | null {
  return url.match(/\/storage\/(\d+)\//)?.[1] ?? null;
}

/** Last path segment after following redirects (finalUrl). */
export function slugOf(url: string): string {
  return pathOf(url).split("/").filter(Boolean).pop() ?? "";
}

export const normalize = (u: string) => normalizeUrl(u) ?? u;
