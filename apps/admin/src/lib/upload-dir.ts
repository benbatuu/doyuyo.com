import "server-only";
import { join, resolve, sep } from "node:path";

/**
 * Where panel uploads are stored. Default: the website's public folder (served at /uploads/...).
 * Set MEDIA_UPLOAD_DIR in production to a shared disk / mounted bucket that the website serves.
 */
export const UPLOAD_DIR = resolve(process.env.MEDIA_UPLOAD_DIR ?? join(process.cwd(), "../web/public/uploads"));

/** Disk path for a "/uploads/..." media path, or null if it is not a panel upload (or tries to escape). */
export function uploadFileOf(mediaPath: string): string | null {
  if (!mediaPath.startsWith("/uploads/")) return null;
  const full = resolve(UPLOAD_DIR, mediaPath.slice("/uploads/".length));
  return full.startsWith(UPLOAD_DIR + sep) ? full : null;
}
