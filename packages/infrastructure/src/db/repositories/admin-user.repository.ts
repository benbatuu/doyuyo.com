import { asc, eq } from "drizzle-orm";
import type { AdminUserRecord, AdminUserRepository, AdminUserRow, Role } from "@doyuyo/core";
import type { Db } from "../client.ts";
import { adminUsers } from "../schema/index.ts";

type UserDbRow = typeof adminUsers.$inferSelect;

const toRecord = (r: UserDbRow): AdminUserRecord => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role as Role,
  active: r.active,
  builtin: false,
  createdAt: r.createdAt.toISOString(),
  passwordHash: r.passwordHash,
});

export class DrizzleAdminUserRepository implements AdminUserRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<AdminUserRow[]> {
    const rows = await this.db.select().from(adminUsers).orderBy(asc(adminUsers.createdAt));
    return rows.map((r) => {
      const rec = toRecord(r);
      return { id: rec.id, email: rec.email, name: rec.name, role: rec.role, active: rec.active, builtin: false, createdAt: rec.createdAt };
    });
  }

  async byEmail(email: string) {
    const [r] = await this.db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return r ? toRecord(r) : null;
  }

  async byId(id: number) {
    const [r] = await this.db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return r ? toRecord(r) : null;
  }

  async insert(u: { email: string; name: string; role: Role; passwordHash: string }) {
    const [r] = await this.db.insert(adminUsers).values({ email: u.email, name: u.name, role: u.role, passwordHash: u.passwordHash }).returning({ id: adminUsers.id });
    return r!.id;
  }

  async update(id: number, patch: { name?: string; role?: Role; active?: boolean }) {
    await this.db.update(adminUsers).set({ ...patch, updatedAt: new Date() }).where(eq(adminUsers.id, id));
  }

  async setPasswordHash(id: number, hash: string) {
    await this.db.update(adminUsers).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(adminUsers.id, id));
  }

  async delete(id: number) {
    await this.db.delete(adminUsers).where(eq(adminUsers.id, id));
  }
}
