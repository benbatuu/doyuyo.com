import type { Alternates, ContentNode, Media, Seo } from "./content.ts";

export interface OpeningHours {
  /** Label as published, e.g. "Tüm Hafta" / "All Week". */
  day: string;
  /** "10:00 - 22:00" */
  time: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  precise: boolean;
}

export interface CitySummary {
  id: number;
  key: string;
  name: string;
  path: string;
  branchCount: number;
  country: string;
}

export interface BranchSummary {
  id: number;
  key: string;
  /** "turkiye" | "uae" (cities.country). */
  country: string;
  name: string;
  path: string;
  address: string;
  hours: OpeningHours[];
  city: { name: string; path: string } | null;
  district: string | null;
  geo: GeoPoint | null;
  mapsUrl: string | null;
  image: Media | null;
}

export interface BranchDetail extends BranchSummary {
  description: ContentNode[];
  nearby: BranchSummary[];
  seo: Seo;
  alternates: Alternates;
}

export interface CityDetail extends CitySummary {
  branches: BranchSummary[];
  seo: Seo;
  alternates: Alternates;
}

/**
 * Parses "10:00 - 22:00" style ranges. Returns null when the text is not a simple range,
 * so callers never claim "open now" from text they cannot read.
 */
export function parseTimeRange(time: string): { open: number; close: number } | null {
  const m = time.match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const open = +m[1]! * 60 + +m[2]!;
  let close = +m[3]! * 60 + +m[4]!;
  if (close <= open) close += 24 * 60; // past midnight
  return { open, close };
}
