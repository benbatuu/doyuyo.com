import type { ContentNode } from "@doyuyo/core";
import { Icons } from "@doyuyo/ui";

/** The old site's closing "cta" block (contact, careers, PardoFood catalog) as three cards. */
export function CtaCards({ nodes, exclude = [] }: { nodes: ContentNode[]; exclude?: string[] }) {
  // The old "cta" section is a flat list: heading, paragraph, button, repeated.
  const cards: { title: string; text: string; href: string; label: string }[] = [];
  for (const n of nodes) {
    if (n.type === "heading") cards.push({ title: n.text, text: "", href: "", label: "" });
    else if (n.type === "paragraph" && cards.length) cards[cards.length - 1]!.text = n.text;
    else if (n.type === "button" && cards.length) Object.assign(cards[cards.length - 1]!, { href: n.href, label: n.text });
  }
  const shown = cards.filter((c) => !exclude.some((e) => c.href.startsWith(e)));
  const tones = ["bg-red-600 text-white", "bg-sky-200 text-navy-900", "bg-cream-100 text-navy-900"];
  return (
    <section className="container-x grid gap-4 pb-20 md:grid-cols-3 md:pb-28">
      {shown.map((c, i) => (
        <a
          key={i}
          href={c.href}
          data-reveal
          style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
          {...(c.href.endsWith(".pdf") ? { target: "_blank", rel: "noopener" } : {})}
          className={`group flex min-h-64 flex-col justify-between rounded-[var(--radius-card)] p-7 transition duration-300 hover:-translate-y-1 ${tones[i % 3]}`}
        >
          <div>
            <h2 className="display text-3xl md:text-4xl">{c.title}</h2>
            <p className="mt-3 opacity-80">{c.text}</p>
          </div>
          <span className="mt-6 inline-flex size-12 items-center justify-center rounded-full bg-current/10 text-xl transition group-hover:translate-x-1">
            {c.href.endsWith(".pdf") ? <Icons.Download /> : <Icons.ArrowRight />}
          </span>
        </a>
      ))}
    </section>
  );
}
