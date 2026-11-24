"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { container } from "@doyuyo/infrastructure";
import { MEDIA_USAGES, type MediaItem, type MediaKind, type MediaTexts, type MediaUsage } from "@doyuyo/core";
import { isPublishedLocale } from "@doyuyo/i18n";
import { unlink } from "node:fs/promises";
import { currentUser } from "@/lib/session";
import { uploadFileOf } from "@/lib/upload-dir";
import type { MediaDTO } from "@/components/media/types";

const USAGE_LABEL: Record<MediaUsage, string> = { product: "Ürünler", category: "Kategoriler", branch: "Şubeler", page: "Sayfalar", brand: "Marka" };

/**
 * Deletes a file the site does not use. Panel uploads are also removed from disk;
 * imported legacy files only lose their library record (their copies are managed by `pnpm media:link`).
 */
export async function deleteMedia(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  await guard();
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Geçersiz dosya" };
  const r = await container().manageMedia.delete(id);
  if (!r.ok) return { ok: false, error: `Bu dosya sitede kullanılıyor (${r.usedIn.map((u) => USAGE_LABEL[u]).join(", ")}). Önce oradan kaldır.` };
  const file = uploadFileOf(r.item.path);
  if (file) await unlink(file).catch(() => undefined);
  revalidatePath("/medya");
  return { ok: true };
}

async function guard() {
  if (!(await currentUser())) redirect("/login");
}

const KINDS: MediaKind[] = ["image", "video", "document", "other"];

const toDTO = async (m: MediaItem): Promise<MediaDTO> => ({ ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() });

export async function listMedia(input: { kind?: string; usage?: string; q?: string; offset?: number; limit?: number }) {
  await guard();
  const kind = KINDS.includes(input.kind as MediaKind) ? (input.kind as MediaKind) : undefined;
  const usage = input.usage === "unused" || MEDIA_USAGES.includes(input.usage as MediaUsage) ? (input.usage as MediaUsage | "unused") : undefined;
  const { items, total } = await container().manageMedia.list({
    kind,
    usage,
    q: String(input.q ?? "").slice(0, 80) || undefined,
    limit: Number(input.limit) || 48,
    offset: Number(input.offset) || 0,
  });
  return { items: await Promise.all(items.map(toDTO)), total };
}

export async function saveMediaTexts(id: number, texts: Record<string, MediaTexts>) {
  await guard();
  if (!Number.isInteger(id) || id <= 0) throw new Error("Geçersiz dosya");
  const clean = Object.fromEntries(Object.entries(texts).filter(([l]) => isPublishedLocale(l)));
  await container().manageMedia.saveTexts(id, clean);
  revalidatePath("/medya");
  const item = await container().manageMedia.get(id);
  return item ? toDTO(item) : null;
}

export async function setMediaFolder(id: number, folder: string | null) {
  await guard();
  if (!Number.isInteger(id) || id <= 0) throw new Error("Geçersiz dosya");
  await container().manageMedia.setFolder(id, folder && MEDIA_USAGES.includes(folder as MediaUsage) ? (folder as MediaUsage) : null);
  revalidatePath("/medya");
  const item = await container().manageMedia.get(id);
  return item ? toDTO(item) : null;
}
