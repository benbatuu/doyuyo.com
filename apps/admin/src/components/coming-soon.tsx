export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold">{title}</h1>
      <section className="relative overflow-hidden rounded-3xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-400 font-[family-name:var(--font-display)] text-2xl font-extrabold text-navy-900">
          !
        </span>
        <p className="mt-5 font-[family-name:var(--font-display)] text-2xl font-extrabold">Coming soon</p>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">{description ?? "Bu bölüm yakında hazır olacak."}</p>
      </section>
    </div>
  );
}
