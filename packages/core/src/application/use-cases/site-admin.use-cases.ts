import type { Locale } from "@doyuyo/i18n";
import { isSiteTextKey, siteTextPath, siteTextTable } from "../../domain/site-admin.ts";
import type { SiteAdminRepository } from "../ports/repositories.ts";

const LOCALES: Locale[] = ["tr", "en"];

/** Panel: site texts (cookie, footer, menu labels…) per language. */
export class ManageSiteTexts {
  constructor(private readonly repo: SiteAdminRepository) {}

  async load() {
    const [tr, en] = await Promise.all([this.repo.getSiteRaw("tr"), this.repo.getSiteRaw("en")]);
    return siteTextTable(tr, en);
  }

  async save(locale: Locale, key: string, value: string): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
    if (!LOCALES.includes(locale)) return { ok: false, error: "Geçersiz dil" };
    if (!isSiteTextKey(key)) return { ok: false, error: "Bu metin panelden düzenlenemez" };
    const v = String(value ?? "").trim().slice(0, 2000);
    if (!v) return { ok: false, error: "Boş bırakılamaz" };
    await this.repo.setSiteText(locale, siteTextPath(key), v);
    return { ok: true, value: v };
  }
}
