"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, EyeOff, FileCode2, Search } from "lucide-react";
import { SEO_DESC_RANGE, SEO_PAGE_SIZE, SEO_TITLE_RANGE, seoEffectiveTitle, seoIssues, type SeoKind, type SeoPage, type SeoRow } from "@doyuyo/core";
import type { Locale } from "@doyuyo/i18n";
import { Input } from "@/components/ui/input";
import { SITE_URL } from "@/lib/media";
import { cn } from "@/lib/utils";
import { SeoSheet } from "./seo-sheet";

export type SeoFilters = { locale: Locale; kind?: SeoKind; issues: boolean; q: string; page: number };

export const KIND_LABEL: Record<SeoKind, string> = { page: "Sayfa", category: "Kategori", product: "Ürün", city: "Şehir", branch: "Şube" };
const KINDS = Object.keys(KIND_LABEL) as SeoKind[];
const FILES = [
  { href: "/robots.txt", label: "robots.txt", hint: "Tarayıcı izinleri" },
  { href: "/sitemap.xml", label: "sitemap.xml", hint: "Site haritası" },
  { href: "/llms.txt", label: "llms.txt", hint: "Yapay zekâ özeti" },
];

export const rowKey = (r: Pick<SeoRow, "kind" | "id" | "locale">) => `${r.kind}:${r.id}:${r.locale}`;

/** URL for a filter set. Changing a filter goes back to page 1. */
function hrefFor(f: SeoFilters, patch: Partial<SeoFilters> = {}) {
  const m = { ...f, ...patch };
  const sp = new URLSearchParams();
  if (m.locale === "en") sp.set("lang", "en");
  if (m.kind) sp.set("kind", m.kind);
  if (m.issues) sp.set("issues", "1");
  if (m.q) sp.set("q", m.q);
  if (m.page > 1) sp.set("page", String(m.page));
  const s = sp.toString();
  return `/seo${s ? `?${s}` : ""}`;
}

export function SeoView({ data, filters: f }: { data: SeoPage; filters: SeoFilters }) {
  const [open, setOpen] = useState<string | null>(null);
  const { items, total, stats } = data;
  const pages = Math.max(1, Math.ceil(total / SEO_PAGE_SIZE));
  const from = total ? (f.page - 1) * SEO_PAGE_SIZE + 1 : 0;
  const to = Math.min(total, f.page * SEO_PAGE_SIZE);
  const current = items.find((r) => rowKey(r) === open) ?? null;
  const reset = (patch: Partial<SeoFilters>) => hrefFor(f, { page: 1, ...patch });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Yayındaki sayfa" value={stats.live} hint={`${stats.total - stats.live} gizli · ${f.locale === "tr" ? "Türkçe" : "İngilizce"}`} />
        <Stat label="Başlık eksik / ölçü dışı" value={stats.titleBad} tone={stats.titleBad ? "warn" : "ok"} hint={`${SEO_TITLE_RANGE.min}–${SEO_TITLE_RANGE.max} karakter`} />
        <Stat label="Açıklama eksik / ölçü dışı" value={stats.descBad} tone={stats.descBad ? "warn" : "ok"} hint={`${SEO_DESC_RANGE.min}–${SEO_DESC_RANGE.max} karakter`} />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <div className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip href={reset({ kind: undefined, issues: false })} active={!f.kind && !f.issues} count={stats.total}>Tümü</Chip>
          <Chip href={reset({ issues: true, kind: undefined })} active={f.issues} tone="warn" count={stats.issues}>Düzeltilecek</Chip>
          {KINDS.map((k) => (
            <Chip key={k} href={reset({ kind: k, issues: false })} active={f.kind === k} count={stats.kinds[k]}>
              {KIND_LABEL[k]}
            </Chip>
          ))}
        </div>
        <div className="flex shrink-0 gap-2">
          <div className="flex rounded-lg border bg-card p-0.5 text-xs font-medium">
            {(["tr", "en"] as const).map((l) => (
              <Link key={l} href={reset({ locale: l })} aria-current={f.locale === l ? "true" : undefined} className={cn("rounded-md px-2.5 py-1 uppercase", f.locale === l ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {l}
              </Link>
            ))}
          </div>
          <form action="/seo" className="relative w-full sm:w-64">
            {f.locale === "en" && <input type="hidden" name="lang" value="en" />}
            {f.kind && <input type="hidden" name="kind" value={f.kind} />}
            {f.issues && <input type="hidden" name="issues" value="1" />}
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input key={f.q} name="q" defaultValue={f.q} placeholder="Sayfa veya adres ara" className="h-9 bg-card pl-9" />
          </form>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2.5 font-medium">Sayfa</th>
              <th className="px-3 py-2.5 font-medium">Tür</th>
              <th className="px-3 py-2.5 font-medium">Google başlığı</th>
              <th className="w-28 px-3 py-2.5 font-medium">Başlık</th>
              <th className="w-28 px-3 py-2.5 font-medium">Açıklama</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((r) => {
              const issues = seoIssues(r);
              return (
                <tr key={rowKey(r)} className={cn("cursor-pointer hover:bg-muted/40", r.hidden && "opacity-60")} onClick={() => setOpen(rowKey(r))}>
                  <td className="max-w-72 px-4 py-2.5">
                    <span className="flex min-w-0 items-center gap-2">
                      {r.hidden ? <EyeOff className="size-3.5 shrink-0 text-muted-foreground" aria-label="Sitede gizli" /> : issues.length ? <AlertTriangle className="size-3.5 shrink-0 text-amber-500" aria-label="Düzeltilecek" /> : <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-label="Tamam" />}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{r.name}</span>
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">{r.path}</span>
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{KIND_LABEL[r.kind]}</td>
                  <td className="max-w-80 px-3 py-2.5">
                    <span className={cn("block truncate", !r.seoTitle.trim() && "text-muted-foreground italic")}>{seoEffectiveTitle(r.name, r.seoTitle)}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Len n={r.seoTitle.trim().length} range={SEO_TITLE_RANGE} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Len n={r.seoDescription.trim().length} range={SEO_DESC_RANGE} emptyLabel="Otomatik" />
                  </td>
                </tr>
              );
            })}
            {!items.length && (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center text-muted-foreground">
                  Bu filtrede sayfa yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <nav aria-label="Sayfalama" className="flex items-center justify-between gap-3 text-sm">
        <span className="tabular-nums text-muted-foreground">
          {from}–{to} / {total}
        </span>
        <div className="flex items-center gap-2">
          <PagerLink disabled={f.page <= 1} href={hrefFor(f, { page: f.page - 1 })}>Önceki</PagerLink>
          <span className="tabular-nums text-muted-foreground">
            {f.page} / {pages}
          </span>
          <PagerLink disabled={f.page >= pages} href={hrefFor(f, { page: f.page + 1 })}>Sonraki</PagerLink>
        </div>
      </nav>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Teknik dosyalar</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {FILES.map((x) => (
            <a key={x.href} href={`${SITE_URL}${x.href}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:bg-muted/40">
              <FileCode2 className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block font-mono text-sm font-medium">{x.label}</span>
                <span className="block text-xs text-muted-foreground">{x.hint}</span>
              </span>
            </a>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Bu dosyalar siteden otomatik üretilir; yeni ürün veya şube eklenince kendiliğinden güncellenir.</p>
      </section>

      <SeoSheet row={current} onClose={() => setOpen(null)} />
    </div>
  );
}

/** Length with a coloured dot: green inside the range, amber outside, grey when empty. */
export function Len({ n, range, emptyLabel = "Boş" }: { n: number; range: { min: number; max: number }; emptyLabel?: string }) {
  const ok = n >= range.min && n <= range.max;
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs tabular-nums", !n ? "text-muted-foreground" : ok ? "text-foreground" : "text-amber-700")}>
      <span className={cn("size-1.5 rounded-full", !n ? "bg-muted-foreground/40" : ok ? "bg-emerald-500" : "bg-amber-500")} />
      {n ? `${n} kr.` : emptyLabel}
    </span>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: "warn" | "ok" }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", tone === "warn" && "text-amber-600")}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Chip({ href, active, children, count, tone }: { href: string; active: boolean; children: React.ReactNode; count?: number; tone?: "warn" }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? (tone === "warn" ? "border-amber-300 bg-amber-50 text-amber-800" : "border-foreground/20 bg-muted text-foreground") : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {children}
      {count !== undefined && <span className="tabular-nums text-muted-foreground">{count}</span>}
    </Link>
  );
}

function PagerLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const cls = "rounded-md border bg-card px-3 py-1.5 text-xs font-medium";
  if (disabled) return <span className={cn(cls, "text-muted-foreground/50")}>{children}</span>;
  return (
    <Link href={href} className={cn(cls, "hover:bg-muted/60")}>
      {children}
    </Link>
  );
}
