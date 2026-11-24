import "server-only";
import type { ContentNode, StaticPage } from "@doyuyo/core";
import { PUBLISHED_LOCALES, SECTION_SEGMENT, allergenLabel, localePath, type Locale } from "@doyuyo/i18n";
import { plain, truncate } from "@doyuyo/seo";
import { app } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";

const abs = (p: string) => (p.startsWith("http") ? p : `${SITE_URL}${p}`);

/** Inline HTML (strong/em/a/br) -> Markdown. */
function mdInline(html: string) {
  return html
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<(strong|b)>(.*?)<\/\1>/g, "**$2**")
    .replace(/<(em|i)>(.*?)<\/\1>/g, "*$2*")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g, (_, h: string, t: string) => `[${t}](${abs(h)})`)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Page content nodes -> Markdown (headings, paragraphs, lists, tables, stats). Buttons and photos are skipped. */
export function toMarkdown(nodes: ContentNode[], baseLevel = 3): string {
  const out: string[] = [];
  for (const n of nodes) {
    switch (n.type) {
      case "heading":
        out.push(`${"#".repeat(Math.min(6, Math.max(baseLevel, n.level + baseLevel - 1)))} ${n.text}`);
        break;
      case "paragraph":
        out.push(mdInline(n.html));
        break;
      case "list":
        out.push(n.items.map((i, k) => `${n.ordered ? `${k + 1}.` : "-"} ${mdInline(i)}`).join("\n"));
        break;
      case "stat":
        out.push(`- **${n.value}** ${n.label}`);
        break;
      case "table": {
        const [head, ...rest] = n.rows;
        if (head) out.push([`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rest.map((r) => `| ${r.join(" | ")} |`)].join("\n"));
        break;
      }
      case "video":
        out.push(`[Video](${n.href})`);
        break;
    }
  }
  return out.join("\n\n");
}

const T = {
  tr: {
    summary: (n: number, c: number, k: number) => `Doyuyo!, PardoFood'un çıtır tavuk (tenders), burger ve soslarıyla bilinen fast casual restoran zinciridir. Türkiye'de ve Birleşik Arap Emirlikleri'nde ${n} şubesi, ${c} şehri ve ${k} ülkesi vardır.`,
    facts: "Temel bilgiler",
    pages: "Sayfalar",
    menu: "Menü",
    branches: "Şubeler",
    contact: "İletişim",
    order: "Online sipariş",
    legal: "Yasal",
    hq: "Genel müdürlük",
    phone: "Telefon",
    social: "Sosyal medya",
    founded: "Kuruluş: 2019 (ilk şube Özdilek Park İstanbul). Bağlı olduğu şirket grubu: PardoFood (https://www.pardofood.com).",
    allergens: "Alerjen ve besin değerleri",
    per100: "100 g / 100 ml için",
    kcal: "kcal",
    fat: "yağ",
    protein: "protein",
    carbs: "karbonhidrat",
    contains: "İçerdiği alerjenler",
    hours: "Çalışma saatleri",
    cityCount: (n: number) => `${n} şube`,
    note: "Bu dosya site içeriğinden otomatik üretilir.",
  },
  en: {
    summary: (n: number, c: number, k: number) => `Doyuyo! is a fast-casual restaurant chain by PardoFood, known for crispy fried chicken (tenders), burgers and sauces. It has ${n} branches in ${c} cities across ${k} countries (Türkiye and the United Arab Emirates).`,
    facts: "Key facts",
    pages: "Pages",
    menu: "Menu",
    branches: "Branches",
    contact: "Contact",
    order: "Online ordering",
    legal: "Legal",
    hq: "Head office",
    phone: "Phone",
    social: "Social media",
    founded: "Founded: 2019 (first branch at Özdilek Park İstanbul). Part of the PardoFood group (https://www.pardofood.com).",
    allergens: "Allergens and nutrition",
    per100: "per 100 g / 100 ml",
    kcal: "kcal",
    fat: "fat",
    protein: "protein",
    carbs: "carbohydrate",
    contains: "Allergens",
    hours: "Opening hours",
    cityCount: (n: number) => `${n} ${n === 1 ? "branch" : "branches"}`,
    note: "This file is generated automatically from the site content.",
  },
} as const;

const realText = (x?: string) => (x && plain(x).length >= 50 ? x : "");
const firstText = (page: StaticPage | null | undefined) =>
  truncate(realText(page?.seo.description) || page?.sections.flatMap((s) => s.nodes).find((n) => n.type === "paragraph" && n.text.length >= 80 && "text" in n)?.["text" as never] || "", 200);

async function context(locale: Locale) {
  const c = app();
  const [site, menu, br] = await Promise.all([c.getSiteSettings.execute(locale), c.getMenu.execute(locale), c.listBranches.execute(locale)]);
  const key = async (k: string) => c.getStaticPage.byKey(k, locale);
  const countries = new Set(br.cities.map((x) => x.country)).size;
  return { c, site, menu, br, key, countries };
}

const PAGE_KEYS = ["about", "flavors", "ingredients", "investor", "careers", "contact", "allergens"] as const;

async function factsBlock(locale: Locale, ctx: Awaited<ReturnType<typeof context>>) {
  const t = T[locale === "en" ? "en" : "tr"];
  const { site } = ctx;
  const lines: string[] = [t.founded];
  if (site.headOffice) lines.push(`${t.hq}: ${site.headOffice.address}`);
  if (site.phone) lines.push(`${t.phone}: ${site.phone.label}`);
  if (site.social.length) lines.push(`${t.social}: ${site.social.map((s) => s.href).join(", ")}`);
  if (site.orderPlatforms.items.length) lines.push(`${t.order}: ${site.orderPlatforms.items.map((i) => `${i.name} (${i.href})`).join(", ")}`);
  return lines.map((l) => `- ${l}`).join("\n");
}

/** /llms.txt — short index for AI assistants (llmstxt.org format), both languages. */
export async function llmsTxt() {
  const parts: string[] = ["# Doyuyo!", ""];
  const first = await context("tr");
  parts.push(`> ${T.tr.summary(first.br.branches.length, first.br.cities.length, first.countries)}`, `> ${T.en.summary(first.br.branches.length, first.br.cities.length, first.countries)}`, "");
  parts.push(`${T.tr.note} / ${T.en.note} Full text: ${SITE_URL}/llms-full.txt`, "");
  for (const locale of PUBLISHED_LOCALES) {
    const ctx = locale === "tr" ? first : await context(locale);
    const t = T[locale === "en" ? "en" : "tr"];
    parts.push(`## ${locale === "tr" ? "Türkçe" : "English"}`, "", `### ${t.facts}`, await factsBlock(locale, ctx), "", `### ${t.pages}`);
    const menuPath = localePath(locale, SECTION_SEGMENT.menu[locale]);
    const branchesPath = localePath(locale, SECTION_SEGMENT.branches[locale]);
    parts.push(`- [${(ctx.menu.page?.title ?? t.menu).replace(/\s*-\s*Doyuyo!?$/i, "")}](${abs(menuPath)}): ${truncate(firstText(ctx.menu.page) || t.menu, 160)}`);
    parts.push(`- [${(ctx.br.page?.title ?? t.branches).replace(/\s*-\s*Doyuyo!?$/i, "")}](${abs(branchesPath)}): ${t.cityCount(ctx.br.branches.length)}`);
    for (const k of PAGE_KEYS) {
      const p = await ctx.key(k);
      if (p) parts.push(`- [${p.title.replace(/\s*-\s*Doyuyo!?$/i, "")}](${abs(p.path)})${firstText(p) ? `: ${firstText(p)}` : ""}`);
    }
    parts.push("", `### ${t.menu}`);
    for (const cat of ctx.menu.categories) parts.push(`- [${cat.name}](${abs(cat.path)}): ${truncate(cat.description, 140)}`);
    parts.push("", `### ${t.branches}`);
    for (const city of ctx.br.cities) parts.push(`- [${city.name}](${abs(city.path)}): ${t.cityCount(city.branchCount)}`);
    parts.push("");
  }
  return parts.join("\n").replace(/\n{3,}/g, "\n\n");
}

/** /llms-full.txt — the site's real content as Markdown: company facts, page copy, every menu item with allergens and nutrition, every branch with address and hours. */
export async function llmsFullTxt() {
  const parts: string[] = ["# Doyuyo!", ""];
  for (const locale of PUBLISHED_LOCALES) {
    const ctx = await context(locale);
    const t = T[locale === "en" ? "en" : "tr"];
    parts.push(`# ${locale === "tr" ? "Türkçe" : "English"} (${SITE_URL}/${locale})`, "", `> ${t.summary(ctx.br.branches.length, ctx.br.cities.length, ctx.countries)}`, "", `## ${t.facts}`, await factsBlock(locale, ctx), "");

    // Page copy
    for (const k of ["about", "flavors", "ingredients", "investor", "careers"] as const) {
      const p = await ctx.key(k);
      if (!p) continue;
      const nodes = p.sections.filter((s) => s.key !== "cta" && !s.key?.endsWith("-form")).flatMap((s) => s.nodes);
      parts.push(`## ${p.title.replace(/\s*-\s*Doyuyo!?$/i, "")}`, `Source: ${abs(p.path)}`, "", toMarkdown(nodes, 3), "");
    }

    // Menu
    parts.push(`## ${t.menu}`, `Source: ${abs(localePath(locale, SECTION_SEGMENT.menu[locale]))}`, "");
    for (const cat of ctx.menu.categories) {
      const detail = await ctx.c.getCategory.execute(cat.id, locale);
      parts.push(`### ${cat.name}`, truncate(cat.description, 400), "");
      for (const p of detail?.products ?? []) {
        const full = await ctx.c.getProduct.execute(p.id, locale);
        const a = full?.allergenInfo;
        const n = a?.nutrition;
        const bits = [
          p.shortDescription,
          a && a.kind !== "none" ? `${t.contains}: ${a.allergens.length ? a.allergens.map((x) => allergenLabel(x, locale)).join(", ") : "—"}.` : "",
          n ? `${t.per100}: ${n.kcal} ${t.kcal}, ${t.fat} ${n.fat} g, ${t.protein} ${n.protein} g, ${t.carbs} ${n.carbs} g.` : "",
        ].filter(Boolean);
        parts.push(`- **${p.name}** (${abs(p.path)}): ${bits.join(" ")}`);
      }
      parts.push("");
    }
    const table = await ctx.c.getAllergenTable.execute(locale);
    if (table?.notes.length) parts.push(`### ${t.allergens}`, ...table.notes.map((x) => `- ${plain(x)}`), table.pdf ? `- PDF: ${abs(table.pdf.src)}` : "", "");

    // Branches
    parts.push(`## ${t.branches} (${ctx.br.branches.length})`, "");
    for (const city of ctx.br.cities) {
      parts.push(`### ${city.name} (${t.cityCount(city.branchCount)})`);
      for (const b of ctx.br.branches.filter((x) => x.city?.name === city.name)) {
        const hours = b.hours.map((h) => `${h.day} ${h.time}`).join(", ");
        parts.push(`- **${b.name}** — ${b.address}. ${t.hours}: ${hours}.${b.mapsUrl ? ` [Map](${b.mapsUrl}).` : ""} ${abs(b.path)}`);
      }
      parts.push("");
    }
  }
  return parts.join("\n").replace(/\n{3,}/g, "\n\n");
}
