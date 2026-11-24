import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import type { ContentNode } from "@doyuyo/core";
import { Icons, buttonClass } from "@doyuyo/ui";
import { VideoCard } from "./video-card";

/**
 * Renders migrated/panel rich content in order. Paragraph HTML is limited to inline tags
 * (strong/em/a/br) by the importer and the panel's editor, so it is safe to inject.
 */
export function ContentNodes({ nodes, tone = "light", className }: { nodes: ContentNode[]; tone?: "light" | "dark"; className?: string }) {
  const groups = groupImages(nodes);
  return (
    <div className={clsx("prose-doyuyo space-y-5", tone === "dark" && "text-white/85 [&_strong]:!text-white", className)}>
      {groups.map((g, i) => {
        if (Array.isArray(g)) return <ImageGroup key={i} images={g} />;
        const n = g;
        switch (n.type) {
          case "heading": {
            const Tag = (`h${Math.min(Math.max(n.level, 2), 4)}`) as "h2" | "h3" | "h4";
            return (
              <Tag key={i} className={clsx("display !mt-10 first:!mt-0", n.level <= 2 ? "text-3xl md:text-4xl" : "text-2xl", tone === "dark" ? "text-white" : "text-navy-900")}>
                {n.text}
              </Tag>
            );
          }
          case "paragraph":
            return <p key={i} dangerouslySetInnerHTML={{ __html: n.html }} />;
          case "list":
            return (
              <ul key={i} className={clsx("space-y-2 pl-5", n.ordered ? "list-decimal" : "list-disc marker:text-red-500")}>
                {n.items.map((it, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: it }} />
                ))}
              </ul>
            );
          case "button":
            return (
              <p key={i}>
                <Link href={n.href} className={buttonClass(tone === "dark" ? "light" : "dark", "md", "h-auto! min-h-11 whitespace-normal! py-2.5! text-left max-w-full")}>
                  {n.text} <Icons.ArrowRight />
                </Link>
              </p>
            );
          case "stat":
            return (
              <p key={i} className="flex items-baseline gap-3">
                <span className="display text-5xl text-red-500">{n.value}</span>
                <span className="eyebrow">{n.label}</span>
              </p>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-2xl border border-line">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {n.rows.map((r, j) => (
                      <tr key={j} className="border-b border-line last:border-0">
                        {r.map((c, k) => (j === 0 ? <th key={k} className="bg-cream-50 px-4 py-2 font-extrabold">{c}</th> : <td key={k} className="px-4 py-2">{c}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "embed":
            return n.src.includes("google.com/maps") ? (
              <iframe key={i} src={n.src} title="Map" loading="lazy" className="aspect-[16/10] w-full rounded-3xl border-0" referrerPolicy="no-referrer-when-downgrade" />
            ) : null;
          case "video":
            return <VideoCard key={i} href={n.href} thumbnail={n.thumbnail} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

type ImageNode = Extract<ContentNode, { type: "image" }>;
/** Consecutive images become one gallery row. */
function groupImages(nodes: ContentNode[]): (ContentNode | ImageNode[])[] {
  const out: (ContentNode | ImageNode[])[] = [];
  for (const n of nodes) {
    const last = out[out.length - 1];
    if (n.type === "image") Array.isArray(last) ? last.push(n) : out.push([n]);
    else out.push(n);
  }
  return out;
}

function ImageGroup({ images }: { images: ImageNode[] }) {
  return (
    <div className={clsx("not-prose grid gap-3", images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3")}>
      {images.map((img, i) => (
        <figure key={i} className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-cream-100">
          <Image src={img.src} alt={img.alt} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" unoptimized={img.src.endsWith(".svg")} />
        </figure>
      ))}
    </div>
  );
}
