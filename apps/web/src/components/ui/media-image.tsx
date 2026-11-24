import Image from "next/image";
import clsx from "clsx";
import type { Media } from "@doyuyo/core";

interface Props {
  media: Media | null | undefined;
  sizes: string;
  className?: string;
  /** Fill the parent box (parent must be positioned and sized). */
  fill?: boolean;
  priority?: boolean;
  alt?: string;
  quality?: number;
}

/** next/image for CMS media. Uses stored dimensions to avoid layout shift. */
export function MediaImage({ media, sizes, className, fill, priority, alt, quality = 80 }: Props) {
  if (!media) return null;
  const isVector = media.mime.includes("svg") || media.src.endsWith(".svg");
  const common = { src: media.src, alt: alt ?? media.alt, sizes, priority, quality, unoptimized: isVector };
  if (fill || !media.width || !media.height) return <Image {...common} fill className={clsx("object-cover", className)} />;
  return <Image {...common} width={media.width} height={media.height} className={className} />;
}
