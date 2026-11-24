import type { Locale } from "@doyuyo/i18n";

export type MediaKind = "image" | "video" | "document" | "other";

export const mediaKindOf = (mime: string): MediaKind =>
  mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime === "application/pdf" ? "document" : "other";

/** Where a file is used on the site. A file can be in several groups; none = unused. */
export const MEDIA_USAGES = ["product", "category", "branch", "page", "brand"] as const;
export type MediaUsage = (typeof MEDIA_USAGES)[number];

/** Per-locale texts a file carries (alt for screen readers/SEO, title, caption). */
export interface MediaTexts {
  alt: string;
  title: string;
  caption: string;
}

export interface MediaItem {
  id: number;
  path: string;
  mime: string;
  kind: MediaKind;
  width: number | null;
  height: number | null;
  bytes: number;
  originalName: string | null;
  createdAt: Date;
  updatedAt: Date;
  texts: Partial<Record<Locale, MediaTexts>>;
  /** Groups from real use on the site plus the folder picked at upload. */
  usage: MediaUsage[];
  folder: MediaUsage | null;
}

export interface MediaQuery {
  kind?: MediaKind;
  usage?: MediaUsage | "unused";
  q?: string;
  limit: number;
  offset: number;
}

export interface NewMedia {
  path: string;
  mime: string;
  width: number | null;
  height: number | null;
  bytes: number;
  sha256: string;
  originalName: string;
  folder: MediaUsage | null;
}

export const isMediaUsage = (v: unknown): v is MediaUsage => (MEDIA_USAGES as readonly unknown[]).includes(v);
