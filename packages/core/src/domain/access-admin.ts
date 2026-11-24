/** Panel roles. owner is always full access and cannot be restricted. */
export const ROLES = ["owner", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABEL: Record<Role, string> = { owner: "Sahip", editor: "Editör", viewer: "Görüntüleyici" };

/** Panel areas a role can be allowed into. */
export const RESOURCES = [
  { id: "content", label: "İçerik ve menüler" },
  { id: "catalog", label: "Ürünler ve alerjenler" },
  { id: "branches", label: "Şubeler" },
  { id: "media", label: "Medya" },
  { id: "forms", label: "Formlar" },
  { id: "seo", label: "SEO" },
  { id: "translations", label: "Çeviriler" },
  { id: "settings", label: "Site ayarları ve iletişim" },
  { id: "maintenance", label: "Bakım modu" },
  { id: "users", label: "Kullanıcılar ve roller" },
] as const;
export type Resource = (typeof RESOURCES)[number]["id"];
export type Perms = Record<Resource, boolean>;
export type Matrix = Record<Role, Perms>;

const all = (v: boolean): Perms => Object.fromEntries(RESOURCES.map((r) => [r.id, v])) as Perms;

export const DEFAULT_MATRIX: Matrix = {
  owner: all(true),
  editor: { ...all(true), maintenance: false, users: false },
  viewer: { ...all(false), forms: true, branches: true },
};

/** Stored JSON -> full matrix. Missing or non-boolean entries fall back to defaults; owner stays full. */
export function normalizeMatrix(raw: unknown): Matrix {
  const pick = (v: unknown, base: Perms): Perms => {
    const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
    return Object.fromEntries(RESOURCES.map((r) => [r.id, typeof o[r.id] === "boolean" ? o[r.id] : base[r.id]])) as Perms;
  };
  const m = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { owner: all(true), editor: pick(m.editor, DEFAULT_MATRIX.editor), viewer: pick(m.viewer, DEFAULT_MATRIX.viewer) };
}

export function permsFor(role: Role, matrix: Matrix): Perms {
  return role === "owner" ? all(true) : matrix[role];
}
