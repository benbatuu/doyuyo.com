/** Infinite ticker band. Items are duplicated once so the loop is seamless. */
export function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <li key={i} className="flex items-center">
          <span className="display px-6 text-3xl md:text-5xl">{t}</span>
          <span className="text-amber-400 text-2xl md:text-4xl" aria-hidden="true">
            ✸
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`overflow-hidden py-5 md:py-7 ${className}`}>
      <div className="flex w-max animate-marquee motion-reduce:animate-none">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
