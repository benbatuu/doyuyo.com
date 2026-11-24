import type { Element } from "domhandler";
import { clean } from "../lib.ts";
import type { CrawlEntry } from "../crawl.ts";
import { type Locale, abs, banner, contentNodes, imgSrc, loadRaw, localeOf, meta, pathOf, sections, type PageMeta, type Section } from "./common.ts";

/** Static pages: TR path -> EN path (as on the current site). */
export const STATIC_PAGES: { id: string; tr: string; en: string | null }[] = [
  { id: "home", tr: "/", en: "/en" },
  { id: "about", tr: "/biz-kimiz", en: "/en/about-us" },
  { id: "flavors", tr: "/lezzetlerimiz", en: "/en/flavors" },
  { id: "ingredients", tr: "/malzemelerimiz", en: "/en/materials" },
  { id: "investor", tr: "/yatirimci", en: "/en/investor" },
  { id: "careers", tr: "/insan-kaynaklari", en: "/en/human-resources" },
  { id: "contact", tr: "/iletisim", en: "/en/contact" },
  { id: "menu", tr: "/menuler", en: "/en/menus" },
  { id: "branches", tr: "/subelerimiz", en: "/en/branches" },
  { id: "crispy-chicken", tr: "/tr/citir-tavuk", en: null },
  { id: "fried-chicken", tr: "/tr/kizarmis-tavuk", en: "/en/fried-chicken" },
  { id: "legal-privacy", tr: "/yasal-metin/gizlilik-sozlesmesi", en: "/en/legal-agreement/non-disclosure-agreement" },
  {
    id: "legal-kvkk",
    // The /tr/... URL in sitemap.xml returns 404; the page lives without the /tr prefix.
    tr: "/yasal-metin/kisisel-verilerin-korunmasi-ve-islenmesi-politikasi",
    en: "/en/legal-agreement/personal-data-protection-and-processing-policy",
  },
];

export interface PageT {
  url: string;
  status: number;
  banner: ReturnType<typeof banner>;
  sections: Section[];
  meta: PageMeta;
}
export interface Page {
  id: string;
  translations: Partial<Record<Locale, PageT>>;
}

export interface FormField {
  name: string;
  label: string;
  placeholder: string;
  type: string;
  required: boolean;
  options: string[];
}
export interface FormDef {
  page: string;
  locale: Locale;
  fields: FormField[];
  submitLabel: string;
}

export async function parsePages(manifest: CrawlEntry[]) {
  const byPath = new Map(manifest.map((e) => [pathOf(e.url), e]));
  const pages: Page[] = [];
  const forms: FormDef[] = [];
  const issues: string[] = [];
  for (const sp of STATIC_PAGES) {
    const page: Page = { id: sp.id, translations: {} };
    for (const [loc, path] of [["tr", sp.tr], ["en", sp.en]] as const) {
      if (!path) continue;
      const e = byPath.get(path);
      if (!e || !e.key) {
        issues.push(`static page missing (${e?.status ?? "not crawled"}): ${path}`);
        if (e) page.translations[loc] = { url: e.url, status: e.status, banner: { title: "", image: null, breadcrumb: [] }, sections: [], meta: {} as PageMeta };
        continue;
      }
      const $ = await loadRaw(e.key);
      // Text nodes joined with spaces (so block boundaries don't glue words), nav/forms excluded.
      const $m = $("main").clone();
      $m.find("form, .cookie, script, style, #breadcrumb, nav, header, footer, [class*=menu-mobile], [class*=navbar]").remove();
      const mainText = clean(
        $m
          .find("*")
          .addBack()
          .contents()
          .filter((_, n) => n.type === "text")
          .map((_, n) => (n as unknown as { data: string }).data)
          .get()
          .join(" "),
      );
      // Menu and branch listings are stored as structured data (products.json, branches.json).
      const structured = sp.id === "menu" || sp.id === "branches";
      page.translations[loc] = {
        url: e.url,
        status: e.status,
        banner: banner($),
        sections: structured ? sections($).map((s) => ({ ...s, nodes: s.nodes.filter((n) => n.type === "heading" || n.type === "paragraph").slice(0, 3) })) : sections($),
        meta: meta($),
      };
      if (!structured) {
        const got = new Set(
          page.translations[loc]!.sections.flatMap((s) =>
            s.nodes.flatMap((n) =>
              n.type === "paragraph" ? n.text : n.type === "heading" ? n.text : n.type === "button" ? n.text : n.type === "stat" ? `${n.value} ${n.label}` : n.type === "list" ? n.items.join(" ") : n.type === "table" ? n.rows.flat().join(" ") : "",
            ),
          ).join(" ").split(/\s+/),
        );
        const words = mainText.split(/\s+/).filter((w) => w.length > 3);
        const missing = words.filter((w) => !got.has(w));
        if (words.length && missing.length / words.length > 0.03)
          issues.push(`text not captured on ${path} (${missing.length}/${words.length} words): ${missing.slice(0, 15).join(" ")}`);
      }
      $("main form").each((_, f) => {
        const fields = parseForm($, f as Element);
        if (fields.length) forms.push({ page: sp.id, locale: loc, fields, submitLabel: clean($(f).find("button").last().text()) });
      });
    }
    pages.push(page);
  }
  return { pages, forms, issues };
}

function parseForm($: Awaited<ReturnType<typeof loadRaw>>, form: Element): FormField[] {
  const fields: FormField[] = [];
  $(form)
    .find("input, select, textarea")
    .each((_, el) => {
      const $el = $(el);
      const type = el.tagName === "input" ? ($el.attr("type") ?? "text") : el.tagName;
      const name = $el.attr("name") ?? $el.attr("wire:model") ?? $el.attr("wire:model.defer") ?? $el.attr("wire:model.lazy") ?? $el.attr("id") ?? "";
      if (type === "hidden" || name === "_token" || ["submit", "button"].includes(type)) return;
      const label =
        clean($el.closest(".form-group").children("label").first().text()) ||
        clean($el.closest("label").contents().first().text()) ||
        clean($el.attr("placeholder"));
      fields.push({
        name,
        label,
        placeholder: clean($el.attr("placeholder")),
        type,
        required: $el.is("[required]"),
        // value "" = placeholder option. Province/district options are loaded by Livewire at runtime.
        options: el.tagName === "select" ? $el.find("option").filter((_, o) => !!$(o).attr("value")).map((_, o) => clean($(o).text())).get() : [],
      });
    });
  return fields;
}

/** Header/footer/global info from the home pages. */
export async function parseSite(manifest: CrawlEntry[]) {
  const out: Record<string, unknown> = {};
  for (const loc of ["tr", "en"] as const) {
    const e = manifest.find((m) => pathOf(m.url) === (loc === "tr" ? "/" : "/en"));
    if (!e?.key) continue;
    const $ = await loadRaw(e.key);
    const links = (sel: string) =>
      $(sel)
        .map((_, a) => ({ text: clean($(a).text()), href: abs($(a).attr("href")) }))
        .get()
        .filter((l) => l.text && l.href);
    out[loc] = {
      headerNav: links("header nav a, header .menu a").filter((v, i, arr) => arr.findIndex((x) => x.href === v.href) === i),
      footerNav: links("footer a").filter((l) => !/instagram|youtube|twitter|linkedin|facebook|sirius/i.test(l.href)),
      social: $("footer a, header a")
        .map((_, a) => abs($(a).attr("href")))
        .get()
        .filter((h) => /instagram|youtube|twitter|x\.com|linkedin|facebook|tiktok/i.test(h))
        .filter((v, i, arr) => arr.indexOf(v) === i),
      copyright: clean($("footer").find("p, span").filter((_, s) => /hakları|rights/i.test($(s).text())).first().text()),
      cookieText: clean($(".cookie .cookie-body").text()),
      cookieButton: clean($(".cookie button").text()),
      logo: abs($("header img").first().attr("data-src") || $("header img").first().attr("src")),
      favicons: $('link[rel*="icon"], link[rel="manifest"], link[rel="mask-icon"]')
        .map((_, l) => abs($(l).attr("href")))
        .get(),
      htmlLang: $("html").attr("lang") ?? null,
      themeColor: $('meta[name="theme-color"]').attr("content") ?? null,
      ...(await branchShared(manifest, loc)),
    };
  }
  return out;
}

export { contentNodes, imgSrc, localeOf };

/**
 * Blocks repeated identically on every branch page: online order platforms and the
 * "Lezzetlerimize Ulaş" product accordion. Stored once at site level.
 */
async function branchShared(manifest: CrawlEntry[], loc: Locale) {
  const e = manifest.find((m) => m.key && m.status === 200 && (loc === "tr" ? /^\/sube\//.test(pathOf(m.url)) : /^\/en\/branch\/[a-z]/.test(pathOf(m.url))));
  if (!e?.key) return {};
  const $ = await loadRaw(e.key);
  const $sales = $("#branch-sales");
  const $fl = $("#branch-flavors");
  return {
    orderPlatforms: {
      title: clean($sales.find("h2").first().text()),
      text: clean($sales.find(".head p").first().text()),
      items: $sales
        .find("a.item")
        .map((_, a) => {
          const img = $(a).find("img")[0] as Element | undefined;
          return { name: img ? clean($(img).attr("alt")) : "", href: abs($(a).attr("href")), logo: img ? imgSrc($, img) : null };
        })
        .get(),
      sourceUrl: e.url,
    },
    branchFlavors: {
      title: clean($fl.find("h2").first().text()),
      text: clean($fl.find(".head p").first().text()),
      items: $fl
        .find(".accordion-item")
        .map((_, it) => ({
          title: clean($(it).find(".accordion-head").text()),
          content: contentNodes($, $(it).find(".accordion-body")[0]!),
        }))
        .get(),
      sourceUrl: e.url,
    },
  };
}
