"use client";
import { useEffect, useState } from "react";
import { isOpenNow, type OpeningHours } from "@doyuyo/core";

/** Minutes since midnight in Istanbul time (all TR branches; Dubai rows have day-specific hours and stay "unknown"). */
export function istanbulMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** Computed on the client so cached pages never show a stale "open" badge. */
export function OpenStatus({ hours, openLabel, closedLabel }: { hours: OpeningHours[]; openLabel: string; closedLabel: string }) {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    const tick = () => setOpen(isOpenNow(hours, istanbulMinutes()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hours]);
  if (open === null) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${open ? "bg-ok/10 text-ok" : "bg-red-600/10 text-red-600"}`}>
      <span className={`size-2 rounded-full ${open ? "animate-pulse bg-ok" : "bg-red-600"}`} aria-hidden="true" />
      {open ? openLabel : closedLabel}
    </span>
  );
}
