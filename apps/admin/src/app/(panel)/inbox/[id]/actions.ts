"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { container } from "@doyuyo/infrastructure";
import { SUBMISSION_STATUSES, type SubmissionStatus } from "@doyuyo/core";
import { currentUser } from "@/lib/session";

async function guard(id: number) {
  if (!(await currentUser())) redirect("/login");
  if (!Number.isInteger(id) || id <= 0) throw new Error("Geçersiz kayıt");
}

/** Saves the status at once (no submit button). */
export async function updateStatus(id: number, status: SubmissionStatus) {
  await guard(id);
  if (!(SUBMISSION_STATUSES as readonly string[]).includes(status)) throw new Error("Geçersiz durum");
  await container().updateSubmission.execute(id, { status });
  revalidatePath(`/inbox/${id}`);
  revalidatePath("/inbox");
  revalidatePath("/", "layout"); // sidebar counts
}

export async function updateNotes(id: number, notes: string) {
  await guard(id);
  await container().updateSubmission.execute(id, { notes: String(notes ?? "") });
  revalidatePath(`/inbox/${id}`);
}
