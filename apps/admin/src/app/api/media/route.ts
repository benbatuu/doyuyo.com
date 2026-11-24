import { createHash } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import { NextResponse } from "next/server";
import { container } from "@doyuyo/infrastructure";
import { isMediaUsage, type MediaUsage } from "@doyuyo/core";
import { slugify } from "@doyuyo/i18n";
import { currentUser } from "@/lib/session";
import { UPLOAD_ACCEPT, UPLOAD_MAX_BYTES } from "@/lib/media";
import { UPLOAD_DIR } from "@/lib/upload-dir";

export const runtime = "nodejs";

const ALLOWED = new Set(UPLOAD_ACCEPT.split(","));
const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "application/pdf": ".pdf",
};

/** Quick magic-byte check so a renamed file can't pass as an image. */
function looksLike(mime: string, b: Buffer) {
  const hex = b.subarray(0, 12).toString("hex");
  const ascii = b.subarray(0, 512).toString("utf8");
  switch (mime) {
    case "image/jpeg":
      return hex.startsWith("ffd8ff");
    case "image/png":
      return hex.startsWith("89504e47");
    case "image/gif":
      return hex.startsWith("47494638");
    case "image/webp":
      return hex.startsWith("52494646") && b.subarray(8, 12).toString() === "WEBP";
    case "image/avif":
      return b.subarray(4, 12).toString().startsWith("ftypavi");
    case "video/mp4":
      return b.subarray(4, 8).toString() === "ftyp";
    case "video/webm":
      return hex.startsWith("1a45dfa3");
    case "application/pdf":
      return ascii.startsWith("%PDF");
    case "image/svg+xml":
      // SVG can carry script: refuse anything active.
      return /<svg[\s>]/i.test(b.toString("utf8")) && !/<script|on\w+\s*=|javascript:|<foreignObject/i.test(b.toString("utf8"));
    default:
      return false;
  }
}

export async function POST(req: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Dosya yok" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Bu dosya türü desteklenmiyor" }, { status: 415 });
  if (file.size > UPLOAD_MAX_BYTES) return NextResponse.json({ error: "Dosya 50 MB'tan büyük" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (!looksLike(file.type, buf)) return NextResponse.json({ error: "Dosya içeriği türüyle uyuşmuyor" }, { status: 415 });

  const sha256 = createHash("sha256").update(buf).digest("hex");
  const now = new Date();
  const dir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const base = slugify(file.name.replace(extname(file.name), "")).slice(0, 80) || "dosya";
  let name = `${base}${EXT[file.type]}`;
  if (existsSync(join(UPLOAD_DIR, dir, name))) name = `${base}-${sha256.slice(0, 6)}${EXT[file.type]}`;

  const num = (v: FormDataEntryValue | null) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) : null);
  // Write first, then register; an identical earlier upload wins and our copy is removed.
  const target = join(UPLOAD_DIR, dir, name);
  await mkdir(join(UPLOAD_DIR, dir), { recursive: true });
  await writeFile(target, buf);
  try {
    const item = await container().manageMedia.register({
      path: `/uploads/${dir}/${name}`,
      mime: file.type,
      width: num(form.get("width")),
      height: num(form.get("height")),
      bytes: file.size,
      sha256,
      originalName: file.name.slice(0, 200),
      folder: isMediaUsage(form.get("folder")) ? (form.get("folder") as MediaUsage) : null,
    });
    if (item.path !== `/uploads/${dir}/${name}`) await unlink(target);
    return NextResponse.json({ item, duplicate: item.path !== `/uploads/${dir}/${name}` });
  } catch (e) {
    await unlink(target).catch(() => undefined);
    throw e;
  }
}
