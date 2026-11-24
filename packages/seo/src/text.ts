/** Collapse whitespace, strip tags. */
export const plain = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** Meta description length: cut at a sentence end if one fits, else at a word, never mid-word. */
export function truncate(text: string, max = 155): string {
  const t = plain(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentence > max * 0.55) return cut.slice(0, sentence + 1);
  const space = cut.lastIndexOf(" ");
  return cut.slice(0, space > 0 ? space : max).replace(/[,;:\-–]$/, "") + "…";
}

/** "Doyuyo! Alanya Cadde" -> "Alanya Cadde" */
export const shortBranchName = (name: string) => name.replace(/^Doyuyo!?\s*/i, "").trim() || name;
