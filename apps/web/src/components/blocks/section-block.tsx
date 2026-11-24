import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import type { BlockButton, BlockImage, ContentSection, SectionBlock, SectionStyle } from "@doyuyo/core";
import { DEFAULT_SECTION_STYLE } from "@doyuyo/core";
import { Icons, buttonClass } from "@doyuyo/ui";
import { ContentNodes } from "./content-nodes";
import { VideoCard } from "./video-card";

const BG: Record<SectionStyle["background"], string> = {
  white: "bg-white text-navy-900",
  cream: "bg-cream-50 text-navy-900",
  navy: "bg-navy-900 text-white",
  red: "bg-red-600 text-white",
};
const PAD: Record<SectionStyle["padding"], string> = { sm: "py-10 md:py-14", md: "py-16 md:py-24", lg: "py-24 md:py-36" };
const dark = (s: SectionStyle) => s.background === "navy" || s.background === "red";

/** One designed section from the page builder. */
export function SectionBlockView({ section }: { section: ContentSection }) {
  const style = section.style ?? DEFAULT_SECTION_STYLE;
  const b = section.block;
  if (!b) return null;
  return (
    <section className={clsx(BG[style.background], PAD[style.padding])}>
      <div className="container-x">
        <Block block={b} dark={dark(style)} />
      </div>
    </section>
  );
}

function Block({ block: b, dark }: { block: SectionBlock; dark: boolean }) {
  switch (b.type) {
    case "hero":
      return (
        <div className={clsx("mx-auto max-w-4xl", b.align === "center" ? "text-center" : "text-left")}>
          {b.eyebrow && <p className="eyebrow mb-4 text-red-500">{b.eyebrow}</p>}
          <h1 className="display text-5xl md:text-7xl">{b.title}</h1>
          {b.text && <p className="mt-6 text-lg opacity-80 md:text-xl">{b.text}</p>}
          {b.buttons.length > 0 && <Buttons buttons={b.buttons} dark={dark} center={b.align === "center"} className="mt-8" />}
          {b.image && <Fig image={b.image} className="mt-12 aspect-[16/9] w-full" />}
        </div>
      );

    case "mediaText":
      return (
        <div className={clsx("grid items-center gap-10 md:grid-cols-2 md:gap-16", b.imageSide === "left" && "md:[&>*:first-child]:order-2")}>
          {b.image ? <Fig image={b.image} className="aspect-[4/3] w-full" /> : <div />}
          <div>
            {b.eyebrow && <p className="eyebrow mb-3 text-red-500">{b.eyebrow}</p>}
            <h2 className="display text-4xl md:text-5xl">{b.title}</h2>
            <div className="prose-doyuyo mt-5 space-y-4 text-lg opacity-85" dangerouslySetInnerHTML={{ __html: b.html }} />
            {b.buttons.length > 0 && <Buttons buttons={b.buttons} dark={dark} className="mt-8" />}
          </div>
        </div>
      );

    case "richText":
      return (
        <div className={clsx("mx-auto", b.width === "narrow" ? "max-w-2xl" : "max-w-4xl")}>
          <ContentNodes nodes={b.nodes} tone={dark ? "dark" : "light"} className="text-lg" />
        </div>
      );

    case "cards":
      return (
        <div>
          <Head eyebrow={b.eyebrow} title={b.title} intro={b.intro} dark={dark} />
          <ul className={clsx("mt-12 grid gap-5", b.columns === 2 ? "sm:grid-cols-2" : b.columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4")}>
            {b.items.map((it, i) => {
              const inner = (
                <>
                  {it.image ? <Fig image={it.image} className="aspect-[4/3] w-full" /> : <div className="aspect-[4/3] w-full rounded-3xl bg-cream-100" />}
                  <h3 className="display mt-5 text-2xl">{it.title}</h3>
                  {it.text && <p className="mt-2 opacity-75">{it.text}</p>}
                </>
              );
              return (
                <li key={i} className={clsx("rounded-3xl p-4", dark ? "bg-white/5" : "bg-white shadow-[0_12px_32px_-16px_rgb(1_36_60/0.25)]")}>
                  {it.href ? (
                    <Link href={it.href} className="block transition-transform duration-300 hover:-translate-y-1">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      );

    case "gallery":
      return (
        <div>
          {b.title && <h2 className="display mb-10 text-4xl md:text-5xl">{b.title}</h2>}
          <div className={clsx("grid gap-3", b.columns === 2 ? "grid-cols-2" : b.columns === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-4")}>
            {b.images.map((img, i) => (
              <Fig key={i} image={img} className="aspect-square w-full" />
            ))}
          </div>
        </div>
      );

    case "stats":
      return (
        <div>
          {b.title && <h2 className="display mb-10 text-4xl md:text-5xl">{b.title}</h2>}
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {b.items.map((s, i) => (
              <div key={i} className={clsx("rounded-3xl p-6", dark ? "bg-white/10" : "bg-navy-900 text-white")}>
                <dd className="display text-5xl text-amber-400 md:text-6xl">{s.value}</dd>
                <dt className="eyebrow mt-3 opacity-70">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      );

    case "cta":
      return (
        <div className="mx-auto max-w-3xl rounded-[2rem] bg-navy-900 px-8 py-14 text-center text-white md:px-16">
          <h2 className="display text-4xl md:text-5xl">{b.title}</h2>
          {b.text && <p className="mt-4 text-lg text-white/75">{b.text}</p>}
          {b.button && <Buttons buttons={[{ ...b.button, variant: "primary" }]} dark center className="mt-8" />}
        </div>
      );

    case "faq":
      return (
        <div className="mx-auto max-w-3xl">
          <h2 className="display mb-10 text-4xl md:text-5xl">{b.title}</h2>
          <div className="divide-y divide-current/15 border-y border-current/15">
            {b.items.map((f, i) => (
              <details key={i} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-extrabold">
                  {f.q}
                  <span className="text-red-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 opacity-80">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      );

    case "quote":
      return (
        <figure className="mx-auto max-w-3xl text-center">
          <blockquote className="display text-3xl leading-snug md:text-4xl">“{b.text}”</blockquote>
          <figcaption className="mt-6 flex items-center justify-center gap-4 text-sm opacity-75">
            {b.image && <Fig image={b.image} className="size-14 rounded-full" />}
            <span>
              <span className="block font-extrabold">{b.author}</span>
              {b.role && <span>{b.role}</span>}
            </span>
          </figcaption>
        </figure>
      );

    case "video":
      return (
        <div className="mx-auto max-w-4xl">
          {b.title && <h2 className="display mb-8 text-4xl">{b.title}</h2>}
          <VideoCard href={b.href} thumbnail={b.thumbnail} />
        </div>
      );

    case "spacer":
      return <div className={clsx("mx-auto", b.size === "sm" ? "h-6" : b.size === "md" ? "h-12" : "h-24", b.line && "border-t border-current/15")} />;
  }
}

function Head({ eyebrow, title, intro, dark }: { eyebrow: string; title: string; intro: string; dark: boolean }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow && <p className="eyebrow mb-3 text-red-500">{eyebrow}</p>}
      <h2 className="display text-4xl md:text-5xl">{title}</h2>
      {intro && <p className={clsx("mt-4 text-lg", dark ? "text-white/75" : "text-navy-900/75")}>{intro}</p>}
    </div>
  );
}

function Buttons({ buttons, dark, center, className }: { buttons: BlockButton[]; dark: boolean; center?: boolean; className?: string }) {
  return (
    <div className={clsx("flex flex-wrap gap-3", center && "justify-center", className)}>
      {buttons.map((btn, i) => {
        const variant = btn.variant === "secondary" ? (dark ? "light" : "dark") : "primary";
        const href = btn.href || "#";
        return (
          <Link key={i} href={href} className={buttonClass(variant, "lg")}>
            {btn.text} <Icons.ArrowRight />
          </Link>
        );
      })}
    </div>
  );
}

function Fig({ image, className }: { image: BlockImage; className?: string }) {
  if (!image.src) return <div className={clsx("rounded-3xl bg-cream-100", className)} />;
  return (
    <figure className={clsx("relative overflow-hidden rounded-3xl bg-cream-100", className)}>
      <Image src={image.src} alt={image.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" unoptimized={image.src.endsWith(".svg")} />
    </figure>
  );
}
