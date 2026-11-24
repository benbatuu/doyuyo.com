import Link from "next/link";
import type { ProductSummary } from "@doyuyo/core";
import { Icons } from "@doyuyo/ui";
import { MediaImage } from "../ui/media-image";

export function ProductCard({ product, index = 0 }: { product: ProductSummary; index?: number }) {
  return (
    <Link
      href={product.path}
      data-reveal
      style={{ ["--reveal-delay" as string]: `${(index % 4) * 70}ms` }}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]"
    >
      <div className="relative aspect-square overflow-hidden bg-white">
        <MediaImage media={product.image} fill sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw" className="object-contain p-2 transition duration-500 group-hover:scale-[1.06]" />
      </div>
      <div className="flex flex-1 flex-col gap-2 border-t border-line p-4 md:p-5">
        <h3 className="display text-xl md:text-2xl">{product.name}</h3>
        <p className="line-clamp-3 text-sm text-muted">{product.shortDescription}</p>
        <span className="mt-auto inline-flex size-10 items-center justify-center self-end rounded-full bg-cream-100 text-lg text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
          <Icons.ArrowRight />
        </span>
      </div>
    </Link>
  );
}
