import type { ContentNode, ContentSection } from "@doyuyo/core";

/** Helpers to read migrated page sections by their old-site key. */
export const section = (sections: ContentSection[] | undefined, key: string) => sections?.find((s) => s.key === key)?.nodes ?? [];
export const sectionsWithout = (sections: ContentSection[], ...keys: string[]) => sections.filter((s) => !keys.includes(s.key ?? ""));

export const headings = (nodes: ContentNode[]) => nodes.filter((n): n is Extract<ContentNode, { type: "heading" }> => n.type === "heading");
export const paragraphs = (nodes: ContentNode[]) => nodes.filter((n): n is Extract<ContentNode, { type: "paragraph" }> => n.type === "paragraph");
export const images = (nodes: ContentNode[]) => nodes.filter((n): n is Extract<ContentNode, { type: "image" }> => n.type === "image");
export const buttons = (nodes: ContentNode[]) => nodes.filter((n): n is Extract<ContentNode, { type: "button" }> => n.type === "button");
export const stats = (nodes: ContentNode[]) => nodes.filter((n): n is Extract<ContentNode, { type: "stat" }> => n.type === "stat");
export const firstHeading = (nodes: ContentNode[]) => headings(nodes)[0]?.text ?? "";

/** Split a flat node list into blocks that each start at a heading. */
export function blocksByHeading(nodes: ContentNode[]) {
  const out: { title: string; nodes: ContentNode[] }[] = [];
  for (const n of nodes) {
    if (n.type === "heading") out.push({ title: n.text, nodes: [] });
    else if (out.length) out[out.length - 1]!.nodes.push(n);
    else out.push({ title: "", nodes: [n] });
  }
  return out;
}
