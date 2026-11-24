"use server";

import { revalidatePath } from "next/cache";
import { container } from "@doyuyo/infrastructure";
import type { MaintenanceLocale, MaintenanceTexts } from "@doyuyo/core";
import { requireAccess } from "@/lib/access";

/** Texts only. On/off lives in Settings. */
export async function saveMaintenanceTexts(texts: Record<MaintenanceLocale, MaintenanceTexts>) {
  await requireAccess("maintenance");
  const r = await container().manageSettings.saveMaintenanceTexts(texts);
  if (r.ok) revalidatePath("/icerik/bakim");
  return r;
}
