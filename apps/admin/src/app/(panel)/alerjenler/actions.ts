"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { container } from "@doyuyo/infrastructure";
import type { AdminNutrition } from "@doyuyo/core";
import { currentUser } from "@/lib/session";

/** Saves allergens and 100 g nutrition for one product. Nothing else on the product changes. */
export async function saveAllergens(id: number, allergens: string[], nutrition: AdminNutrition | null) {
  if (!(await currentUser())) redirect("/login");
  if (!Number.isInteger(id) || id <= 0) return { ok: false as const, error: "Geçersiz ürün" };
  const r = await container().manageCatalog.saveAllergens(id, { allergens: allergens.map(String), nutrition });
  if (r.ok) revalidatePath("/alerjenler");
  return r;
}
