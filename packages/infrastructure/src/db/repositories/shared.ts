import { inArray } from "drizzle-orm";
import type { Locale } from "@doyuyo/i18n";
import type { Alternates, EntityType, Media } from "@doyuyo/core";
import type { Db } from "../client.ts";
import { media, mediaTranslations, routes } from "../schema/index.ts";
import { and, eq } from "drizzle-orm";

/** Load media rows by id in one query; alt text falls back to the given default. */
export async function loadMedia(db: Db, ids: (number | null | undefined)[], locale: Locale): Promise<Map<number, Media>> {
  const unique = [...new Set(ids.filter((x): x is number => typeof x === "number"))];
  if (!unique.length) return new Map();
  const rows = await db.select().from(media).where(inArray(media.id, unique));
  const alts = await db
    .select()
    .from(mediaTranslations)
    .where(and(inArray(mediaTranslations.mediaId, unique), eq(mediaTranslations.locale, locale)));
  const altBy = new Map(alts.map((a) => [a.mediaId, a.alt]));
  return new Map(rows.map((r) => [r.id, { id: r.id, src: r.path, width: r.width, height: r.height, alt: altBy.get(r.id) ?? "", mime: r.mime }]));
}

export const withAlt = (m: Media | null | undefined, alt: string): Media | null => (m ? { ...m, alt: m.alt || alt } : null);

/** Paths of many entities in one locale: Map<entityId, path>. */
export async function pathsOf(db: Db, type: EntityType, ids: number[], locale: Locale): Promise<Map<number, string>> {
  if (!ids.length) return new Map();
  const rows = await db
    .select({ id: routes.entityId, path: routes.path })
    .from(routes)
    .where(and(eq(routes.entityType, type), eq(routes.locale, locale), inArray(routes.entityId, ids)));
  return new Map(rows.map((r) => [r.id, r.path]));
}

export async function alternatesOf(db: Db, type: EntityType, id: number): Promise<Alternates> {
  const rows = await db.select().from(routes).where(and(eq(routes.entityType, type), eq(routes.entityId, id)));
  return Object.fromEntries(rows.map((r) => [r.locale, r.path])) as Alternates;
}
