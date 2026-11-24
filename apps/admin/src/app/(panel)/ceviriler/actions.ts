"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { container } from "@doyuyo/infrastructure";
import type { Locale } from "@doyuyo/i18n";
import { currentUser } from "@/lib/session";

export async function saveSiteText(locale: Locale, key: string, value: string) {
  if (!(await currentUser())) redirect("/login");
  const r = await container().manageSiteTexts.save(locale, key, value);
  if (r.ok) revalidatePath("/ceviriler");
  return r;
}
