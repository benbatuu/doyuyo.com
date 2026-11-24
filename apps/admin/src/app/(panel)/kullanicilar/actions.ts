"use server";

import { revalidatePath } from "next/cache";
import { container } from "@doyuyo/infrastructure";
import type { Matrix } from "@doyuyo/core";
import { requireAccess } from "@/lib/access";

export async function createUser(input: { email: string; name: string; role: string; password: string }) {
  const actor = await requireAccess("users");
  const r = await container().manageUsers.create(actor, input);
  if (r.ok) revalidatePath("/kullanicilar");
  return r;
}

export async function updateUser(id: number, patch: { name?: string; role?: string; active?: boolean }) {
  const actor = await requireAccess("users");
  const r = await container().manageUsers.update(actor, id, patch);
  if (r.ok) revalidatePath("/kullanicilar");
  return r;
}

export async function setUserPassword(id: number, password: string) {
  const actor = await requireAccess("users");
  return container().manageUsers.setPassword(actor, id, password);
}

export async function removeUser(id: number) {
  const actor = await requireAccess("users");
  const r = await container().manageUsers.remove(actor, id);
  if (r.ok) revalidatePath("/kullanicilar");
  return r;
}

export async function saveAccess(matrix: Matrix) {
  const actor = await requireAccess("users");
  const r = await container().manageUsers.saveMatrix(actor, matrix);
  if (r.ok) revalidatePath("/kullanicilar");
  return r;
}
