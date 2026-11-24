import Link from "next/link";
import type { CategorySummary } from "@doyuyo/core";
import { MediaImage } from "../ui/media-image";

const TONES = ["bg-red-600 text-white", "bg-amber-400 text-navy-900", "bg-navy-900 text-white", "bg-sky-200 text-navy-900", "bg-cream-100 text-navy-900"];

export function CategoryCard({ category, index, itemsLabel }: { category: CategorySummary; index: number; itemsLabel: string }) {
  return (
    <Link
      href={category.path}
      data-reveal
      style={{ ["--reveal-delay" as string]: `${(index % 3) * 80}ms` }}
      className={`group relative flex min-h-72 flex-col overflow-hidden rounded-[var(--radius-card)] p-6 transition duration-300 hover:-translate-y-1 md:min-h-80 ${TONES[index % TONES.length]}`}
    >
      <span className="eyebrow opacity-70">{String(index + 1).padStart(2, "0")} · {itemsLabel}</span>
      <h3 className="display relative z-10 mt-2 max-w-[11ch] text-4xl md:text-5xl">{category.name}</h3>
      <div className="absolute -bottom-10 -right-10 aspect-square w-[64%] overflow-hidden rounded-full bg-white shadow-[var(--shadow-pop)] ring-8 ring-white/15 transition duration-500 ease-[var(--ease-spring)] group-hover:-rotate-6 group-hover:scale-105">
        <MediaImage media={category.image} fill sizes="(min-width: 1024px) 20vw, 45vw" className="scale-110 object-contain" />
      </div>
    </Link>
  );
}
