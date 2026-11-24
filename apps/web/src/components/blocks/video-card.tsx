"use client";
import Image from "next/image";
import { useState } from "react";
import { Icons } from "@doyuyo/ui";

/** Click-to-load YouTube (no third-party request or cookie until the visitor asks for it). */
export function VideoCard({ href, thumbnail }: { href: string; thumbnail: string | null }) {
  const [play, setPlay] = useState(false);
  const id = href.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)?.[1];
  if (play && id)
    return (
      <iframe
        className="aspect-video w-full rounded-3xl"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
        title="YouTube"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  return (
    <button type="button" onClick={() => (id ? setPlay(true) : window.open(href, "_blank"))} className="group relative block aspect-video w-full overflow-hidden rounded-3xl bg-navy-900">
      {thumbnail && <Image src={thumbnail} alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />}
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-20 place-items-center rounded-full bg-red-600 text-3xl text-white shadow-[var(--shadow-pop)] transition group-hover:scale-110">
          <Icons.Play />
        </span>
      </span>
      <span className="sr-only">YouTube</span>
    </button>
  );
}
