import "server-only";
import { redirect } from "next/navigation";
import { container } from "@doyuyo/infrastructure";
import type { AccessContext, Resource } from "@doyuyo/core";
import { currentUser } from "./session";

/** Who is signed in and what they may open. null when signed out or the account is disabled. */
export async function accessFor(): Promise<AccessContext | null> {
  const u = await currentUser();
  return u ? container().manageUsers.context(u.email) : null;
}

/** Page guard: signed out -> login, no permission -> dashboard. */
export async function requireAccess(resource: Resource): Promise<AccessContext> {
  const ctx = await accessFor();
  if (!ctx) redirect("/login");
  if (!ctx.perms[resource]) redirect("/?yetki=yok");
  return ctx;
}
