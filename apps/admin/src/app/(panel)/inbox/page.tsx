import { requireAccess } from "@/lib/access";
import Link from "next/link";
import { container } from "@doyuyo/infrastructure";
import { FORM_TYPES, SUBMISSION_STATUSES, isFormType, type SubmissionStatus } from "@doyuyo/core";
import { Briefcase, ChevronLeft, ChevronRight, Download, Inbox as InboxIcon, Mail, Monitor, Search, Smartphone, Tablet, TrendingUp, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DEVICE_LABEL, STATUS_LABEL, STATUS_TONE, TYPE_LABEL, VALUE_LABEL, fmtDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

const PAGE = 25;
const TYPE_ICON: Record<(typeof FORM_TYPES)[number], LucideIcon> = { investor: TrendingUp, contact: Mail, careers: Briefcase };
const DEVICE_ICON: Record<string, LucideIcon> = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };
const STATUS_DOT: Record<SubmissionStatus, string> = { new: "bg-primary", in_progress: "bg-amber-400", done: "bg-ok", spam: "bg-muted-foreground/40" };

export default async function Inbox({ searchParams }: PageProps<"/inbox">) {
  await requireAccess("forms");
  const sp = await searchParams;
  const type = typeof sp.type === "string" && isFormType(sp.type) ? sp.type : undefined;
  const status = typeof sp.status === "string" && (SUBMISSION_STATUSES as readonly string[]).includes(sp.status) ? (sp.status as SubmissionStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const c = container();
  const [{ items, total }, counts] = await Promise.all([
    c.listSubmissions.execute({ type, status, q: q || undefined, limit: PAGE, offset: (page - 1) * PAGE }),
    c.listSubmissions.counts(),
  ]);
  const sum = (f: (x: (typeof counts)[number]) => boolean) => counts.filter(f).reduce((s, x) => s + x.count, 0);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ type, status, q: q || undefined, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/inbox${p.size ? `?${p}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const from = total ? (page - 1) * PAGE + 1 : 0;
  const to = Math.min(page * PAGE, total);
  const filtered = !!(type || status || q);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Başvurular</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">{type ? `${TYPE_LABEL[type]} formları` : "Formlar"}</h1>
          <p className="mt-1 text-muted-foreground">
            {total} kayıt{filtered && " bulundu"} · <span className="font-semibold text-foreground">{sum((x) => x.status === "new")}</span> yeni
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="bg-card">
          <a href={`/inbox/export${type ? `?type=${type}` : ""}`}>
            <Download /> CSV indir
          </a>
        </Button>
      </header>

      {/* Type tabs */}
      <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Form tipi">
        {[undefined, ...FORM_TYPES].map((t) => {
          const active = t === type;
          const Icon = t ? TYPE_ICON[t] : InboxIcon;
          const n = t ? sum((x) => x.type === t) : sum(() => true);
          return (
            <Link
              key={t ?? "all"}
              href={qs({ type: t, page: undefined })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors",
                active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t ? TYPE_LABEL[t] : "Tümü"}
              <span className={cn("rounded-md px-1.5 text-xs tabular-nums", active ? "bg-primary/10 text-primary" : "bg-muted")}>{n}</span>
            </Link>
          );
        })}
      </nav>

      <section className="rounded-xl border bg-card shadow-xs">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {[undefined, ...SUBMISSION_STATUSES].map((s) => {
              const active = s === status;
              return (
                <Link
                  key={s ?? "any"}
                  href={qs({ status: s, page: undefined })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                    active ? "border-foreground/20 bg-muted text-foreground" : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {s && <span className={cn("size-1.5 rounded-full", STATUS_DOT[s])} />}
                  {s ? STATUS_LABEL[s] : "Her durum"}
                </Link>
              );
            })}
          </div>
          <form className="relative ml-auto w-full sm:w-72">
            {type && <input type="hidden" name="type" value={type} />}
            {status && <input type="hidden" name="status" value={status} />}
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder="İsim, e-posta, sayfa ara" className="h-9 pl-9" />
          </form>
          {filtered && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/inbox">
                <X /> Temizle
              </Link>
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="px-4 py-2.5 font-medium">Kişi</th>
                <th className="px-4 py-2.5 font-medium">Form</th>
                <th className="px-4 py-2.5 font-medium">Özet</th>
                <th className="px-4 py-2.5 font-medium">Sayfa</th>
                <th className="px-4 py-2.5 font-medium">Cihaz / konum</th>
                <th className="px-4 py-2.5 font-medium">Durum</th>
                <th className="px-4 py-2.5 text-right font-medium">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((s) => {
                const TIcon = TYPE_ICON[s.type];
                const DIcon = DEVICE_ICON[s.device?.type ?? ""] ?? Monitor;
                return (
                  <tr key={s.id} className="group relative transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/inbox/${s.id}`} className="font-medium after:absolute after:inset-0">
                        {s.data.name} {s.data.surname}
                      </Link>
                      <div className="text-xs text-muted-foreground">{[s.data.email, s.data.phone].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <TIcon className="size-3.5" /> {TYPE_LABEL[s.type]}
                      </span>
                    </td>
                    <td className="max-w-56 truncate px-4 py-3 text-muted-foreground">
                      {VALUE_LABEL[s.data.model ?? s.data.subject ?? ""] ?? s.data.subject ?? s.data.message ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.pagePath}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <DIcon className="size-3.5 text-muted-foreground" />
                        {DEVICE_LABEL[s.device?.type ?? ""] ?? s.device?.type ?? "—"}
                        {s.device?.os && <span className="text-muted-foreground">· {s.device.os}</span>}
                      </span>
                      <div className="text-muted-foreground">{[s.geo?.city, s.geo?.country].filter(Boolean).join(", ") || s.geo?.timezone || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">{fmtDate(s.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!items.length && (
            <div className="grid place-items-center gap-2 px-5 py-16 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <InboxIcon className="size-5" />
              </span>
              <p className="font-medium">{filtered ? "Sonuç bulunamadı" : "Henüz başvuru yok"}</p>
              <p className="text-sm text-muted-foreground">{filtered ? "Filtreleri değiştirip tekrar dene." : "Sitedeki formlardan gelenler burada listelenecek."}</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {from}–{to} / {total}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Sayfa {page} / {pages}
              </span>
              <PageLink href={page > 1 ? qs({ page: String(page - 1) }) : undefined} label="Önceki sayfa">
                <ChevronLeft />
              </PageLink>
              <PageLink href={page < pages ? qs({ page: String(page + 1) }) : undefined} label="Sonraki sayfa">
                <ChevronRight />
              </PageLink>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function PageLink({ href, label, children }: { href?: string; label: string; children: React.ReactNode }) {
  if (!href) {
    return (
      <Button variant="outline" size="icon" className="size-8" disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" size="icon" className="size-8">
      <Link href={href} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}
