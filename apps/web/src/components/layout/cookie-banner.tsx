"use client";
import { useEffect, useState } from "react";
import { buttonClass } from "@doyuyo/ui";

const KEY = "doyuyo-consent";

/** Consent banner with an equal-weight decline (KVKK). Analytics only loads after "accept" (not wired yet). */
export function CookieBanner({ text, accept, decline }: { text: string; accept: string; decline: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(!localStorage.getItem(KEY));
    } catch {
      setShow(true);
    }
  }, []);
  const choose = (v: "accepted" | "declined") => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    setShow(false);
    window.dispatchEvent(new Event("doyuyo-consent"));
  };
  // "Cookie settings" in the footer asks the banner to come back.
  useEffect(() => {
    const again = () => setShow(true);
    window.addEventListener("doyuyo-consent-reset", again);
    return () => window.removeEventListener("doyuyo-consent-reset", again);
  }, []);
  if (!show || !text) return null;
  return (
    <div role="region" aria-label="Cookies" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl animate-rise rounded-3xl bg-navy-900 p-4 text-white shadow-[var(--shadow-pop)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <p className="text-sm text-white/85">{text}</p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => choose("declined")} className={buttonClass("outline", "sm", "text-white")}>
            {decline}
          </button>
          <button type="button" onClick={() => choose("accepted")} className={buttonClass("light", "sm")}>
            {accept}
          </button>
        </div>
      </div>
    </div>
  );
}
