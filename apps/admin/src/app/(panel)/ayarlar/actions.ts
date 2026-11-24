"use server";

import { revalidatePath } from "next/cache";
import { container } from "@doyuyo/infrastructure";
import type { ContactSettings } from "@doyuyo/core";
import { requireAccess } from "@/lib/access";

export async function saveContact(input: ContactSettings) {
  await requireAccess("settings");
  const r = await container().manageSettings.saveContact(input);
  if (r.ok) revalidatePath("/ayarlar");
  return r;
}

export async function setMaintenance(enabled: boolean) {
  await requireAccess("maintenance");
  const r = await container().manageSettings.setMaintenanceEnabled(enabled);
  if (r.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/icerik");
    revalidatePath("/icerik/bakim");
  }
  return r;
}
