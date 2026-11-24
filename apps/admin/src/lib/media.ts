/**
 * Media files are served by the website, so the panel prefixes site-relative paths with its URL.
 * NEXT_PUBLIC_MEDIA_BASE_URL wins; in dev we use the local web app (the public domain may still be the old site).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:3000" : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"))
).replace(/\/$/, "");

export const mediaUrl = (path: string | null | undefined) => (!path ? "" : /^https?:\/\//i.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);

export function fmtBytes(n: number) {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

/** What the panel accepts for upload (also checked on the server). */
export const UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml,video/mp4,video/webm,application/pdf";
export const UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
