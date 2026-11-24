import { eq, sql } from "drizzle-orm";
import type { SettingsKvRepository } from "@doyuyo/core";
import type { Db } from "../client.ts";
import { settings } from "../schema/index.ts";

/** Global (locale "*") key/value settings: maintenance, access matrix. */
export class DrizzleSettingsKvRepository implements SettingsKvRepository {
  constructor(private readonly db: Db) {}

  async getKey(key: string) {
    const [r] = await this.db.select({ value: settings.value }).from(settings).where(eq(settings.key, key));
    return r ? r.value : null;
  }

  async putKey(key: string, value: unknown) {
    await this.db
      .insert(settings)
      .values({ key, locale: "*", value: value as object })
      .onConflictDoUpdate({ target: [settings.key, settings.locale], set: { value: value as object, updatedAt: sql`now()` } });
  }
}
