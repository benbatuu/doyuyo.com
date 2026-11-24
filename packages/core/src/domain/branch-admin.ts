import type { Locale } from "@doyuyo/i18n";
import type { OpeningHours } from "./branch.ts";

/** open = on the site, soon = coming soon (hidden), closed = hidden. */
export const BRANCH_STATUSES = ["open", "soon", "closed"] as const;
export type BranchStatus = (typeof BRANCH_STATUSES)[number];

export interface AdminCity {
  id: number;
  key: string;
  name: string;
  country: string;
  branchCount: number;
}

/** Branch row for the panel list. */
export interface AdminBranchRow {
  id: number;
  key: string;
  name: string;
  address: string;
  district: string | null;
  cityId: number;
  cityName: string;
  country: string;
  status: BranchStatus;
  hasGeo: boolean;
  hasEn: boolean;
  phone: string | null;
  imagePath: string | null;
  hours: OpeningHours[];
  updatedAt: string;
}

export interface AdminBranchTexts {
  name: string;
  address: string;
  hours: OpeningHours[];
}

export interface AdminBranchPatch {
  status: BranchStatus;
  /** Only read on create; the panel never moves a branch between cities. */
  cityId?: number;
  district: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  mapsUrl: string | null;
  imageId: number | null;
  translations: Partial<Record<Locale, AdminBranchTexts>>;
}

export interface AdminBranchDetail extends Omit<AdminBranchPatch, "cityId"> {
  cityId: number;
  id: number;
  key: string;
  cityName: string;
  imagePath: string | null;
  /** Public paths per locale (slug never changes from the panel). */
  paths: Partial<Record<Locale, string>>;
}

export type AdminBranchCreate = AdminBranchPatch & { cityId: number };
