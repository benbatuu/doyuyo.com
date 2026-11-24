"use client";
import { useEffect, useRef, useState } from "react";

/** Counts from 0 to `to` when visible. Server HTML already holds the final number (no-JS, crawlers). */
export function CountUp({ to, duration = 1400 }: { to: number; duration?: number }) {
  const [value, setValue] = useState(to);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !ref.current) return;
    setValue(0);
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [to, duration]);
  return <span ref={ref} className="tabular-nums">{value}</span>;
}
