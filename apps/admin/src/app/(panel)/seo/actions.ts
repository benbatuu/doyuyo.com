"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { container } from "@doyuyo/infrastructure";
import type { SeoKind, SeoTexts } from "@doyuyo/core";
import type { Locale } from "@doyuyo/i18n";
import { currentUser } from "@/lib/session";

export async function saveSeo(kind: SeoKind, id: number, locale: Locale, texts: SeoTexts) {
  if (!(await currentUser())) redirect("/login");
  const r = await container().manageSeo.save(kind, id, locale, texts);
  if (r.ok) revalidatePath("/seo");
  return r;
}
