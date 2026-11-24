"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { container } from "@doyuyo/infrastructure";
import type { AdminProductPatch } from "@doyuyo/core";
import { currentUser } from "@/lib/session";

async function guard() {
  if (!(await currentUser())) redirect("/login");
}
const idOk = (n: number) => Number.isInteger(n) && n > 0;
const bust = () => {
  revalidatePath("/urunler");
  revalidatePath("/menu", "layout");
};

export async function listProducts(input: { categoryId?: number | "none"; search?: string; offset?: number; limit?: number }) {
  await guard();
  const categoryId = input.categoryId === "none" ? "none" : idOk(Number(input.categoryId)) ? Number(input.categoryId) : undefined;
  return container().manageCatalog.products({ categoryId, search: String(input.search ?? "").slice(0, 80) || undefined, limit: Number(input.limit) || 60, offset: Number(input.offset) || 0 });
}

export async function getProduct(id: number) {
  await guard();
  if (!idOk(id)) return null;
  return container().manageCatalog.product(id);
}

export async function saveProduct(id: number, patch: AdminProductPatch) {
  await guard();
  if (!idOk(id)) return { ok: false as const, error: "Geçersiz ürün" };
  const r = await container().manageCatalog.saveProduct(id, patch);
  if (r.ok) bust();
  return r;
}

export async function setCategoryPublished(id: number, published: boolean) {
  await guard();
  if (!idOk(id)) return;
  await container().manageCatalog.setCategoryPublished(id, !!published);
  bust();
}

export async function reorderProducts(categoryId: number, productIds: number[]) {
  await guard();
  if (!idOk(categoryId)) return;
  await container().manageCatalog.reorderProducts(categoryId, productIds.filter(idOk));
  bust();
}

export async function reorderCategories(categoryIds: number[]) {
  await guard();
  await container().manageCatalog.reorderCategories(categoryIds.filter(idOk));
  bust();
}
