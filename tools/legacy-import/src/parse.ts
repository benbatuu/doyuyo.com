/**
 * Parse raw HTML into normalized JSON (output/json/*.json).
 * Text is kept verbatim: nothing is corrected here; problems go to issues.json.
 */
import { join } from "node:path";
import type { CrawlEntry } from "./crawl.ts";
import { JSON_DIR, readJson, writeJson } from "./lib.ts";
import { parseBranches } from "./parse/branches.ts";
import { slugOf } from "./parse/common.ts";
import { parseMenu } from "./parse/menu.ts";
import { parsePages, parseSite } from "./parse/pages.ts";

async function main() {
  const manifest = await readJson<CrawlEntry[]>(join(JSON_DIR, "crawl-manifest.json"));

  const menu = await parseMenu(manifest);
  // Un-categorized /menu/{slug} duplicates -> alias of the product with the same slug.
  const stillOrphan: string[] = [];
  for (const url of menu.orphanProductUrls) {
    const loc = new URL(url).pathname.startsWith("/en") ? "en" : "tr";
    const final = manifest.find((e) => e.url === url)?.finalUrl ?? url;
    const p = menu.products.find((x) => x.translations[loc]?.slug === slugOf(final));
    if (p) p.translations[loc]!.aliasUrls.push(url);
    else stillOrphan.push(url);
  }
  menu.issues.push(...stillOrphan.map((u) => `product page not linked from any category: ${u}`));
  for (const p of menu.products) {
    if (!p.translations.en) menu.issues.push(`product without EN version: ${p.id}`);
    if (!p.image) menu.issues.push(`product without detail image: ${p.id}`);
  }

  const { branches, issues: branchIssues } = await parseBranches(manifest);
  const { pages, forms, issues: pageIssues } = await parsePages(manifest);
  const site = await parseSite(manifest);

  await writeJson(join(JSON_DIR, "categories.json"), menu.categories);
  await writeJson(join(JSON_DIR, "products.json"), menu.products);
  await writeJson(join(JSON_DIR, "branches.json"), branches);
  await writeJson(join(JSON_DIR, "pages.json"), pages);
  await writeJson(join(JSON_DIR, "forms.json"), forms);
  await writeJson(join(JSON_DIR, "site.json"), site);
  await writeJson(join(JSON_DIR, "issues.json"), { menu: menu.issues, branches: branchIssues, pages: pageIssues });

  console.log({
    categories: menu.categories.length,
    products: menu.products.length,
    branches: branches.length,
    pages: pages.length,
    forms: forms.length,
    issues: menu.issues.length + branchIssues.length + pageIssues.length,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
