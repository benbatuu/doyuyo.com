import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Temporary single-account session (env credentials, HMAC-signed cookie).
 * To be replaced by the users table (Argon2id + TOTP 2FA + roles) from PLAN.md §7.3–7.4.
 */
const COOKIE = "doyuyo_admin";
const MAX_AGE = 60 * 60 * 8; // 8 h

const secret = () => {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters");
  return s;
};
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");
const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function verifyPassword(email: string, password: string) {
  const e = process.env.ADMIN_EMAIL ?? "";
  const p = process.env.ADMIN_PASSWORD ?? "";
  return !!e && !!p && safeEq(email.trim().toLowerCase(), e.toLowerCase()) && safeEq(password, p);
}

export function sessionToken(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readToken(token: string | undefined): { email: string } | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEq(sign(payload), sig)) return null;
  try {
    const v = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email: string; exp: number };
    return v.exp > Date.now() ? { email: v.email } : null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = { name: COOKIE, maxAge: MAX_AGE };
