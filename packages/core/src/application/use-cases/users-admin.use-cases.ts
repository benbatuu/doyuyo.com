import { EMAIL_RE, MIN_PASSWORD, type AccessContext, type AdminUserRow } from "../../domain/users-admin.ts";
import { DEFAULT_MATRIX, ROLES, normalizeMatrix, permsFor, type Role } from "../../domain/access-admin.ts";
import type { AdminUserRepository, PasswordHasher, SettingsKvRepository } from "../ports/access-ports.ts";

type Result = { ok: true } | { ok: false; error: string };

const isRole = (r: unknown): r is Role => (ROLES as readonly unknown[]).includes(r);
const cleanEmail = (e: string) => e.trim().toLowerCase();

/** Panel: users, roles and which panel areas each role may open. */
export class ManageUsers {
  constructor(
    private readonly users: AdminUserRepository,
    private readonly hasher: PasswordHasher,
    private readonly settings: SettingsKvRepository,
    private readonly ownerEmail: string,
  ) {}

  async matrix() {
    return normalizeMatrix((await this.settings.getKey("access")) ?? DEFAULT_MATRIX);
  }

  /** Access for a signed-in email. null when the account is unknown or disabled. */
  async context(email: string): Promise<AccessContext | null> {
    const e = cleanEmail(email);
    if (this.ownerEmail && e === cleanEmail(this.ownerEmail)) {
      return { email: e, name: "Sahip", role: "owner", perms: permsFor("owner", DEFAULT_MATRIX) };
    }
    const u = await this.users.byEmail(e);
    if (!u || !u.active) return null;
    return { email: u.email, name: u.name || u.email, role: u.role, perms: permsFor(u.role, await this.matrix()) };
  }

  /** Login check for panel accounts (the env owner is checked separately). */
  async authenticate(email: string, password: string): Promise<boolean> {
    const u = await this.users.byEmail(cleanEmail(email));
    if (!u || !u.active || !u.passwordHash) return false;
    return this.hasher.verify(password, u.passwordHash);
  }

  async list(): Promise<AdminUserRow[]> {
    const rows = await this.users.list();
    const owner: AdminUserRow = { id: 0, email: this.ownerEmail, name: "Sahip", role: "owner", active: true, builtin: true, createdAt: "" };
    return this.ownerEmail ? [owner, ...rows] : rows;
  }

  async create(actor: AccessContext, input: { email: string; name: string; role: string; password: string }): Promise<Result> {
    const email = cleanEmail(input.email ?? "");
    const name = String(input.name ?? "").trim().slice(0, 80);
    if (!EMAIL_RE.test(email)) return { ok: false, error: "Geçerli bir e-posta gir" };
    if (!isRole(input.role)) return { ok: false, error: "Geçersiz rol" };
    if (input.role === "owner" && actor.role !== "owner") return { ok: false, error: "Sahip rolünü yalnızca sahip verebilir" };
    if (String(input.password ?? "").length < MIN_PASSWORD) return { ok: false, error: `Şifre en az ${MIN_PASSWORD} karakter olmalı` };
    if (email === cleanEmail(this.ownerEmail) || (await this.users.byEmail(email))) return { ok: false, error: "Bu e-posta zaten kayıtlı" };
    await this.users.insert({ email, name, role: input.role, passwordHash: await this.hasher.hash(input.password) });
    return { ok: true };
  }

  async update(actor: AccessContext, id: number, patch: { name?: string; role?: string; active?: boolean }): Promise<Result> {
    const u = await this.users.byId(id);
    if (!u) return { ok: false, error: "Kullanıcı bulunamadı" };
    const self = u.email === actor.email;
    const next: { name?: string; role?: Role; active?: boolean } = {};
    if (patch.name !== undefined) next.name = String(patch.name).trim().slice(0, 80);
    if (patch.role !== undefined) {
      if (!isRole(patch.role)) return { ok: false, error: "Geçersiz rol" };
      if ((patch.role === "owner" || u.role === "owner") && actor.role !== "owner") return { ok: false, error: "Sahip rolünü yalnızca sahip değiştirebilir" };
      if (self && patch.role !== u.role) return { ok: false, error: "Kendi rolünü değiştiremezsin" };
      next.role = patch.role;
    }
    if (patch.active !== undefined) {
      if (self && !patch.active) return { ok: false, error: "Kendini pasif yapamazsın" };
      next.active = patch.active;
    }
    await this.users.update(id, next);
    return { ok: true };
  }

  async setPassword(actor: AccessContext, id: number, password: string): Promise<Result> {
    const u = await this.users.byId(id);
    if (!u) return { ok: false, error: "Kullanıcı bulunamadı" };
    if (u.role === "owner" && actor.role !== "owner") return { ok: false, error: "Sahibin şifresini yalnızca sahip değiştirebilir" };
    if (String(password ?? "").length < MIN_PASSWORD) return { ok: false, error: `Şifre en az ${MIN_PASSWORD} karakter olmalı` };
    await this.users.setPasswordHash(id, await this.hasher.hash(password));
    return { ok: true };
  }

  async remove(actor: AccessContext, id: number): Promise<Result> {
    const u = await this.users.byId(id);
    if (!u) return { ok: false, error: "Kullanıcı bulunamadı" };
    if (u.email === actor.email) return { ok: false, error: "Kendini silemezsin" };
    if (u.role === "owner" && actor.role !== "owner") return { ok: false, error: "Sahibi yalnızca sahip silebilir" };
    await this.users.delete(id);
    return { ok: true };
  }

  async saveMatrix(actor: AccessContext, raw: unknown): Promise<Result> {
    if (actor.role !== "owner") return { ok: false, error: "Yetkileri yalnızca sahip değiştirebilir" };
    await this.settings.putKey("access", normalizeMatrix(raw));
    return { ok: true };
  }
}
