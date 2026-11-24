import type { Alternates } from "@doyuyo/core";
import { PUBLISHED_LOCALES, type Locale } from "@doyuyo/i18n";

/**
 * Language switcher targets. A missing translation never links to a 404:
 * it falls back to the given section index (e.g. the branch list) or the home page.
 */
export function switcherTargets(alternates: Alternates, fallback?: Alternates): Record<Locale, string> {
  return Object.fromEntries(PUBLISHED_LOCALES.map((l) => [l, alternates[l] ?? fallback?.[l] ?? `/${l}`])) as Record<Locale, string>;
}
