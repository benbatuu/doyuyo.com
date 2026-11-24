import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import type { PasswordHasher } from "@doyuyo/core";

const KEY_LEN = 64;
const scrypt = (p: string, salt: Buffer, len: number) =>
  new Promise<Buffer>((resolve, reject) => _scrypt(p, salt, len, (e, k) => (e ? reject(e) : resolve(k))));

/** scrypt with a random salt. Format: scrypt$<salt b64>$<key b64>. */
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string) {
    const salt = randomBytes(16);
    const key = await scrypt(password, salt, KEY_LEN);
    return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
  }

  async verify(password: string, stored: string) {
    const [algo, s, k] = stored.split("$");
    if (algo !== "scrypt" || !s || !k) return false;
    const expected = Buffer.from(k, "base64");
    const got = await scrypt(password, Buffer.from(s, "base64"), expected.length);
    return expected.length === got.length && timingSafeEqual(expected, got);
  }
}
