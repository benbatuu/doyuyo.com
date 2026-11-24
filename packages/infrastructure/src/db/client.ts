import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

export type Db = ReturnType<typeof createDb>;

export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { max: 10, prepare: false });
  return drizzle(client, { schema });
}

// One pool per process (Next dev reloads modules; keep it on globalThis).
const g = globalThis as unknown as { __doyuyoDb?: Db };
export function getDb(): Db {
  g.__doyuyoDb ??= createDb();
  return g.__doyuyoDb;
}
