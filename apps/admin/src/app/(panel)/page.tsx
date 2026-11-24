import Link from "next/link";
import { container } from "@doyuyo/infrastructure";
import { FORM_TYPES, SUBMISSION_STATUSES } from "@doyuyo/core";
import { ArrowUpRight, Briefcase, CheckCircle2, Clock, Download, ExternalLink, FileText, Image as ImageIcon, Inbox, Mail, Search, Store, TrendingUp, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEVICE_LABEL, STATUS_LABEL, STATUS_TONE, TYPE_LABEL, fmtDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { SITE_URL as SITE } from "@/lib/media";

const TYPE_ICON: Record<(typeof FORM_TYPES)[number], LucideIcon> = { investor: TrendingUp, contact: Mail, careers: Briefcase };
const STATUS_BAR: Record<(typeof SUBMISSION_STATUSES)[number], string> = {
  new: "bg-primary",
  in_progress: "bg-amber-400",
  done: "bg-ok",
  spam: "bg-muted-foreground/30",
};

const SHORTCUTS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/icerik", label: "Sayfalar", icon: FileText },
  { href: "/urunler", label: "Menü ve ürünler", icon: UtensilsCrossed },
  { href: "/subeler", label: "Şubeler", icon: Store },
  { href: "/medya", label: "Medya", icon: ImageIcon },
  { href: "/seo", label: "SEO", icon: Search },
];

function greeting() {
  const h = Number(new Intl.DateTimeFormat("tr-TR", { hour: "numeric", hour12: false, timeZone: "Europe/Istanbul" }).format(new Date()));
  return h < 6 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
}

export default async function Dashboard() {
  const c = container();
  const [counts, latest] = await Promise.all([c.listSubmissions.counts(), c.listSubmissions.execute({ limit: 6, offset: 0 })]);
  const sum = (f: (x: (typeof counts)[number]) => boolean) => counts.filter(f).reduce((s, x) => s + x.count, 0);
  const total = sum(() => true);
  const byStatus = Object.fromEntries(SUBMISSION_STATUSES.map((s) => [s, sum((x) => x.status === s)])) as Record<(typeof SUBMISSION_STATUSES)[number], number>;
  const today = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Istanbul" }).format(new Date());

  const kpis = [
    { label: "Yeni", value: byStatus.new, hint: "Yanıt bekliyor", icon: Inbox, href: "/inbox?status=new", accent: true },
    { label: "İnceleniyor", value: byStatus.in_progress, hint: "Takipte", icon: Clock, href: "/inbox?status=in_progress" },
    { label: "Tamamlandı", value: byStatus.done, hint: total ? `%${Math.round((byStatus.done / total) * 100)} oran` : "—", icon: CheckCircle2, href: "/inbox?status=done" },
    { label: "Toplam", value: total, hint: `${byStatus.spam} spam`, icon: FileText, href: "/inbox" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm capitalize text-muted-foreground">{today}</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">{greeting()}</h1>
          <p className="mt-1 text-muted-foreground">
            {byStatus.new > 0 ? (
              <>
                <span className="font-semibold text-foreground">{byStatus.new} yeni başvuru</span> seni bekliyor.
              </>
            ) : (
              "Bekleyen yeni başvuru yok."
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="bg-card">
            <a href={SITE} target="_blank" rel="noopener">
              <ExternalLink /> Siteyi aç
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="bg-card">
            <a href="/inbox/export">
              <Download /> CSV indir
            </a>
          </Button>
          <Button asChild size="sm">
            <Link href="/inbox?status=new">
              <Inbox /> Yeni başvurular
            </Link>
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="group rounded-xl border bg-card p-5 shadow-xs transition hover:border-foreground/15 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{k.label}</span>
              <span className={cn("grid size-8 place-items-center rounded-lg", k.accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                <k.icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{k.value}</p>
            <p className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              {k.hint}
              <ArrowUpRight className="size-3.5 opacity-0 transition group-hover:opacity-100" />
            </p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Latest */}
        <section className="rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">Son başvurular</h2>
              <p className="text-xs text-muted-foreground">En yeni 6 form</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/inbox">
                Tümü <ArrowUpRight />
              </Link>
            </Button>
          </div>
          {latest.items.length === 0 ? (
            <div className="grid place-items-center gap-2 px-5 py-16 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <Inbox className="size-5" />
              </span>
              <p className="font-medium">Henüz başvuru yok</p>
              <p className="text-sm text-muted-foreground">Sitedeki formlardan gelenler burada listelenecek.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {latest.items.map((s) => {
                const Icon = TYPE_ICON[s.type];
                return (
                  <li key={s.id}>
                    <Link href={`/inbox/${s.id}`} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/50">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {s.data.name} {s.data.surname}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {TYPE_LABEL[s.type]} · {s.pagePath} · {DEVICE_LABEL[s.device?.type ?? ""] ?? s.device?.type ?? "—"}
                        </p>
                      </div>
                      <Badge className={cn("shrink-0", STATUS_TONE[s.status])}>{STATUS_LABEL[s.status]}</Badge>
                      <span className="hidden w-32 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">{fmtDate(s.createdAt)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          {/* By form type */}
          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <h2 className="font-semibold">Form tipleri</h2>
            <ul className="mt-4 space-y-4">
              {FORM_TYPES.map((t) => {
                const all = sum((x) => x.type === t);
                const fresh = sum((x) => x.type === t && x.status === "new");
                const Icon = TYPE_ICON[t];
                return (
                  <li key={t}>
                    <Link href={`/inbox?type=${t}`} className="group block">
                      <div className="flex items-center gap-2 text-sm">
                        <Icon className="size-4 text-muted-foreground" />
                        <span className="font-medium group-hover:underline">{TYPE_LABEL[t]}</span>
                        {fresh > 0 && <span className="rounded-md bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">{fresh} yeni</span>}
                        <span className="ml-auto tabular-nums text-muted-foreground">{all}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-navy-900" style={{ width: `${total ? (all / total) * 100 : 0}%` }} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Status distribution */}
          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <h2 className="font-semibold">Durum dağılımı</h2>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted">
              {total > 0 && SUBMISSION_STATUSES.map((s) => <div key={s} className={STATUS_BAR[s]} style={{ width: `${(byStatus[s] / total) * 100}%` }} />)}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {SUBMISSION_STATUSES.map((s) => (
                <li key={s}>
                  <Link href={`/inbox?status=${s}`} className="flex items-center gap-2 hover:underline">
                    <span className={cn("size-2 rounded-full", STATUS_BAR[s])} />
                    <span className="text-muted-foreground">{STATUS_LABEL[s]}</span>
                    <span className="ml-auto font-medium tabular-nums">{byStatus[s]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Shortcuts */}
          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <h2 className="font-semibold">Hızlı erişim</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {SHORTCUTS.map((s) => (
                <Link key={s.href} href={s.href} className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted">
                  <s.icon className="size-4 text-muted-foreground" />
                  {s.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
