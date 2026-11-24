"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { container } from "@doyuyo/infrastructure";
import type { AdminBranchCreate, AdminBranchPatch, BranchStatus } from "@doyuyo/core";
import { currentUser } from "@/lib/session";

async function guard() {
  if (!(await currentUser())) redirect("/login");
}
const idOk = (n: number) => Number.isInteger(n) && n > 0;

export async function getBranch(id: number) {
  await guard();
  if (!idOk(id)) return null;
  return container().manageBranches.branch(id);
}

export async function saveBranch(id: number, patch: AdminBranchPatch) {
  await guard();
  if (!idOk(id)) return { ok: false as const, error: "Geçersiz şube" };
  const r = await container().manageBranches.saveBranch(id, patch);
  if (r.ok) revalidatePath("/subeler");
  return r;
}

export async function setBranchStatus(id: number, status: BranchStatus) {
  await guard();
  if (!idOk(id)) return { ok: false as const, error: "Geçersiz şube" };
  const r = await container().manageBranches.setStatus(id, status);
  if (r.ok) revalidatePath("/subeler");
  return r;
}

export async function createBranch(input: AdminBranchCreate) {
  await guard();
  const r = await container().manageBranches.createBranch(input);
  if (r.ok) revalidatePath("/subeler");
  return r;
}

export async function deleteBranch(id: number) {
  await guard();
  if (!idOk(id)) return { ok: false as const, error: "Geçersiz şube" };
  const r = await container().manageBranches.deleteBranch(id);
  if (r.ok) revalidatePath("/subeler");
  return r;
}
