import type { Perms, Role } from "./access-admin.ts";

export interface AdminUserRow {
  id: number;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  /** The owner account from env (ADMIN_EMAIL). Not editable in the panel. */
  builtin: boolean;
  createdAt: string;
}

/** Who is signed in, and what they may do. */
export interface AccessContext {
  email: string;
  name: string;
  role: Role;
  perms: Perms;
}

export const MIN_PASSWORD = 10;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
