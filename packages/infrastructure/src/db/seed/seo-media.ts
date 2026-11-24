/**
 * Gives every photo a descriptive, SEO-friendly file name (cajun-tenders-doyuyo-tenders.webp)
 * instead of the old CMS names (Web_2508x2508px-filigran...). Runs at the end of the seed:
 * updates media.path, rewrites every reference (content JSON, settings, redirects) and writes a
 * map that scripts/link-media.mjs uses to copy files to apps/web/public/img/.
 */
import { writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { slugify } from "@doyuyo/i18n";
import type { Db } from "../client.ts";

type Row = Record<string, unknown>;

export async function seoRenameMedia(db: Db, mapPath: string) {
  const rows = async (q: ReturnType<typeof sql>) => (await db.execute(q)) as unknown as Row[];
  const named = new Map<number, string>(); // media id -> base name
  const claim = (id: unknown, base: string) => {
    if (typeof id === "number" && !named.has(id) && base) named.set(id, slugify(base).slice(0, 80));
  };

  // Site chrome: logos and order platforms
  for (const loc of ["tr", "en"]) {
    const [site] = await rows(sql`select value from settings where key = 'site' and locale = ${loc}`);
    const v = (site?.value ?? {}) as { logoMediaId?: number; partnerLogoMediaId?: number; orderPlatforms?: { items: { name: string; logoMediaId: number | null }[] } };
    const sfx = loc === "tr" ? "" : `-${loc}`;
    claim(v.logoMediaId, `doyuyo-logo${sfx}`);
    claim(v.partnerLogoMediaId, `pardofood-logo${sfx}`);
    for (const i of v.orderPlatforms?.items ?? []) claim(i.logoMediaId, `${i.name}-online-siparis-logo${sfx}`);
  }
  // Group logos on the About page share the page key; they get their own names above via headings.


  // Products: main photo -> "{product}-doyuyo-{category}", card photo -> "{product}-kart"
  for (const r of await rows(sql`
    select p.key, p.image_id, p.card_image_id, c.key as cat
    from products p
    left join product_categories pc on pc.product_id = p.id and pc.is_primary
    left join categories c on c.id = pc.category_id`)) {
    claim(r.image_id, `${r.key}-doyuyo-${r.cat ?? "menu"}`);
    claim(r.card_image_id, `${r.key}-doyuyo-kart`);
  }
  for (const r of await rows(sql`select key, image_id, banner_id from categories`)) {
    claim(r.image_id, `${r.key}-menu-doyuyo`);
    claim(r.banner_id, `${r.key}-banner-doyuyo`);
  }
  for (const r of await rows(sql`select key, image_id from branches`)) claim(r.image_id, `${r.key}-doyuyo-sube`);
  for (const r of await rows(sql`select key, banner_id from pages`)) claim(r.banner_id, `${r.key}-banner-doyuyo`);

  const pathById = new Map((await rows(sql`select id, path from media`)).map((m) => [m.id as number, String(m.path)]));
  // Images inside page content: "{page}-{heading}-doyuyo"
  for (const r of await rows(sql`select p.key, t.sections, t.locale from pages p join page_translations t on t.page_id = p.id order by (t.locale = 'tr') desc`)) {
    let n = 0;
    const sfx = r.locale === "tr" ? "" : `-${r.locale}`;
    for (const sec of (r.sections as { key: string | null; nodes: { type: string; text?: string; mediaId?: number | null }[] }[]) ?? []) {
      let heading = "";
      for (const node of sec.nodes) {
        if (node.type === "heading") heading = node.text ?? "";
        if (node.type === "image" && node.mediaId) {
          // Brand logos keep their brand in the name: pardofood-grup-carmelo-logo
          const file = decodeURIComponent(pathById.get(node.mediaId) ?? "").split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") ?? "";
          claim(node.mediaId, sec.key === "about-pardo" ? `pardofood-grup-${file}${sfx}` : sec.key === "homepage-hero" ? `doyuyo-citir-tavuk-anasayfa-kapak${++n > 1 ? `-${n}` : ""}${sfx}` : `${r.key}-${heading || sec.key || "gorsel"}-doyuyo${++n > 1 ? `-${n}` : ""}${sfx}`);
        }
      }
    }
  }
  // PDFs: catalogue and allergen table get clean names under /docs/.
  for (const m of await rows(sql`select id, path from media where path ilike '%.pdf'`)) {
    const p = decodeURIComponent(String(m.path));
    claim(m.id, /katalog/i.test(p) ? "pardofood-kurumsal-katalog-2023" : /alerjen/i.test(p) ? "doyuyo-alerjen-ve-besin-degerleri-tablosu" : p.split("/").pop()?.replace(/\.pdf$/i, "") ?? "dosya");
  }

  const media = await rows(sql`select id, path from media order by id`);
  const used = new Set<string>();
  const map: { from: string; to: string }[] = [];
  const changes: { id: number; from: string; to: string }[] = [];
  for (const m of media) {
    const id = m.id as number;
    const base = named.get(id);
    if (!base) continue;
    const from = m.path as string;
    const ext = (from.match(/\.[a-z0-9]+$/i)?.[0] ?? "").toLowerCase();
    let name = base;
    for (let i = 2; used.has(name + ext); i++) name = `${base}-${i}`;
    used.add(name + ext);
    const dir = ext === ".pdf" ? "docs" : "img";
    const to = `/${dir}/${name}${ext}`;
    changes.push({ id, from, to });
    map.push({ from: decodeURIComponent(from.replace("/media/legacy/", "")), to: `${dir}/${name}${ext}` });
  }

  for (const c of changes) {
    await db.execute(sql`update media set path = ${c.to} where id = ${c.id}`);
    const a = `"${c.from}"`;
    const b = `"${c.to}"`;
    await db.execute(sql`update page_translations set sections = replace(sections::text, ${a}, ${b})::jsonb where sections::text like ${"%" + c.from + "%"}`);
    await db.execute(sql`update product_translations set content = replace(content::text, ${a}, ${b})::jsonb where content::text like ${"%" + c.from + "%"}`);
    await db.execute(sql`update branch_translations set description = replace(description::text, ${a}, ${b})::jsonb where description::text like ${"%" + c.from + "%"}`);
    await db.execute(sql`update settings set value = replace(value::text, ${a}, ${b})::jsonb where value::text like ${"%" + c.from + "%"}`);
    await db.execute(sql`update redirects set to_path = ${c.to} where to_path = ${c.from}`);
  }
  writeFileSync(mapPath, JSON.stringify(map, null, 2) + "\n");
  console.log(`seo media: ${changes.length} files renamed`);
}
