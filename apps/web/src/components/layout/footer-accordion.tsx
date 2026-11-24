"use client";
import { useId, useState, type ReactNode } from "react";
import { Icons } from "@doyuyo/ui";

export interface FooterGroup {
  id: string;
  title: string;
  children: ReactNode;
}

/**
 * Footer columns. Mobile: accordion, at most one panel open.
 * lg and up: every panel stays open and the button does nothing, so the desktop grid is unchanged.
 */
export function FooterAccordion({ groups }: { groups: FooterGroup[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const base = useId();
  return (
    <div className="lg:contents">
      {groups.map((g) => {
        const isOpen = open === g.id;
        const panelId = `${base}-${g.id}-panel`;
        return (
          <section key={g.id} className="border-b border-white/10 lg:border-0">
            <h2 className="lg:mb-4">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : g.id)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left lg:pointer-events-none lg:py-0"
              >
                <span className="eyebrow text-white/60">{g.title}</span>
                <Icons.ArrowRight className={`text-white/60 transition-transform duration-300 lg:hidden ${isOpen ? "rotate-90" : ""}`} />
              </button>
            </h2>
            <div
              id={panelId}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out-soft)] lg:grid-rows-[1fr]! lg:opacity-100! ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
              <div className="overflow-hidden">
                <div className="pb-5 lg:pb-0">{g.children}</div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
