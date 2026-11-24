import type { BlockButton, BlockImage, ContentNode, SectionBlock, SectionStyle } from "@doyuyo/core";
import { cleanInlineHtml } from "@/lib/sanitize";

/** Shared cleaner for builder blocks (used by server actions; kept out of "use server" files). */
const str = (v: unknown, max = 2000) => String(v ?? "").slice(0, max);
const SAFE = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;
const safeHref = (v: unknown) => {
  const h = str(v, 500).trim();
  return SAFE.test(h) ? h : "";
};
const cleanNode = (n: ContentNode): ContentNode | null => (n.type === "paragraph" ? { type: "paragraph", html: cleanInlineHtml(str(n.html, 6000)), text: "" } : n.type === "heading" ? { type: "heading", level: 2, text: str(n.text, 300) } : null);
const cleanNodes = (ns: ContentNode[] | undefined) => (Array.isArray(ns) ? ns : []).map(cleanNode).filter((n): n is ContentNode => !!n);

const cleanImage = (i: BlockImage | null | undefined): BlockImage | null =>
  i && (i.src || i.mediaId) ? { mediaId: Number.isInteger(i.mediaId) ? i.mediaId : null, src: safeHref(i.src), alt: str(i.alt, 300) } : null;
const cleanButtons = (bs: BlockButton[] | undefined) =>
  (Array.isArray(bs) ? bs : []).slice(0, 3).map((b) => ({ text: str(b.text, 120), href: safeHref(b.href), variant: b.variant === "secondary" ? ("secondary" as const) : ("primary" as const) })).filter((b) => b.text);
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);
const num = (v: unknown, min: number, max: number, fallback: number) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Math.round(Number(v)))) : fallback) as number;

/** Keep only known fields with safe values for one designed block. */
export function cleanBlock(b: SectionBlock): SectionBlock {
  const x = b as unknown as Record<string, unknown> & { type: string };
  switch (x.type) {
    case "hero":
      return { type: "hero", eyebrow: str(x.eyebrow, 80), title: str(x.title, 200), text: str(x.text, 600), image: cleanImage(x.image as BlockImage), buttons: cleanButtons(x.buttons as BlockButton[]), align: pick(x.align, ["left", "center"] as const, "left") };
    case "mediaText":
      return { type: "mediaText", eyebrow: str(x.eyebrow, 80), title: str(x.title, 200), html: cleanInlineHtml(str(x.html, 6000)), image: cleanImage(x.image as BlockImage), imageSide: pick(x.imageSide, ["left", "right"] as const, "right"), buttons: cleanButtons(x.buttons as BlockButton[]) };
    case "richText":
      return { type: "richText", nodes: cleanNodes(x.nodes as ContentNode[]), width: pick(x.width, ["narrow", "wide"] as const, "narrow") };
    case "cards":
      return {
        type: "cards", eyebrow: str(x.eyebrow, 80), title: str(x.title, 200), intro: str(x.intro, 400), columns: num(x.columns, 2, 4, 3) as 2 | 3 | 4,
        items: (Array.isArray(x.items) ? x.items : []).slice(0, 12).map((it: any) => ({ image: cleanImage(it?.image), title: str(it?.title, 120), text: str(it?.text, 300), href: safeHref(it?.href) })),
      };
    case "gallery":
      return { type: "gallery", title: str(x.title, 200), columns: num(x.columns, 2, 4, 3) as 2 | 3 | 4, images: (Array.isArray(x.images) ? x.images : []).map((i: any) => cleanImage(i)).filter((i): i is BlockImage => !!i).slice(0, 24) };
    case "stats":
      return { type: "stats", title: str(x.title, 200), items: (Array.isArray(x.items) ? x.items : []).slice(0, 8).map((it: any) => ({ value: str(it?.value, 20), label: str(it?.label, 120) })) };
    case "cta":
      return { type: "cta", title: str(x.title, 200), text: str(x.text, 400), button: cleanButtons(x.button ? [x.button as BlockButton] : [])[0] ?? null };
    case "faq":
      return { type: "faq", title: str(x.title, 200), items: (Array.isArray(x.items) ? x.items : []).slice(0, 20).map((it: any) => ({ q: str(it?.q, 200), a: str(it?.a, 1000) })).filter((i) => i.q) };
    case "quote":
      return { type: "quote", text: str(x.text, 500), author: str(x.author, 120), role: str(x.role, 120), image: cleanImage(x.image as BlockImage) };
    case "video":
      return { type: "video", title: str(x.title, 200), href: safeHref(x.href), thumbnail: null };
    case "spacer":
      return { type: "spacer", size: pick(x.size, ["sm", "md", "lg"] as const, "md"), line: !!x.line };
    default:
      throw new Error("Bilinmeyen bölüm türü");
  }
}

export const cleanStyle = (s: SectionStyle | undefined): SectionStyle => ({
  background: pick(s?.background, ["white", "cream", "navy", "red"] as const, "white"),
  padding: pick(s?.padding, ["sm", "md", "lg"] as const, "md"),
});


