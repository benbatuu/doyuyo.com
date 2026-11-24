import { DEFAULT_MAINTENANCE, DEFAULT_MAINTENANCE_TEXTS, SOCIAL_NETWORKS, telHref, type ContactSettings, type MaintenanceLocale, type MaintenanceSettings, type MaintenanceTexts, type SocialNetwork } from "../../domain/settings-admin.ts";
import { EMAIL_RE } from "../../domain/users-admin.ts";
import type { SettingsKvRepository } from "../ports/access-ports.ts";
import type { SiteAdminRepository } from "../ports/repositories.ts";

type Result = { ok: true } | { ok: false; error: string };
const LOCALES: MaintenanceLocale[] = ["tr", "en"];
const txt = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Panel: maintenance page and site contact data. Values flow into the public site. */
export class ManageSettings {
  constructor(
    private readonly kv: SettingsKvRepository,
    private readonly site: SiteAdminRepository,
  ) {}

  /** Stored value may be the old single-language shape ({enabled,title,message}); it becomes the TR text. */
  async getMaintenance(): Promise<MaintenanceSettings> {
    const v = (await this.kv.getKey("maintenance")) as (Partial<MaintenanceSettings> & { title?: string; message?: string }) | null;
    if (!v) return DEFAULT_MAINTENANCE;
    const legacy = v.title !== undefined || v.message !== undefined ? { title: v.title ?? "", message: v.message ?? "" } : undefined;
    const texts = { ...DEFAULT_MAINTENANCE_TEXTS, ...(v.texts ?? {}) } as Record<MaintenanceLocale, MaintenanceTexts>;
    if (legacy && !v.texts) texts.tr = { ...DEFAULT_MAINTENANCE_TEXTS.tr, ...legacy };
    return { enabled: !!v.enabled, texts };
  }

  async saveMaintenance(input: { enabled: boolean; texts: Record<MaintenanceLocale, MaintenanceTexts> }): Promise<Result> {
    const texts = {} as Record<MaintenanceLocale, MaintenanceTexts>;
    for (const l of LOCALES) {
      const title = txt(input.texts?.[l]?.title, 120);
      const message = txt(input.texts?.[l]?.message, 400);
      if (input.enabled && !title) return { ok: false, error: `${l.toUpperCase()}: bakım başlığı boş olamaz` };
      texts[l] = { title: title || DEFAULT_MAINTENANCE_TEXTS[l].title, message: message || DEFAULT_MAINTENANCE_TEXTS[l].message };
    }
    await this.kv.putKey("maintenance", { enabled: !!input.enabled, texts });
    return { ok: true };
  }

  /** On/off switch (Settings). Texts stay as they are. */
  async setMaintenanceEnabled(enabled: boolean): Promise<Result> {
    const cur = await this.getMaintenance();
    return this.saveMaintenance({ enabled: !!enabled, texts: cur.texts });
  }

  /** Page texts (Pages > Maintenance). The on/off state stays as it is. */
  async saveMaintenanceTexts(texts: Record<MaintenanceLocale, MaintenanceTexts>): Promise<Result> {
    const cur = await this.getMaintenance();
    return this.saveMaintenance({ enabled: cur.enabled, texts });
  }

  async getContact(): Promise<ContactSettings> {
    const [tr, en] = await Promise.all([this.site.getSiteRaw("tr"), this.site.getSiteRaw("en")]);
    return {
      email: tr.email ?? "",
      phoneLabel: tr.phone?.label ?? "",
      addressTr: tr.headOffice?.address ?? "",
      addressEn: en.headOffice?.address ?? "",
      mapsUrl: tr.headOffice?.mapsUrl ?? "",
      social: Array.isArray(tr.social) ? tr.social.filter((s: any) => SOCIAL_NETWORKS.includes(s.network)) : [],
    };
  }

  async saveContact(input: ContactSettings): Promise<Result> {
    const email = txt(input.email, 120);
    const phoneLabel = txt(input.phoneLabel, 40);
    const mapsUrl = txt(input.mapsUrl, 500);
    if (email && !EMAIL_RE.test(email)) return { ok: false, error: "E-posta adresi geçersiz" };
    if (phoneLabel && telHref(phoneLabel).length < 6) return { ok: false, error: "Telefon numarası geçersiz" };
    if (mapsUrl && !/^https:\/\//.test(mapsUrl)) return { ok: false, error: "Harita bağlantısı https:// ile başlamalı" };
    const social: { network: SocialNetwork; href: string }[] = [];
    for (const s of input.social ?? []) {
      const href = txt(s.href, 300);
      if (!href) continue;
      if (!/^https:\/\//.test(href)) return { ok: false, error: "Sosyal medya bağlantıları https:// ile başlamalı" };
      if (!SOCIAL_NETWORKS.includes(s.network)) return { ok: false, error: "Geçersiz sosyal medya" };
      social.push({ network: s.network, href });
    }
    const addr: Record<"tr" | "en", string> = { tr: txt(input.addressTr, 400), en: txt(input.addressEn, 400) };
    for (const l of LOCALES) {
      await this.site.patchSite(l, {
        email,
        phone: phoneLabel ? { label: phoneLabel, href: telHref(phoneLabel) } : null,
        headOffice: { address: addr[l], mapsUrl: mapsUrl || null },
        social,
      });
    }
    return { ok: true };
  }
}
