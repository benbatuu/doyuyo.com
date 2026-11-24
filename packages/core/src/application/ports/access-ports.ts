import type { Matrix, Role } from "../../domain/access-admin.ts";
import type { AdminUserRow } from "../../domain/users-admin.ts";

export interface AdminUserRecord extends AdminUserRow {
  passwordHash: string | null;
}

export interface AdminUserRepository {
  list(): Promise<AdminUserRow[]>;
  byEmail(email: string): Promise<AdminUserRecord | null>;
  byId(id: number): Promise<AdminUserRecord | null>;
  insert(u: { email: string; name: string; role: Role; passwordHash: string }): Promise<number>;
  update(id: number, patch: { name?: string; role?: Role; active?: boolean }): Promise<void>;
  setPasswordHash(id: number, hash: string): Promise<void>;
  delete(id: number): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, stored: string): Promise<boolean>;
}

/** Generic key/value settings (keys: maintenance, access). */
export interface SettingsKvRepository {
  getKey(key: string): Promise<unknown | null>;
  putKey(key: string, value: unknown): Promise<void>;
}

export type { Matrix };
