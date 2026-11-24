"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { container } from "@doyuyo/infrastructure";
import type { BlockButton, BlockImage, ContentNode, ContentSection, SectionBlock, SectionStyle, SiteNav } from "@doyuyo/core";
import { isPublishedLocale } from "@doyuyo/i18n";
import { currentUser } from "@/lib/session";
import { cleanInlineHtml, htmlToText } from "@/lib/sanitize";
import { cleanBlock, cleanStyle } from "@/lib/block-clean";

async function guard(id: number) {
  if (!(await currentUser())) redirect("/login");
  if (!Number.isInteger(id) || id <= 0) throw new Error("Geçersiz sayfa");
}

const str = (v: unknown, max = 2000) => String(v ?? "").slice(0, max);
const safeHref = (v: unknown) => {
  const s = str(v, 500).trim();
  return /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(s) ? s : "";
};

/** Re-validate every node coming from the browser; unknown shapes are dropped. */
function cleanNode(n: ContentNode): ContentNode | null {
  switch (n.type) {
    case "heading":
      return { type: "heading", level: [2, 3, 4].includes(Number(n.level)) ? Number(n.level) : 2, text: str(n.text, 300) };
    case "paragraph": {
      const html = cleanInlineHtml(str(n.html, 10000));
      return { type: "paragraph", html, text: htmlToText(html) };
    }
    case "list":
      return { type: "list", ordered: !!n.ordered, items: (Array.isArray(n.items) ? n.items : []).map((i) => cleanInlineHtml(str(i, 2000))).filter(Boolean).slice(0, 100) };
    case "image":
      return { type: "image", mediaId: Number.isInteger(n.mediaId) ? n.mediaId : null, src: safeHref(n.src), alt: str(n.alt, 300) };
    case "button":
      return { type: "button", text: str(n.text, 120), href: safeHref(n.href) };
    case "stat":
      return { type: "stat", value: str(n.value, 40), label: str(n.label, 120) };
    case "embed":
      return { type: "embed", src: safeHref(n.src) };
    case "video":
      return { type: "video", href: safeHref(n.href), thumbnail: n.thumbnail ? safeHref(n.thumbnail) : null };
    case "table":
      return { type: "table", rows: (Array.isArray(n.rows) ? n.rows : []).map((r) => (Array.isArray(r) ? r.map((c) => str(c, 500)) : [])) };
    default:
      return null;
  }
}

export async function savePageTranslation(
  id: number,
  locale: string,
  input: { title: string; seoTitle: string; seoDescription: string; sections: ContentSection[] },
) {
  await guard(id);
  if (!isPublishedLocale(locale)) throw new Error("Geçersiz dil");
  const sections: ContentSection[] = (Array.isArray(input.sections) ? input.sections : []).map((s) =>
    s.block
      ? { key: s.key ? str(s.key, 80) : null, nodes: [], block: cleanBlock(s.block), style: cleanStyle(s.style) }
      : { key: s.key ? str(s.key, 80) : null, nodes: (Array.isArray(s.nodes) ? s.nodes : []).map(cleanNode).filter((n): n is ContentNode => !!n) },
  );
  await container().managePages.saveTranslation(id, locale, {
    title: str(input.title, 200),
    seoTitle: str(input.seoTitle, 200),
    seoDescription: str(input.seoDescription, 500),
    sections,
  });
  revalidatePath("/icerik", "layout");
  revalidatePath("/yasal");
}

export async function createPage(input: { locale: string; title: string; slug?: string }) {
  if (!(await currentUser())) redirect("/login");
  if (!isPublishedLocale(input.locale)) return { ok: false as const, error: "Geçersiz dil" };
  const r = await container().managePages.create({ locale: input.locale, title: str(input.title, 200), slug: str(input.slug, 80) });
  if (r.ok) revalidatePath("/icerik", "layout");
  return r;
}

export async function saveNav(locale: string, nav: SiteNav) {
  if (!(await currentUser())) redirect("/login");
  if (!isPublishedLocale(locale)) throw new Error("Geçersiz dil");
  await container().managePages.saveNav(locale, nav);
  revalidatePath("/icerik/menuler");
  return container().managePages.getNav(locale);
}

export async function setPagePublished(id: number, published: boolean) {
  await guard(id);
  await container().managePages.setPublished(id, !!published);
  revalidatePath("/icerik", "layout");
  revalidatePath("/yasal");
}

export async function deletePage(id: number) {
  if (!(await currentUser())) redirect("/login");
  if (!Number.isInteger(id) || id <= 0) return { ok: false as const, error: "Geçersiz sayfa" };
  const r = await container().managePages.delete(id);
  if (r.ok) {
    revalidatePath("/icerik", "layout");
    revalidatePath("/icerik/menuler");
  }
  return r;
}
