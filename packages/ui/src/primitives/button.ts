import clsx from "clsx";

export type ButtonVariant = "primary" | "dark" | "light" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "group/btn inline-flex items-center justify-center gap-2 rounded-full font-extrabold tracking-tight transition-[transform,background-color,color,box-shadow] duration-200 ease-[var(--ease-out-soft)] active:scale-[0.97] disabled:opacity-50 whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-red-600 text-white hover:bg-red-700 shadow-[0_10px_24px_-10px_rgb(201_48_31/0.7)]",
  dark: "bg-navy-900 text-white hover:bg-navy-700",
  light: "bg-white text-navy-900 hover:bg-cream-100",
  outline: "border-2 border-current text-current hover:bg-navy-900 hover:text-white hover:border-navy-900",
  ghost: "text-current hover:bg-black/5",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-14 px-7 text-base",
};

/** Class list for anything that should look like a button (links included). */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string) {
  return clsx(base, variants[variant], sizes[size], extra);
}
