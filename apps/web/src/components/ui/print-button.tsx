"use client";
import { buttonClass } from "@doyuyo/ui";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("outline", "sm", "w-full")}>
      {label}
    </button>
  );
}
