import { and, count, desc, eq, ilike, inArray, like, notLike, or, sql, type SQL } from "drizzle-orm";
import type { Locale } from "@doyuyo/i18n";
import { MEDIA_USAGES, isMediaUsage, mediaKindOf, type MediaUsage, type MediaAdminRepository, type MediaItem, type MediaKind, type MediaQuery, type MediaTexts, type NewMedia } from "@doyuyo/core";
import type { Db } from "../client.ts";
import { media, mediaTranslations } from "../schema/index.ts";

type Row = typeof media.$inferSelect;

/** Every place the live site references a media id, as (media_id, grp) rows. */
const SITE_USAGE = sql`(
  select image_id as media_id, 'product' as grp from products where image_id is not null
  union select card_image_id, 'product' from products where card_image_id is not null
  union select image_id, 'category' from categories where image_id is not null
  union select banner_id, 'category' from categories where banner_id is not null
  union select image_id, 'category' from category_translations where image_id is not null
  union select image_id, 'branch' from branches where image_id is not null
  union select banner_id, 'page' from pages where banner_id is not null
  union select (n->>'mediaId')::int, 'page' from page_translations, jsonb_array_elements(sections) s, jsonb_array_elements(s->'nodes') n
    where n->>'type' = 'image' and jsonb_typeof(n->'mediaId') = 'number'
  union select (value->>'logoMediaId')::int, 'brand' from settings where key = 'site' and jsonb_typeof(value->'logoMediaId') = 'number'
  union select (value->>'partnerLogoMediaId')::int, 'brand' from settings where key = 'site' and jsonb_typeof(value->'partnerLogoMediaId') = 'number'
  union select (i->>'logoMediaId')::int, 'brand' from settings, jsonb_array_elements(value->'orderPlatforms'->'items') i
    where key = 'site' and jsonb_typeof(i->'logoMediaId') = 'number'
)`;

/** Site use plus the group picked in the panel (what the media tabs show). */
const USAGE = sql`(select * from ${SITE_USAGE} su union select id, folder from media where folder is not null)`;

const kindWhere = (kind: MediaKind): SQL => {
  switch (kind) {
    case "image":
      return like(media.mime, "image/%");
    case "video":
      return like(media.mime, "video/%");
    case "document":
      return eq(media.mime, "application/pdf");
    case "other":
      return and(notLike(media.mime, "image/%"), notLike(media.mime, "video/%"), sql`${media.mime} <> 'application/pdf'`)!;
  }
};

export class DrizzleMediaAdminRepository implements MediaAdminRepository {
  constructor(private readonly db: Db) {}

  private async withTexts(rows: Row[]): Promise<MediaItem[]> {
    const ids = rows.map((r) => r.id);
    const [trs, uses] = ids.length
      ? await Promise.all([
          this.db.select().from(mediaTranslations).where(inArray(mediaTranslations.mediaId, ids)),
          this.db.execute<{ media_id: number; grp: MediaUsage }>(sql`select media_id, grp from ${USAGE} u where media_id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`),
        ])
      : [[], []];
    return rows.map((r) => ({
      id: r.id,
      path: r.path,
      mime: r.mime,
      kind: mediaKindOf(r.mime),
      width: r.width,
      height: r.height,
      bytes: r.bytes,
      originalName: r.originalName,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      texts: Object.fromEntries(trs.filter((t) => t.mediaId === r.id).map((t) => [t.locale, { alt: t.alt, title: t.title, caption: t.caption }])),
      folder: isMediaUsage(r.folder) ? r.folder : null,
      usage: MEDIA_USAGES.filter((g) => [...uses].some((u) => Number(u.media_id) === r.id && u.grp === g)),
    }));
  }

  async list({ kind, usage, q, limit, offset }: MediaQuery) {
    const conds: SQL[] = [];
    if (kind) conds.push(kindWhere(kind));
    if (usage === "unused") conds.push(sql`${media.id} not in (select media_id from ${USAGE} u)`);
    else if (usage) conds.push(sql`${media.id} in (select media_id from ${USAGE} u where grp = ${usage})`);
    if (q) {
      const term = `%${q.replace(/[%_]/g, "")}%`;
      const textHit = this.db.select({ id: mediaTranslations.mediaId }).from(mediaTranslations).where(or(ilike(mediaTranslations.alt, term), ilike(mediaTranslations.title, term)));
      conds.push(or(ilike(media.path, term), ilike(media.originalName, term), inArray(media.id, textHit))!);
    }
    const where = conds.length ? and(...conds) : undefined;
    const [rows, totals] = await Promise.all([
      this.db.select().from(media).where(where).orderBy(desc(media.createdAt), desc(media.id)).limit(limit).offset(offset),
      this.db.select({ n: count() }).from(media).where(where),
    ]);
    return { items: await this.withTexts(rows), total: Number(totals[0]?.n ?? 0) };
  }

  async counts() {
    const rows = await this.db.select({ mime: media.mime, n: count() }).from(media).groupBy(media.mime);
    const out: Record<MediaKind, number> = { image: 0, video: 0, document: 0, other: 0 };
    for (const r of rows) out[mediaKindOf(r.mime)] += Number(r.n);
    return out;
  }

  async usageCounts() {
    const rows = await this.db.execute<{ grp: string; n: string }>(sql`
      select grp, count(distinct media_id) as n from ${USAGE} u group by grp
      union all select 'unused', count(*) from media where id not in (select media_id from ${USAGE} u2)
      union all select 'all', count(*) from media`);
    const out = { product: 0, category: 0, branch: 0, page: 0, brand: 0, unused: 0, all: 0 } as Record<MediaUsage | "unused" | "all", number>;
    for (const r of rows) out[r.grp as keyof typeof out] = Number(r.n);
    return out;
  }

  async get(id: number) {
    const rows = await this.db.select().from(media).where(eq(media.id, id));
    return (await this.withTexts(rows))[0] ?? null;
  }

  async findBySha(sha256: string) {
    const rows = await this.db.select().from(media).where(eq(media.sha256, sha256)).limit(1);
    return (await this.withTexts(rows))[0] ?? null;
  }

  async create(m: NewMedia) {
    const [row] = await this.db.insert(media).values(m).returning();
    return (await this.withTexts([row!]))[0]!;
  }

  async siteUsage(id: number) {
    const rows = await this.db.execute<{ grp: MediaUsage }>(sql`select distinct grp from ${SITE_USAGE} su where media_id = ${id}`);
    return MEDIA_USAGES.filter((g) => [...rows].some((r) => r.grp === g));
  }

  async delete(id: number) {
    await this.db.delete(media).where(eq(media.id, id));
  }

  async setFolder(id: number, folder: MediaUsage | null) {
    await this.db.update(media).set({ folder, updatedAt: new Date() }).where(eq(media.id, id));
  }

  async saveTexts(id: number, texts: Partial<Record<Locale, MediaTexts>>) {
    await this.db.transaction(async (tx) => {
      for (const [locale, t] of Object.entries(texts)) {
        if (!t) continue;
        await tx
          .insert(mediaTranslations)
          .values({ mediaId: id, locale, ...t })
          .onConflictDoUpdate({ target: [mediaTranslations.mediaId, mediaTranslations.locale], set: t });
      }
      await tx.update(media).set({ updatedAt: new Date() }).where(eq(media.id, id));
    });
  }
}
