/**
 * Small allow-list HTML cleaner for inline rich text (paragraphs, list items).
 * The website renders these with dangerouslySetInnerHTML, so only safe inline tags survive:
 * strong/b, em/i, u, br and a[href] (http(s), mailto, tel or site-relative).
 */
const ALLOWED = new Set(["strong", "b", "em", "i", "u", "br", "a"]);

export function cleanInlineHtml(input: string): string {
  let html = String(input ?? "");
  // Drop whole dangerous elements with their content.
  html = html.replace(/<(script|style|iframe|object|embed|template|noscript)[\s\S]*?<\/\1\s*>/gi, "");
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  // contentEditable leftovers: block tags become line breaks.
  html = html.replace(/<\/(div|p)>\s*<(div|p)[^>]*>/gi, "<br>").replace(/<\/?(div|p)[^>]*>/gi, "");
  html = html.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (tag, rawName: string, attrs: string) => {
    const name = rawName.toLowerCase();
    if (!ALLOWED.has(name)) return "";
    const closing = tag.startsWith("</");
    if (closing) return name === "br" ? "" : `</${name}>`;
    if (name === "br") return "<br>";
    if (name === "a") {
      const href = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
      const url = (href?.[2] ?? href?.[3] ?? href?.[4] ?? "").trim();
      if (!/^(https?:\/\/|mailto:|tel:|\/(?!\/))/i.test(url)) return "<a>";
      const external = /^https?:\/\//i.test(url);
      return `<a href="${url.replace(/"/g, "&quot;")}"${external ? ' target="_blank" rel="noopener"' : ""}>`;
    }
    return `<${name}>`;
  });
  return html.replace(/(<br>\s*)+$/i, "").trim();
}

export const htmlToText = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
