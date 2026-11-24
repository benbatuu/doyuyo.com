import { and, eq, sql } from "drizzle-orm";
import type { Locale } from "@doyuyo/i18n";
import type { SiteAdminRepository, SiteRaw } from "@doyuyo/core";
import type { Db } from "../client.ts";
import { settings } from "../schema/index.ts";

export class DrizzleSiteAdminRepository implements SiteAdminRepository {
  constructor(private readonly db: Db) {}

  async getSiteRaw(locale: Locale): Promise<SiteRaw> {
    const [row] = await this.db
      .select({ value: settings.value })
      .from(settings)
      .where(and(eq(settings.key, "site"), eq(settings.locale, locale)));
    if (!row) throw new Error(`site settings missing for ${locale}`);
    return row.value as SiteRaw;
  }

  /** Shallow merge of top-level site keys (null removes a value). */
  async patchSite(locale: Locale, patch: Record<string, unknown>): Promise<void> {
    await this.db.execute(sql`update settings set value = value || ${JSON.stringify(patch)}::jsonb, updated_at = now() where key = 'site' and locale = ${locale}`);
  }

  async setSiteText(locale: Locale, path: string[], value: string): Promise<void> {
    const pathSql = sql`ARRAY[${sql.join(path.map((p) => sql`${p}`), sql`, `)}]::text[]`;
    await this.db.execute(sql`
      update settings
      set value = jsonb_set(value, ${pathSql}, to_jsonb(${value}::text), false), updated_at = now()
      where key = 'site' and locale = ${locale}`);
  }
}
