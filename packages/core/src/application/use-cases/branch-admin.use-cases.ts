import type { Locale } from "@doyuyo/i18n";
import { BRANCH_STATUSES, type AdminBranchCreate, type AdminBranchPatch, type AdminBranchTexts, type BranchStatus } from "../../domain/branch-admin.ts";
import type { BranchAdminRepository } from "../ports/repositories.ts";

const LOCALES: Locale[] = ["tr", "en"];
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const opt = (v: unknown, max: number) => str(v, max) || null;
const isStatus = (s: unknown): s is BranchStatus => (BRANCH_STATUSES as readonly unknown[]).includes(s);

type Result = { ok: true } | { ok: false; error: string };
type Clean = { ok: true; patch: AdminBranchPatch } | { ok: false; error: string };

/** Panel: branch editing. Rules live here, not in the UI. URLs (slugs) never change from here. */
export class ManageBranches {
  constructor(private readonly repo: BranchAdminRepository) {}

  cities() {
    return this.repo.listCities();
  }

  branches() {
    return this.repo.listBranches();
  }

  branch(id: number) {
    return this.repo.getBranch(id);
  }

  async setStatus(id: number, status: BranchStatus): Promise<Result> {
    if (!isStatus(status)) return { ok: false, error: "Geçersiz durum" };
    if (!(await this.repo.getBranch(id))) return { ok: false, error: "Şube bulunamadı" };
    await this.repo.setStatus(id, status);
    return { ok: true };
  }

  /** Permanent. Only closed branches can go, so a live one is never deleted by a slip of the mouse. */
  async deleteBranch(id: number): Promise<Result> {
    const b = await this.repo.getBranch(id);
    if (!b) return { ok: false, error: "Şube bulunamadı" };
    if (b.status !== "closed") return { ok: false, error: "Önce şubeyi “Kapalı” yap, sonra sil" };
    await this.repo.deleteBranch(id);
    return { ok: true };
  }

  async saveBranch(id: number, input: AdminBranchPatch): Promise<Result> {
    if (!(await this.repo.getBranch(id))) return { ok: false, error: "Şube bulunamadı" };
    const c = this.clean(input);
    if (!c.ok) return c;
    await this.repo.saveBranch(id, c.patch);
    return { ok: true };
  }

  /** New branch. Starts as "closed" unless the caller says otherwise, so an unfinished branch never goes live. */
  async createBranch(input: AdminBranchCreate): Promise<{ ok: true; id: number; key: string } | { ok: false; error: string }> {
    const cities = await this.repo.listCities();
    if (!cities.some((x) => x.id === input.cityId)) return { ok: false, error: "Geçersiz şehir" };
    const c = this.clean(input);
    if (!c.ok) return c;
    const r = await this.repo.createBranch({ ...c.patch, cityId: input.cityId });
    return r;
  }

  private clean(input: AdminBranchPatch): Clean {
    if (!isStatus(input.status)) return { ok: false, error: "Geçersiz durum" };

    const lat = input.lat === null ? null : Number(input.lat);
    const lng = input.lng === null ? null : Number(input.lng);
    if ((lat === null) !== (lng === null)) return { ok: false, error: "Enlem ve boylam birlikte girilmeli" };
    if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) return { ok: false, error: "Enlem geçersiz" };
    if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) return { ok: false, error: "Boylam geçersiz" };

    const mapsUrl = opt(input.mapsUrl, 500);
    if (mapsUrl && !/^https:\/\//i.test(mapsUrl)) return { ok: false, error: "Harita linki https:// ile başlamalı" };
    const phone = opt(input.phone, 30);
    if (phone && !/^[+\d\s()-]{7,30}$/.test(phone)) return { ok: false, error: "Telefon geçersiz" };

    const translations: AdminBranchPatch["translations"] = {};
    for (const l of LOCALES) {
      const t = input.translations[l];
      if (!t) continue;
      const clean: AdminBranchTexts = {
        name: str(t.name, 120),
        address: str(t.address, 400),
        hours: (Array.isArray(t.hours) ? t.hours : [])
          .map((h) => ({ day: str(h?.day, 40), time: str(h?.time, 40) }))
          .filter((h) => h.day || h.time)
          .slice(0, 10),
      };
      // An empty EN block means "no English yet": skip it rather than store blanks.
      if (l !== "tr" && !clean.name && !clean.address && !clean.hours.length) continue;
      if (!clean.name) return { ok: false, error: l === "tr" ? "Türkçe ad boş olamaz" : "İngilizce ad boş olamaz" };
      if (clean.hours.some((h) => !h.day || !h.time)) return { ok: false, error: "Çalışma saatlerinde gün ve saat birlikte girilmeli" };
      translations[l] = clean;
    }
    if (!translations.tr) return { ok: false, error: "Türkçe ad boş olamaz" };

    return {
      ok: true,
      patch: {
        status: input.status,
        cityId: input.cityId,
        district: opt(input.district, 80),
        phone,
        lat,
        lng,
        mapsUrl,
        imageId: Number.isInteger(input.imageId) && input.imageId! > 0 ? input.imageId : null,
        translations,
      },
    };
  }
}
