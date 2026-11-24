/** Applies SQL migrations (src/db/migrations). Safe to run on every deploy. */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const client = postgres(url, { max: 1 });
await migrate(drizzle(client), { migrationsFolder: join(import.meta.dirname, "migrations") });
await client.end();
console.log("migrations applied");
