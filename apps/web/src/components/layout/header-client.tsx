"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import type { NavLink, OrderPlatform } from "@doyuyo/core";
import { Icons, buttonClass } from "@doyuyo/ui";

/** Sticky header that turns solid once the page scrolls. */
export function HeaderShell({ overlay, children }: { overlay: boolean; children: ReactNode }) {
  const [solid, setSolid] = useState(!overlay);
  useEffect(() => {
    if (!overlay) return;
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [overlay]);
  return (
    <header
      data-solid={solid}
      className={clsx(
        "group/header",
        "inset-x-0 top-0 z-40 transition-[background-color,color,box-shadow] duration-300",
        overlay ? "fixed" : "sticky",
        solid ? "bg-paper text-navy-900 shadow-[0_1px_0_rgb(1_36_60/0.08)] md:bg-paper/90 md:backdrop-blur-md" : "bg-transparent text-white",
      )}
    >
      {children}
    </header>
  );
}

function PlatformList({ platforms }: { platforms: OrderPlatform[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {platforms.map((p) => (
        <li key={p.href}>
          <a
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-16 items-center justify-center rounded-2xl border border-line bg-white px-3 transition hover:-translate-y-0.5 hover:border-navy-900/30 hover:shadow-[var(--shadow-card)]"
          >
            {p.logo ? (
              <Image src={p.logo.src} alt={p.name} width={120} height={36} className="h-8 w-auto max-w-[110px] object-contain" unoptimized={p.logo.src.endsWith(".svg")} />
            ) : (
              <span className="font-bold">{p.name}</span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** "Sipariş Ver" popover listing the online order channels (same links as the old branch pages). */
export function OrderMenu({ label, closeLabel, platforms, className }: { label: string; closeLabel: string; platforms: OrderPlatform[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);
  if (!platforms.length) return null;
  return (
    <div className="relative" ref={ref}>
      <button type="button" className={className} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        {label}
      </button>
      {open && (
        <div role="dialog" aria-label={label} className="absolute right-0 top-full mt-3 w-[min(22rem,calc(100vw-2rem))] origin-top-right animate-rise rounded-3xl bg-paper p-4 text-navy-900 shadow-[var(--shadow-pop)]">
          <div className="mb-3 flex items-center justify-between">
            <p className="eyebrow text-red-600">{label}</p>
            <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-full hover:bg-black/5" aria-label={closeLabel}>
              <Icons.Close />
            </button>
          </div>
          <PlatformList platforms={platforms} />
        </div>
      )}
    </div>
  );
}

export function MobileNav({
  links,
  openLabel,
  closeLabel,
  orderLabel,
  platforms,
  phone,
}: {
  links: NavLink[];
  openLabel: string;
  closeLabel: string;
  orderLabel: string;
  platforms: OrderPlatform[];
  phone: { label: string; href: string } | null;
}) {
  // mounted: panel is in the DOM. shown: the animated "open" state. Two steps so the enter transition runs.
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const open = () => setMounted(true);
  const close = () => setShown(false);

  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShown(false);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [mounted]);

  useEffect(() => {
    if (mounted && !shown) {
      const t = setTimeout(() => setMounted(false), 350);
      return () => clearTimeout(t);
    }
  }, [mounted, shown]);

  return (
    <div className="lg:hidden">
      <button type="button" onClick={open} className="grid size-11 place-items-center rounded-full text-2xl hover:bg-current/10" aria-label={openLabel} aria-expanded={shown}>
        <Icons.Menu />
      </button>
      {mounted &&
        // Portal: the sticky header uses backdrop-filter, which would trap a fixed overlay inside it.
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className={clsx(
              "fixed inset-0 z-50 flex flex-col bg-navy-900 text-white transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
              shown ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0",
            )}
          >
            <div className="flex h-16 items-center justify-end px-4">
              <button type="button" onClick={close} className="grid size-11 place-items-center rounded-full text-2xl hover:bg-white/10" aria-label={closeLabel} autoFocus>
                <Icons.Close />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-6 pb-8">
              <ul className="space-y-1">
                {links.map((l, i) => (
                  <li
                    key={l.href}
                    className={clsx("transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none", shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}
                    style={{ transitionDelay: shown ? `${80 + 50 * i}ms` : "0ms" }}
                  >
                    <Link href={l.href} onClick={close} className="display block py-2 text-4xl hover:text-amber-400">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-10 rounded-3xl bg-paper p-4 text-navy-900">
                <p className="eyebrow mb-3 text-red-600">{orderLabel}</p>
                <PlatformList platforms={platforms} />
              </div>
              {phone && (
                <a href={phone.href} className={buttonClass("outline", "lg", "mt-6 w-full")}>
                  <Icons.Phone /> {phone.label}
                </a>
              )}
            </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}
