import type { Locale } from "@doyuyo/i18n";
import { SEO_KINDS, SEO_PAGE_SIZE, type SeoKind, type SeoQuery, type SeoTexts } from "../../domain/seo-admin.ts";
import type { SeoAdminRepository } from "../ports/repositories.ts";

const LOCALES: Locale[] = ["tr", "en"];
const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

type Result = { ok: true; texts: SeoTexts } | { ok: false; error: string };

/** Panel: search titles and descriptions of every public page. URLs never change from here. */
export class ManageSeo {
  constructor(private readonly repo: SeoAdminRepository) {}

  /** One page of rows. Filtering and paging run in the database, so the list stays fast. */
  list(input: { locale: Locale; kind?: string; issues?: boolean; q?: string; page?: number }) {
    const locale: Locale = LOCALES.includes(input.locale) ? input.locale : "tr";
    const kind = (SEO_KINDS as readonly string[]).includes(input.kind ?? "") ? (input.kind as SeoKind) : undefined;
    const page = Math.max(1, Math.floor(Number(input.page)) || 1);
    const q: SeoQuery = { locale, kind, issues: !!input.issues, q: clean(input.q, 100), page, pageSize: SEO_PAGE_SIZE };
    return this.repo.listPage(q);
  }

  async save(kind: SeoKind, id: number, locale: Locale, input: SeoTexts): Promise<Result> {
    if (!(SEO_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "Geçersiz tür" };
    if (!LOCALES.includes(locale)) return { ok: false, error: "Geçersiz dil" };
    if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Geçersiz kayıt" };
    const texts = { seoTitle: clean(input.seoTitle, 120), seoDescription: clean(input.seoDescription, 320) };
    const done = await this.repo.saveTexts(kind, id, locale, texts);
    return done ? { ok: true, texts } : { ok: false, error: "Bu dilde kayıt yok" };
  }
}
