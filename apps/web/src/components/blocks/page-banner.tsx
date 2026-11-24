import Link from "next/link";
import type { Media } from "@doyuyo/core";
import { MediaImage } from "../ui/media-image";

export interface Crumb {
  label: string;
  href?: string;
}

/** Inner page hero: big title over the brand banner image, with breadcrumbs. */
export function PageBanner({ title, eyebrow, image, crumbs, children }: { title: string; eyebrow?: string; image?: Media | null; crumbs: Crumb[]; children?: React.ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-red-600 pb-14 pt-28 text-white md:pb-20 md:pt-40">
      {image && <MediaImage media={image} fill sizes="100vw" priority className="-z-10 object-cover opacity-90" alt="" />}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/35 via-transparent to-transparent" aria-hidden="true" />
      <div className="container-x">
        <nav aria-label="Breadcrumb" className="mb-5 text-sm font-bold text-white/80">
          <ol className="flex flex-wrap items-center gap-2">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true">/</span>}
                {c.href ? (
                  <Link href={c.href} className="hover:text-white">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-white">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        {eyebrow && <p className="eyebrow mb-3 text-amber-300">{eyebrow}</p>}
        <h1 className="display max-w-5xl animate-rise text-[clamp(2.75rem,8vw,6.5rem)]">{title}</h1>
        {children}
      </div>
    </section>
  );
}
