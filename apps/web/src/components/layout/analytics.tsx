"use client";
import { useEffect } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const KEY = "doyuyo-consent";

/** Google Analytics 4, loaded only after the visitor accepts cookies (KVKK). Nothing is sent before that. */
export function Analytics() {
  useEffect(() => {
    if (!GA_ID) return;
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; __ga?: boolean };
    const load = () => {
      let accepted = false;
      try {
        accepted = localStorage.getItem(KEY) === "accepted";
      } catch {}
      if (!accepted || w.__ga) return;
      w.__ga = true;
      w.dataLayer = w.dataLayer ?? [];
      w.gtag = function (...a: unknown[]) {
        w.dataLayer!.push(a);
      };
      w.gtag("js", new Date());
      w.gtag("config", GA_ID, { anonymize_ip: true });
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      document.head.appendChild(s);
    };
    load();
    window.addEventListener("doyuyo-consent", load);
    return () => window.removeEventListener("doyuyo-consent", load);
  }, []);
  return null;
}

/** Footer link: lets the visitor change or withdraw the cookie choice. */
export function CookieSettings({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="font-bold underline underline-offset-4 hover:text-white"
      onClick={() => {
        try {
          localStorage.removeItem(KEY);
        } catch {}
        window.dispatchEvent(new Event("doyuyo-consent-reset"));
      }}
    >
      {label}
    </button>
  );
}
