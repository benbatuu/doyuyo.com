import { and, eq, sql, type SQL } from "drizzle-orm";
import type { Locale } from "@doyuyo/i18n";
import { SEO_DESC_RANGE, SEO_KINDS, SEO_TITLE_RANGE, type SeoAdminRepository, type SeoKind, type SeoPage, type SeoQuery, type SeoRow, type SeoStats, type SeoTexts } from "@doyuyo/core";
import type { Db } from "../client.ts";
import { branchTranslations, categoryTranslations, cityTranslations, pageTranslations, productTranslations } from "../schema/index.ts";

type Raw = { kind: SeoKind; id: number; locale: Locale; name: string; path: string; seo_title: string; seo_description: string; hidden: boolean; total?: string };

const T = SEO_TITLE_RANGE;
const D = SEO_DESC_RANGE;

/** Every translated entity with its public path, as one union. */
const unionRows = () => sql`
  select 'page' as kind, t.page_id as id, t.locale, t.title as name, t.seo_title, t.seo_description, not p.published as hidden,
    (select r.path from routes r where r.entity_id = t.page_id and r.locale = t.locale and r.entity_type in ('page','home','menu','branches') limit 1) as path
    from page_translations t join pages p on p.id = t.page_id
  union all
  select 'category', t.category_id, t.locale, t.name, t.seo_title, t.seo_description, not c.published,
    (select r.path from routes r where r.entity_type = 'category' and r.entity_id = t.category_id and r.locale = t.locale)
    from category_translations t join categories c on c.id = t.category_id
  union all
  select 'product', t.product_id, t.locale, t.name, t.seo_title, t.seo_description, not p.published,
    (select r.path from routes r where r.entity_type = 'product' and r.entity_id = t.product_id and r.locale = t.locale)
    from product_translations t join products p on p.id = t.product_id
  union all
  select 'city', t.city_id, t.locale, t.name, t.seo_title, t.seo_description, false,
    (select r.path from routes r where r.entity_type = 'city' and r.entity_id = t.city_id and r.locale = t.locale)
    from city_translations t
  union all
  select 'branch', t.branch_id, t.locale, t.name, t.seo_title, t.seo_description, b.status <> 'open',
    (select r.path from routes r where r.entity_type = 'branch' and r.entity_id = t.branch_id and r.locale = t.locale)
    from branch_translations t join branches b on b.id = t.branch_id
`;

/** Same rule as seoIssues(): empty or out of range counts as a problem. Hidden rows are not checked. */
const titleBad = sql`length(trim(seo_title)) not between ${T.min} and ${T.max}`;
const descBad = sql`length(trim(seo_description)) not between ${D.min} and ${D.max}`;
const issueSql = sql`(not hidden and (${titleBad} or ${descBad}))`;

export class DrizzleSeoAdminRepository implements SeoAdminRepository {
  constructor(private readonly db: Db) {}

  async listPage(q: SeoQuery): Promise<SeoPage> {
    const conds: SQL[] = [sql`path is not null`, sql`locale = ${q.locale}`];
    if (q.kind) conds.push(sql`kind = ${q.kind}`);
    const term = q.q.trim();
    if (term) {
      const like = `%${term}%`;
      conds.push(sql`(name ilike ${like} or path ilike ${like})`);
    }
    if (q.issues) conds.push(issueSql);
    const where = sql.join(conds, sql` and `);
    const offset = (q.page - 1) * q.pageSize;

    const [rows, byKind] = await Promise.all([
      this.db.execute<Raw>(sql`with s as (${unionRows()}) select s.*, count(*) over() as total from s where ${where} order by kind, name limit ${q.pageSize} offset ${offset}`),
      this.db.execute<{ kind: SeoKind; n: string; live: string; title_bad: string; desc_bad: string; issues: string }>(sql`
        with s as (${unionRows()})
        select kind, count(*) as n,
          count(*) filter (where not hidden) as live,
          count(*) filter (where not hidden and ${titleBad}) as title_bad,
          count(*) filter (where not hidden and ${descBad}) as desc_bad,
          count(*) filter (where ${issueSql}) as issues
        from s where path is not null and locale = ${q.locale} group by kind`),
    ]);

    const kinds = Object.fromEntries(SEO_KINDS.map((k) => [k, 0])) as Record<SeoKind, number>;
    const stats: SeoStats = { total: 0, live: 0, titleBad: 0, descBad: 0, issues: 0, kinds };
    for (const r of [...byKind]) {
      kinds[r.kind] = Number(r.n);
      stats.total += Number(r.n);
      stats.live += Number(r.live);
      stats.titleBad += Number(r.title_bad);
      stats.descBad += Number(r.desc_bad);
      stats.issues += Number(r.issues);
    }

    const list = [...rows];
    const items: SeoRow[] = list.map((r) => ({ kind: r.kind, id: Number(r.id), locale: r.locale, name: r.name, path: r.path, seoTitle: r.seo_title, seoDescription: r.seo_description, hidden: !!r.hidden }));
    return { items, total: list[0] ? Number(list[0].total) : 0, stats };
  }

  async saveTexts(kind: SeoKind, id: number, locale: Locale, texts: SeoTexts): Promise<boolean> {
    const set = { seoTitle: texts.seoTitle, seoDescription: texts.seoDescription };
    const run = () => {
      switch (kind) {
        case "page":
          return this.db.update(pageTranslations).set(set).where(and(eq(pageTranslations.pageId, id), eq(pageTranslations.locale, locale))).returning({ id: pageTranslations.pageId });
        case "category":
          return this.db.update(categoryTranslations).set(set).where(and(eq(categoryTranslations.categoryId, id), eq(categoryTranslations.locale, locale))).returning({ id: categoryTranslations.categoryId });
        case "product":
          return this.db.update(productTranslations).set(set).where(and(eq(productTranslations.productId, id), eq(productTranslations.locale, locale))).returning({ id: productTranslations.productId });
        case "city":
          return this.db.update(cityTranslations).set(set).where(and(eq(cityTranslations.cityId, id), eq(cityTranslations.locale, locale))).returning({ id: cityTranslations.cityId });
        case "branch":
          return this.db.update(branchTranslations).set(set).where(and(eq(branchTranslations.branchId, id), eq(branchTranslations.locale, locale))).returning({ id: branchTranslations.branchId });
      }
    };
    return (await run()).length > 0;
  }
}
