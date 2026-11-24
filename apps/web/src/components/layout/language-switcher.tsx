import Link from "next/link";
import clsx from "clsx";
import type { Locale } from "@doyuyo/i18n";

const LABEL: Record<Locale, string> = { tr: "TR", en: "EN", ar: "AR" };

/** Links to the same page in the other language (or its section fallback). Plain links: crawlable, no JS. */
export function LanguageSwitcher({ current, targets, label }: { current: Locale; targets: Partial<Record<Locale, string>>; label: string }) {
  return (
    <nav aria-label={label} className="flex items-center rounded-full border border-current/20 p-0.5 text-xs font-extrabold">
      {(Object.keys(targets) as Locale[]).map((l) => (
        <Link
          key={l}
          href={targets[l]!}
          hrefLang={l}
          lang={l}
          aria-current={l === current ? "true" : undefined}
          className={clsx("rounded-full px-2.5 py-1.5 transition-colors", l === current ? "bg-current/15" : "opacity-70 hover:opacity-100")}
        >
          {LABEL[l]}
        </Link>
      ))}
    </nav>
  );
}
