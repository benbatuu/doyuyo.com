import Image from "next/image";
import type { OrderPlatform } from "@doyuyo/core";

/** Logos of the online order channels (Migros Yemek, Yemek Sepeti, Getir Yemek, Trendyol). */
export function OrderPlatforms({ items, compact }: { items: OrderPlatform[]; compact?: boolean }) {
  return (
    <ul className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
      {items.map((p) => (
        <li key={p.href}>
          <a
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center rounded-2xl bg-white px-4 shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)] ${compact ? "h-16" : "h-24"}`}
          >
            {p.logo ? (
              <Image src={p.logo.src} alt={p.name} width={160} height={48} className="h-9 w-auto max-w-[140px] object-contain md:h-10" unoptimized={p.logo.src.endsWith(".svg")} />
            ) : (
              <span className="font-extrabold">{p.name}</span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}
