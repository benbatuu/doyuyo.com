import { isLocale, type Locale } from "@doyuyo/i18n";
import type { EntityRef } from "../../domain/content.ts";
import type { RouteRepository } from "../ports/repositories.ts";

export type Resolution =
  | { kind: "entity"; locale: Locale; entity: EntityRef }
  | { kind: "redirect"; to: string; permanent: boolean }
  | { kind: "gone" }
  | { kind: "not-found" };

/** Normalize an incoming path: decode, lowercase, no trailing slash. */
export function normalizePath(path: string): string {
  let p = path;
  try {
    p = decodeURIComponent(p);
  } catch {}
  p = p.split("?")[0]!.split("#")[0]!.replace(/\/+$/, "") || "/";
  return p;
}

/**
 * One request path -> exactly one outcome.
 * Order: canonical route, then redirect table (legacy URLs, renamed slugs), then a
 * case/slash-normalized retry that redirects, else not found.
 */
export class ResolvePath {
  constructor(private readonly routes: RouteRepository) {}

  async execute(rawPath: string): Promise<Resolution> {
    const path = normalizePath(rawPath);
    const hit = await this.routes.findByPath(path);
    if (hit) return { kind: "entity", locale: hit.locale, entity: { type: hit.type, id: hit.id } };

    const redirect = await this.routes.findRedirect(path);
    if (redirect) {
      if (redirect.status === 410) return { kind: "gone" };
      return { kind: "redirect", to: redirect.to, permanent: redirect.status === 301 };
    }

    const lower = path.toLocaleLowerCase("tr");
    if (lower !== path) {
      const again = await this.execute(lower);
      if (again.kind === "entity") return { kind: "redirect", to: lower, permanent: true };
      if (again.kind === "redirect") return again;
    }
    return { kind: "not-found" };
  }

  static localeOf(path: string): Locale | null {
    const seg = normalizePath(path).split("/")[1];
    return isLocale(seg) ? seg : null;
  }
}
