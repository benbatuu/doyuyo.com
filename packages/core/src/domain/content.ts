import type { Locale } from "@doyuyo/i18n";

export type { Locale };

export type Translations<T> = Partial<Record<Locale, T>>;

/** An image or file stored by the site. `src` is a site-relative or CDN URL, never the legacy site. */
export interface Media {
  id: number;
  src: string;
  width: number | null;
  height: number | null;
  alt: string;
  mime: string;
}

/** Ordered rich content, as authored in the panel (or migrated from the old site). */
export type ContentNode =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; html: string; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "image"; mediaId: number | null; src: string; alt: string }
  | { type: "button"; text: string; href: string }
  | { type: "stat"; value: string; label: string }
  | { type: "embed"; src: string }
  | { type: "video"; href: string; thumbnail: string | null }
  | { type: "table"; rows: string[][] };

export interface ContentSection {
  key: string | null;
  nodes: ContentNode[];
  /** Designed layout built in the panel. When set, it is rendered instead of `nodes`. */
  block?: SectionBlock;
  style?: SectionStyle;
}

// ---------- page builder blocks (one per section)

export interface BlockImage {
  mediaId: number | null;
  src: string;
  alt: string;
}
export interface BlockButton {
  text: string;
  href: string;
  variant: "primary" | "secondary";
}

export type SectionBlock =
  | { type: "hero"; eyebrow: string; title: string; text: string; image: BlockImage | null; buttons: BlockButton[]; align: "left" | "center" }
  | { type: "mediaText"; eyebrow: string; title: string; html: string; image: BlockImage | null; imageSide: "left" | "right"; buttons: BlockButton[] }
  | { type: "richText"; nodes: ContentNode[]; width: "narrow" | "wide" }
  | { type: "cards"; eyebrow: string; title: string; intro: string; columns: 2 | 3 | 4; items: { image: BlockImage | null; title: string; text: string; href: string }[] }
  | { type: "gallery"; title: string; columns: 2 | 3 | 4; images: BlockImage[] }
  | { type: "stats"; title: string; items: { value: string; label: string }[] }
  | { type: "cta"; title: string; text: string; button: BlockButton | null }
  | { type: "faq"; title: string; items: { q: string; a: string }[] }
  | { type: "quote"; text: string; author: string; role: string; image: BlockImage | null }
  | { type: "video"; title: string; href: string; thumbnail: string | null }
  | { type: "spacer"; size: "sm" | "md" | "lg"; line: boolean };

export type SectionBlockType = SectionBlock["type"];

export interface SectionStyle {
  background: "white" | "cream" | "navy" | "red";
  padding: "sm" | "md" | "lg";
}

export const DEFAULT_SECTION_STYLE: SectionStyle = { background: "white", padding: "md" };

/** Pages whose layout is hand-built in code; the panel edits their copy, not their design. */
export const FIXED_LAYOUT_PAGE_KEYS = ["home", "about", "investor", "contact", "careers", "flavors", "ingredients", "menu", "branches", "allergens"];
export const isBuilderPage = (p: { key: string; template: string }) =>
  p.template === "static" && !p.key.startsWith("legal-") && !FIXED_LAYOUT_PAGE_KEYS.includes(p.key);

export interface Seo {
  title: string;
  description: string;
  ogImage: string | null;
}

export type EntityType = "home" | "page" | "menu" | "category" | "product" | "branches" | "city" | "branch";

export interface EntityRef {
  type: EntityType;
  id: number;
}

/** Locale -> canonical path of the same entity. Only published translations appear. */
export type Alternates = Partial<Record<Locale, string>>;
